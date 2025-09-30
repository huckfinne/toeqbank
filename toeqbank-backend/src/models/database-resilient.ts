import { Pool, PoolClient } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

// Parse DATABASE_URL to handle SSL separately
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production' || !isDevelopment;

// Digital Ocean requires SSL in production
let poolConfig: any = {
  connectionString: process.env.DATABASE_URL?.replace('?sslmode=require', ''), 
  max: 20, // Maximum pool connections
  min: 0,  // Minimum pool connections
  idle: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Return error if no connection within 10 seconds
  idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
  query_timeout: 60000, // Query timeout 60 seconds
  statement_timeout: 60000, // Statement timeout 60 seconds
  allowExitOnIdle: true // Allow the pool to exit on idle
};

// Only apply SSL config in production or when DATABASE_URL contains Digital Ocean host
if (isProduction || process.env.DATABASE_URL?.includes('db.ondigitalocean.com')) {
  poolConfig.ssl = {
    rejectUnauthorized: false // Required for DO managed databases
  };
  console.log(`🔒 SSL Configuration: Using relaxed SSL verification for Digital Ocean database`);
} else {
  console.log(`🔓 SSL Configuration: SSL disabled for local development`);
}

class ResilientPool {
  private pool: Pool;
  private isHealthy: boolean = true;
  private retryCount: number = 0;
  private maxRetries: number = 3;
  private baseDelay: number = 1000; // Base delay for exponential backoff
  
  constructor() {
    this.pool = new Pool(poolConfig);
    this.setupErrorHandlers();
  }
  
  private setupErrorHandlers() {
    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle pool client', err);
      this.isHealthy = false;
      // Don't exit the process, just mark as unhealthy
    });
    
    this.pool.on('connect', () => {
      console.log('New database connection established');
      this.isHealthy = true;
      this.retryCount = 0; // Reset retry count on successful connection
    });
    
    this.pool.on('remove', () => {
      console.log('Database connection removed from pool');
    });
  }
  
  async connect(): Promise<PoolClient> {
    for (let i = 0; i <= this.maxRetries; i++) {
      try {
        const client = await Promise.race([
          this.pool.connect(),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Connection timeout')), poolConfig.connectionTimeoutMillis)
          )
        ]);
        
        // Test the connection
        await client.query('SELECT 1');
        this.isHealthy = true;
        this.retryCount = 0;
        return client;
      } catch (error) {
        console.error(`Connection attempt ${i + 1}/${this.maxRetries + 1} failed:`, (error as Error).message);
        
        if (i < this.maxRetries) {
          const delay = this.baseDelay * Math.pow(2, i); // Exponential backoff
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          this.isHealthy = false;
          throw error;
        }
      }
    }
    throw new Error('Failed to connect after all retries');
  }
  
  async query(text: string, params?: any[]): Promise<any> {
    let client: PoolClient | null = null;
    let lastError: any = null;
    
    // Try the query up to 3 times for transient failures
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        client = await this.connect();
        
        // Use a timeout for the query
        const result = await Promise.race([
          client.query(text, params),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Query timeout')), poolConfig.query_timeout)
          )
        ]);
        
        return result;
      } catch (error: any) {
        lastError = error;
        console.error(`Query attempt ${attempt}/3 failed:`, error.message);
        
        // Check if it's a transient error that we should retry
        const isTransient = error.message?.includes('timeout') || 
                          error.message?.includes('Connection terminated') ||
                          error.message?.includes('ETIMEDOUT') ||
                          error.message?.includes('ECONNRESET');
        
        if (!isTransient || attempt === 3) {
          throw error;
        }
        
        // Wait before retrying with exponential backoff
        const delay = 1000 * attempt;
        console.log(`Retrying query in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } finally {
        if (client) {
          try {
            client.release();
          } catch (releaseError) {
            console.error('Error releasing client:', releaseError);
          }
        }
      }
    }
    
    throw lastError || new Error('Query failed after all retries');
  }
  
  async end() {
    await this.pool.end();
  }
  
  getStatus() {
    return {
      isHealthy: this.isHealthy,
      totalConnections: this.pool.totalCount,
      idleConnections: this.pool.idleCount,
      waitingConnections: this.pool.waitingCount,
      retryCount: this.retryCount
    };
  }
}

const resilientPool = new ResilientPool();

export const initializeDatabase = async (): Promise<void> => {
  let client: PoolClient | null = null;
  try {
    client = await resilientPool.connect();
    
    // SAFETY CHECK: Only run schema in development with explicit flag
    if (process.env.ALLOW_SCHEMA_INIT === 'true') {
      console.warn('⚠️  WARNING: Running schema initialization - this should only be done on first setup!');
      
      // Read and execute schema
      const schemaPath = path.join(__dirname, 'schema.sql');
      const schema = fs.readFileSync(schemaPath, 'utf8');
      
      await client.query(schema);
      console.log('Database schema initialized successfully');
    } else {
      console.log('Skipping schema initialization (set ALLOW_SCHEMA_INIT=true to enable)');
    }
    
    // Create migrations tracking table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS applied_migrations (
        name VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Run migrations (only ones not already applied)
    const migrationsDir = path.join(__dirname, '../migrations');
    if (fs.existsSync(migrationsDir)) {
      const migrationFiles = fs.readdirSync(migrationsDir).filter(file => file.endsWith('.sql')).sort();
      
      for (const file of migrationFiles) {
        // Check if migration was already applied
        const checkResult = await client.query('SELECT 1 FROM applied_migrations WHERE name = $1', [file]);
        
        if (checkResult.rows.length === 0) {
          console.log(`Running migration: ${file}`);
          const migrationPath = path.join(migrationsDir, file);
          const migration = fs.readFileSync(migrationPath, 'utf8');
          
          try {
            await client.query(migration);
            await client.query('INSERT INTO applied_migrations (name) VALUES ($1)', [file]);
            console.log(`Migration ${file} completed successfully`);
          } catch (migrationError) {
            console.error(`Migration ${file} failed:`, migrationError);
            // Continue with other migrations
          }
        } else {
          console.log(`Skipping migration ${file} (already applied)`);
        }
      }
    }
    
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  } finally {
    if (client) {
      client.release();
    }
  }
};

export const query = async (text: string, params?: any[]): Promise<any> => {
  return resilientPool.query(text, params);
};

export const getPoolStatus = () => {
  return resilientPool.getStatus();
};

export default resilientPool;