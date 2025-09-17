import { Request, Response, NextFunction } from 'express';
const jwt = require('jsonwebtoken');
import { UserModel } from '../models/User';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

export interface JWTPayload {
  userId: number;
  username: string;
  email: string;
}

export const generateToken = (user: any): string => {
  const payload: JWTPayload = {
    userId: user.id,
    username: user.username,
    email: user.email
  };
  
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      console.log('No token provided');
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    
    // Verify user still exists and is active
    const user = await UserModel.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'Invalid token - user not found' });
    }


    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: 'Token expired' });
    }
    
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
      const user = await UserModel.findById(decoded.userId);
      if (user) {
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    // For optional auth, we don't return errors, just continue without user
    next();
  }
};

export const requireAuth = authenticateToken;

export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // First authenticate the user
    await authenticateToken(req, res, () => {
      // Check if user is admin
      if (!req.user || !req.user.is_admin) {
        return res.status(403).json({ error: 'Admin access required' });
      }
      next();
    });
  } catch (error) {
    console.error('Admin authentication error:', error);
    res.status(500).json({ error: 'Admin authentication failed' });
  }
};

export const requireReviewer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // First authenticate the user
    await authenticateToken(req, res, () => {
      // Check if user is reviewer OR admin (admins have reviewer privileges)
      if (!req.user || (!req.user.is_reviewer && !req.user.is_admin)) {
        return res.status(403).json({ error: 'Reviewer access required' });
      }
      next();
    });
  } catch (error) {
    console.error('Reviewer authentication error:', error);
    res.status(500).json({ error: 'Reviewer authentication failed' });
  }
};