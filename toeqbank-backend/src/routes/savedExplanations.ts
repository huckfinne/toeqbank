import express from 'express';
import { query } from '../models/database';
import { authenticateToken as auth } from '../middleware/auth';

const router = express.Router();

// Get all saved explanations (sorted by usage count)
router.get('/', auth, async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM saved_explanations ORDER BY usage_count DESC, created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching saved explanations:', error);
    res.status(500).json({ error: 'Failed to fetch saved explanations' });
  }
});

// Save a new explanation
router.post('/', auth, async (req, res) => {
  const { explanation } = req.body;
  const userId = (req as any).user.id;

  if (!explanation || explanation.trim() === '') {
    return res.status(400).json({ error: 'Explanation is required' });
  }

  try {
    // Check if explanation already exists
    const existing = await query(
      'SELECT id, usage_count FROM saved_explanations WHERE explanation = $1',
      [explanation]
    );

    if (existing.rows.length > 0) {
      // Increment usage count if it already exists
      await query(
        'UPDATE saved_explanations SET usage_count = usage_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [existing.rows[0].id]
      );
      return res.json({ 
        message: 'Explanation already exists, usage count incremented',
        id: existing.rows[0].id 
      });
    }

    // Insert new explanation
    const result = await query(
      'INSERT INTO saved_explanations (explanation, created_by, usage_count) VALUES ($1, $2, 1) RETURNING *',
      [explanation, userId]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error saving explanation:', error);
    res.status(500).json({ error: 'Failed to save explanation' });
  }
});

// Increment usage count when an explanation is used
router.post('/:id/use', auth, async (req, res) => {
  const { id } = req.params;

  try {
    await query(
      'UPDATE saved_explanations SET usage_count = usage_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );
    res.json({ message: 'Usage count incremented' });
  } catch (error) {
    console.error('Error incrementing usage count:', error);
    res.status(500).json({ error: 'Failed to increment usage count' });
  }
});

// Delete a saved explanation (optional - only by creator or admin)
router.delete('/:id', auth, async (req, res) => {
  const { id } = req.params;
  const userId = (req as any).user.id;
  const isAdmin = (req as any).user.role === 'admin';

  try {
    // Check if user is creator or admin
    const result = await query(
      'SELECT created_by FROM saved_explanations WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Explanation not found' });
    }

    if (result.rows[0].created_by !== userId && !isAdmin) {
      return res.status(403).json({ error: 'Not authorized to delete this explanation' });
    }

    await query('DELETE FROM saved_explanations WHERE id = $1', [id]);
    res.json({ message: 'Explanation deleted successfully' });
  } catch (error) {
    console.error('Error deleting explanation:', error);
    res.status(500).json({ error: 'Failed to delete explanation' });
  }
});

export default router;