import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

// Nuclear option: Set NODE_TLS_REJECT_UNAUTHORIZED=0 in environment
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

// Handle Digital Ocean managed database SSL properly
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
  // No SSL config - let it use defaults with rejection disabled globally
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