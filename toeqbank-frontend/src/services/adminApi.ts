import axios from 'axios';
import { API_BASE_URL } from '../config/api.config';

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  is_admin: boolean;
  is_reviewer: boolean;
  created_at: string;
  last_login?: string;
}

export interface CreateUserData {
  username: string;
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  is_admin?: boolean;
  is_reviewer?: boolean;
}

export interface UpdateUserData {
  username?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  is_admin?: boolean;
  is_reviewer?: boolean;
}

export const adminService = {
  // Get all users
  getUsers: async (): Promise<AdminUser[]> => {
    const response = await axios.get(`${API_BASE_URL}/auth/admin/users`);
    return response.data.users;
  },

  // Create new user
  createUser: async (userData: CreateUserData): Promise<AdminUser> => {
    const response = await axios.post(`${API_BASE_URL}/auth/admin/users`, userData);
    return response.data.user;
  },

  // Update user
  updateUser: async (userId: number, userData: UpdateUserData): Promise<AdminUser> => {
    const response = await axios.put(`${API_BASE_URL}/auth/admin/users/${userId}`, userData);
    return response.data.user;
  },

  // Delete user
  deleteUser: async (userId: number): Promise<void> => {
    await axios.delete(`${API_BASE_URL}/auth/admin/users/${userId}`);
  },

  // Reset user password
  resetPassword: async (userId: number, newPassword: string): Promise<void> => {
    await axios.post(`${API_BASE_URL}/auth/admin/users/${userId}/reset-password`, {
      newPassword
    });
  }
};