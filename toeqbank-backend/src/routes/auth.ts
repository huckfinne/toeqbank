import { Router, Request, Response } from 'express';
import { UserModel, CreateUserRequest, LoginRequest } from '../models/User';
import { generateToken, requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

// Register new user
router.post('/register', async (req: Request, res: Response) => {
  try {
    const userData: CreateUserRequest = req.body;
    
    // Validate required fields
    if (!userData.username || !userData.email || !userData.password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }
    
    // Validate username format
    if (userData.username.length < 3 || userData.username.length > 50) {
      return res.status(400).json({ error: 'Username must be between 3 and 50 characters' });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userData.email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    
    // Validate password strength
    if (userData.password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }
    
    // Check if username already exists
    const existingUser = await UserModel.findByUsername(userData.username);
    if (existingUser) {
      return res.status(409).json({ error: 'Username already exists' });
    }
    
    // Check if email already exists
    const existingEmail = await UserModel.findByEmail(userData.email);
    if (existingEmail) {
      return res.status(409).json({ error: 'Email already exists' });
    }
    
    // Create user
    const user = await UserModel.create(userData);
    
    // Generate token
    const token = generateToken(user);
    
    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        is_admin: user.is_admin,
        is_reviewer: user.is_reviewer
      },
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const loginData: LoginRequest = req.body;
    
    // Validate required fields
    if (!loginData.username || !loginData.password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    // Authenticate user
    const user = await UserModel.authenticate(loginData);
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    // Generate token
    const token = generateToken(user);
    
    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        last_login: user.last_login,
        is_admin: user.is_admin,
        is_reviewer: user.is_reviewer
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user profile
router.get('/profile', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user;
    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        last_login: user.last_login,
        created_at: user.created_at,
        is_admin: user.is_admin,
        is_reviewer: user.is_reviewer
      }
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Update user profile
router.put('/profile', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const updates = req.body;
    
    // Remove fields that shouldn't be updated via this endpoint
    const allowedFields = ['first_name', 'last_name', 'email'];
    const filteredUpdates: any = {};
    
    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    });
    
    // Validate email if provided
    if (filteredUpdates.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(filteredUpdates.email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }
      
      // Check if email already exists (for other users)
      const existingEmail = await UserModel.findByEmail(filteredUpdates.email);
      if (existingEmail && existingEmail.id !== userId) {
        return res.status(409).json({ error: 'Email already exists' });
      }
    }
    
    const updatedUser = await UserModel.updateUser(userId, filteredUpdates);
    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        first_name: updatedUser.first_name,
        last_name: updatedUser.last_name,
        is_admin: updatedUser.is_admin,
        is_reviewer: updatedUser.is_reviewer
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Change password
router.post('/change-password', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }
    
    // Validate new password
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }
    
    // Verify current password
    const user = await UserModel.findByUsername(req.user.username);
    if (!user || !(await UserModel.validatePassword(user, currentPassword))) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    
    // Update password
    const success = await UserModel.changePassword(userId, newPassword);
    if (!success) {
      return res.status(500).json({ error: 'Failed to change password' });
    }
    
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Verify token (for frontend to check if token is still valid)
router.get('/verify', requireAuth, (req: Request, res: Response) => {
  res.json({ 
    valid: true, 
    user: {
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
      is_admin: req.user.is_admin,
      is_reviewer: req.user.is_reviewer
    }
  });
});

// === ADMIN ENDPOINTS ===

// Get all users (admin only)
router.get('/admin/users', requireAdmin, async (req: Request, res: Response) => {
  try {
    const users = await UserModel.findAll();
    res.json({
      users: users.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        is_admin: user.is_admin,
        is_reviewer: user.is_reviewer,
        created_at: user.created_at,
        last_login: user.last_login
      }))
    });
  } catch (error) {
    console.error('Admin get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Create user (admin only)
router.post('/admin/users', requireAdmin, async (req: Request, res: Response) => {
  try {
    const userData: CreateUserRequest & { is_admin?: boolean; is_reviewer?: boolean } = req.body;
    
    // Validate required fields
    if (!userData.username || !userData.email || !userData.password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }
    
    // Validate username format
    if (userData.username.length < 3 || userData.username.length > 50) {
      return res.status(400).json({ error: 'Username must be between 3 and 50 characters' });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userData.email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    
    // Validate password strength
    if (userData.password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }
    
    // Check if username already exists
    const existingUser = await UserModel.findByUsername(userData.username);
    if (existingUser) {
      return res.status(409).json({ error: 'Username already exists' });
    }
    
    // Check if email already exists
    const existingEmail = await UserModel.findByEmail(userData.email);
    if (existingEmail) {
      return res.status(409).json({ error: 'Email already exists' });
    }
    
    // Create user with admin/reviewer privileges if specified
    const userDataWithRoles = {
      ...userData,
      is_admin: userData.is_admin || false,
      is_reviewer: userData.is_reviewer || false
    };
    
    const user = await UserModel.create(userDataWithRoles);
    
    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        is_admin: user.is_admin,
        is_reviewer: user.is_reviewer,
        created_at: user.created_at
      }
    });
  } catch (error) {
    console.error('Admin create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user (admin only)
router.put('/admin/users/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const updates = req.body;
    
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    // Validate email if provided
    if (updates.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(updates.email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }
      
      // Check if email already exists (for other users)
      const existingEmail = await UserModel.findByEmail(updates.email);
      if (existingEmail && existingEmail.id !== userId) {
        return res.status(409).json({ error: 'Email already exists' });
      }
    }
    
    // Admin can update any field except password (use separate endpoint)
    const allowedFields = ['username', 'email', 'first_name', 'last_name', 'is_admin', 'is_reviewer'];
    const filteredUpdates: any = {};
    
    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    });
    
    const updatedUser = await UserModel.updateUser(userId, filteredUpdates);
    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      message: 'User updated successfully',
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        first_name: updatedUser.first_name,
        last_name: updatedUser.last_name,
        is_admin: updatedUser.is_admin,
        is_reviewer: updatedUser.is_reviewer,
        created_at: updatedUser.created_at
      }
    });
  } catch (error) {
    console.error('Admin update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user (admin only)
router.delete('/admin/users/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    // Prevent admin from deleting themselves
    if (userId === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    
    const success = await UserModel.deleteUser(userId);
    if (!success) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Admin delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Reset user password (admin only)
router.post('/admin/users/:id/reset-password', requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const { newPassword } = req.body;
    
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }
    
    const success = await UserModel.changePassword(userId, newPassword);
    if (!success) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Admin reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

export default router;