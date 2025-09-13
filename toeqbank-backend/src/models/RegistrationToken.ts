import { query } from './database';
import crypto from 'crypto';

export interface RegistrationToken {
  id?: number;
  token: string;
  role: string;
  used?: boolean;
  created_at?: Date;
  expires_at: Date;
  used_by?: number;
  used_at?: Date;
}

export class RegistrationTokenModel {
  static async create(role: string, expiresInHours: number = 72): Promise<RegistrationToken> {
    // Generate a secure random token
    const token = crypto.randomBytes(32).toString('hex');
    
    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresInHours);
    
    const sql = `
      INSERT INTO registration_tokens (token, role, expires_at)
      VALUES ($1, $2, $3)
      RETURNING id, token, role, created_at, expires_at
    `;
    
    const values = [token, role, expiresAt];
    const result = await query(sql, values);
    return result.rows[0];
  }

  static async findByToken(token: string): Promise<RegistrationToken | null> {
    const sql = `
      SELECT * FROM registration_tokens 
      WHERE token = $1 
        AND used = false 
        AND expires_at > NOW()
    `;
    const result = await query(sql, [token]);
    return result.rows[0] || null;
  }

  static async markAsUsed(tokenId: number, userId: number): Promise<void> {
    const sql = `
      UPDATE registration_tokens 
      SET used = true, 
          used_by = $2, 
          used_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;
    await query(sql, [tokenId, userId]);
  }

  static async getActiveTokens(): Promise<RegistrationToken[]> {
    const sql = `
      SELECT rt.*, u.username as used_by_username
      FROM registration_tokens rt
      LEFT JOIN users u ON rt.used_by = u.id
      WHERE rt.expires_at > NOW()
      ORDER BY rt.created_at DESC
    `;
    const result = await query(sql);
    return result.rows;
  }

  static async deleteExpired(): Promise<number> {
    const sql = `
      DELETE FROM registration_tokens 
      WHERE expires_at < NOW() 
        AND used = false
    `;
    const result = await query(sql);
    return result.rowCount;
  }
}