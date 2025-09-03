import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

// Parse DATABASE_URL to handle SSL separately
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production' || !isDevelopment;

// Digital Ocean requires SSL in production
let poolConfig: any = {
  connectionString: process.env.DATABASE_URL?.replace('?sslmode=require', '') // Remove query param to avoid conflicts
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

const pool = new Pool(poolConfig);

export const initializeDatabase = async (): Promise<void> => {
  try {
    const client = await pool.connect();
    
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
    
    client.release();
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

export const query = async (text: string, params?: any[]): Promise<any> => {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
};

export default pool;