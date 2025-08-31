import { query } from './database';
import bcrypt from 'bcryptjs';

export interface User {
  id?: number;
  username: string;
  email: string;
  password_hash?: string;
  first_name?: string;
  last_name?: string;
  is_active?: boolean;
  is_admin?: boolean;
  is_reviewer?: boolean;
  created_at?: Date;
  updated_at?: Date;
  last_login?: Date;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  is_admin?: boolean;
  is_reviewer?: boolean;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export class UserModel {
  static async create(userData: CreateUserRequest): Promise<User> {
    // Hash password
    const saltRounds = 12;
    const password_hash = await bcrypt.hash(userData.password, saltRounds);
    
    const sql = `
      INSERT INTO users (username, email, password_hash, first_name, last_name, is_admin, is_reviewer)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, username, email, first_name, last_name, is_active, is_admin, is_reviewer, created_at, updated_at
    `;
    
    const values = [
      userData.username,
      userData.email,
      password_hash,
      userData.first_name,
      userData.last_name,
      userData.is_admin || false,
      userData.is_reviewer || false
    ];
    
    const result = await query(sql, values);
    return result.rows[0];
  }

  static async findByUsername(username: string): Promise<User | null> {
    const sql = 'SELECT * FROM users WHERE username = $1 AND is_active = true';
    const result = await query(sql, [username]);
    return result.rows[0] || null;
  }

  static async findByEmail(email: string): Promise<User | null> {
    const sql = 'SELECT * FROM users WHERE email = $1 AND is_active = true';
    const result = await query(sql, [email]);
    return result.rows[0] || null;
  }

  static async findById(id: number): Promise<User | null> {
    const sql = 'SELECT id, username, email, first_name, last_name, is_active, is_admin, is_reviewer, created_at, updated_at, last_login FROM users WHERE id = $1 AND is_active = true';
    const result = await query(sql, [id]);
    return result.rows[0] || null;
  }

  static async validatePassword(user: User, password: string): Promise<boolean> {
    if (!user.password_hash) return false;
    return await bcrypt.compare(password, user.password_hash);
  }

  static async updateLastLogin(id: number): Promise<void> {
    const sql = 'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1';
    await query(sql, [id]);
  }

  static async updateUser(id: number, userData: Partial<User>): Promise<User | null> {
    const fields = Object.keys(userData).filter(key => 
      key !== 'id' && key !== 'password_hash' && key !== 'created_at'
    );
    
    if (fields.length === 0) {
      return this.findById(id);
    }

    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    
    const sql = `
      UPDATE users 
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND is_active = true
      RETURNING id, username, email, first_name, last_name, is_active, is_admin, is_reviewer, created_at, updated_at, last_login
    `;
    
    const values = [id, ...fields.map(field => userData[field as keyof User])];
    const result = await query(sql, values);
    return result.rows[0] || null;
  }

  static async changePassword(id: number, newPassword: string): Promise<boolean> {
    const saltRounds = 12;
    const password_hash = await bcrypt.hash(newPassword, saltRounds);
    
    const sql = 'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND is_active = true';
    const result = await query(sql, [password_hash, id]);
    return result.rowCount > 0;
  }

  static async deactivateUser(id: number): Promise<boolean> {
    const sql = 'UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1';
    const result = await query(sql, [id]);
    return result.rowCount > 0;
  }

  static async getCount(): Promise<number> {
    const sql = 'SELECT COUNT(*) as count FROM users WHERE is_active = true';
    const result = await query(sql);
    return parseInt(result.rows[0].count);
  }

  static async findAll(): Promise<User[]> {
    const sql = `
      SELECT id, username, email, first_name, last_name, is_active, is_admin, is_reviewer, created_at, updated_at, last_login 
      FROM users 
      WHERE is_active = true 
      ORDER BY created_at DESC
    `;
    const result = await query(sql);
    return result.rows;
  }

  static async deleteUser(id: number): Promise<boolean> {
    // Instead of actually deleting, we set is_active to false (soft delete)
    const sql = 'UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1';
    const result = await query(sql, [id]);
    return result.rowCount > 0;
  }

  static async authenticate(loginData: LoginRequest): Promise<User | null> {
    const user = await this.findByUsername(loginData.username);
    if (!user) return null;
    
    const isValidPassword = await this.validatePassword(user, loginData.password);
    if (!isValidPassword) return null;
    
    // Update last login
    await this.updateLastLogin(user.id!);
    
    // Return user without password hash
    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}