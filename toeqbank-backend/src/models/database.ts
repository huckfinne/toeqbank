import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

// Parse and modify DATABASE_URL to disable SSL for dev database
const getDatabaseConfig = () => {
  const connectionString = process.env.DATABASE_URL;
  
  if (process.env.NODE_ENV === 'production' && connectionString) {
    // For development database, disable SSL entirely
    if (!connectionString.includes('sslmode')) {
      return connectionString + '?sslmode=disable';
    }
    return connectionString;
  }
  
  return connectionString;
};

const pool = new Pool({
  connectionString: getDatabaseConfig(),
  ssl: false  // Completely disable SSL for dev database
});

export const initializeDatabase = async (): Promise<void> => {
  try {
    const client = await pool.connect();
    
    // Read and execute schema
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    await client.query(schema);
    console.log('Database schema initialized successfully');
    
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