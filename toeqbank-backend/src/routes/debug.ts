import { Router, Request, Response } from 'express';
import { query } from '../models/database';

const router = Router();

// Debug endpoint to check and update huckfinne admin status
router.post('/fix-huckfinne-admin', async (req: Request, res: Response) => {
  try {
    console.log('Debug: Checking huckfinne admin status...');
    
    // Check current user
    const currentUser = await query('SELECT id, username, email, is_admin, is_reviewer FROM users WHERE username = $1', ['huckfinne']);
    console.log('Current huckfinne:', currentUser.rows[0]);
    
    // Check all users
    const allUsers = await query('SELECT id, username, email, is_admin, is_reviewer FROM users ORDER BY id');
    console.log('All users:', allUsers.rows);
    
    if (currentUser.rows[0]) {
      console.log('Updating huckfinne to admin...');
      const updateResult = await query(
        'UPDATE users SET is_admin = true, is_reviewer = true WHERE username = $1 RETURNING id, username, is_admin, is_reviewer', 
        ['huckfinne']
      );
      console.log('Update result:', updateResult.rows[0]);
      
      res.json({ 
        success: true, 
        current: currentUser.rows[0], 
        updated: updateResult.rows[0] 
      });
    } else {
      res.json({ 
        success: false, 
        message: 'User huckfinne not found',
        allUsers: allUsers.rows 
      });
    }
    
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

export default router;