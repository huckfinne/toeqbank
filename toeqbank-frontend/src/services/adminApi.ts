import api from './api';

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  is_admin: boolean;
  is_reviewer: boolean;
  is_image_contributor: boolean;
  created_at: string;
  last_login?: string;
  contribution_stats?: {
    total_images: number;
    total_descriptions: number;
    total_contributions: number;
    permitted_limit: number;
    remaining: number;
  };
}

export interface CreateUserData {
  username: string;
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  exam_category: string;
  exam_type: string;
  is_admin?: boolean;
  is_reviewer?: boolean;
  is_image_contributor?: boolean;
}

export interface UpdateUserData {
  username?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  is_admin?: boolean;
  is_reviewer?: boolean;
  is_image_contributor?: boolean;
}

export const adminService = {
  // Get all users
  getUsers: async (): Promise<AdminUser[]> => {
    const response = await api.get('/auth/admin/users');
    return response.data.users;
  },

  // Create new user
  createUser: async (userData: CreateUserData): Promise<AdminUser> => {
    const response = await api.post('/auth/admin/users', userData);
    return response.data.user;
  },

  // Update user
  updateUser: async (userId: number, userData: UpdateUserData): Promise<AdminUser> => {
    const response = await api.put(`/auth/admin/users/${userId}`, userData);
    return response.data.user;
  },

  // Delete user
  deleteUser: async (userId: number): Promise<void> => {
    await api.delete(`/auth/admin/users/${userId}`);
  },

  // Reset user password
  resetPassword: async (userId: number, newPassword: string): Promise<void> => {
    await api.post(`/auth/admin/users/${userId}/reset-password`, {
      newPassword
    });
  },

  // Generate registration token
  generateRegistrationToken: async (role: string = 'image_contributor', expiresInHours: number = 72): Promise<{ token: string, registrationUrl: string }> => {
    const response = await api.post('/auth/admin/registration-tokens', {
      role,
      expiresInHours
    });
    return response.data;
  }
};