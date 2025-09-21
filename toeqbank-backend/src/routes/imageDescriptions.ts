import { Router, Request, Response } from 'express';
import { ImageDescriptionModel } from '../models/ImageDescription';
import { ImageModel } from '../models/Image';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Get all image descriptions (optionally filtered by batch and/or echo_view)
router.get('/', async (req: Request, res: Response) => {
  try {
    const batchId = req.query.batch_id ? parseInt(req.query.batch_id as string) : undefined;
    const echoView = req.query.echo_view as string | undefined;
    
    let descriptions;
    if (batchId || echoView) {
      descriptions = await ImageDescriptionModel.findByFilters({ batchId, echoView });
      console.log(`Fetched image descriptions with filters (batch: ${batchId}, view: ${echoView}):`, descriptions.length, 'items');
    } else {
      descriptions = await ImageDescriptionModel.findAll();
      console.log('Fetched all image descriptions:', descriptions.length, 'items');
    }
    
    if (descriptions.length > 0) {
      console.log('First description sample:', descriptions[0]);
    }
    res.json(descriptions);
  } catch (error) {
    console.error('Get image descriptions error:', error);
    res.status(500).json({ error: 'Failed to fetch image descriptions' });
  }
});

// Get distinct echo views
router.get('/echo-views', async (req: Request, res: Response) => {
  try {
    const echoViews = await ImageDescriptionModel.getDistinctEchoViews();
    res.json(echoViews);
  } catch (error) {
    console.error('Get echo views error:', error);
    res.status(500).json({ error: 'Failed to fetch echo views' });
  }
});

// Get all image descriptions for a question
router.get('/question/:questionId', async (req: Request, res: Response) => {
  try {
    const questionId = parseInt(req.params.questionId);
    const usageType = req.query.usage_type as 'question' | 'explanation' | undefined;
    
    let descriptions;
    if (usageType) {
      descriptions = await ImageDescriptionModel.findByQuestionIdAndUsageType(questionId, usageType);
    } else {
      descriptions = await ImageDescriptionModel.findByQuestionId(questionId);
    }
    
    res.json(descriptions);
  } catch (error) {
    console.error('Get image descriptions error:', error);
    res.status(500).json({ error: 'Failed to fetch image descriptions' });
  }
});

// Get a single image description
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const description = await ImageDescriptionModel.findById(id);
    
    res.json(description);
  } catch (error) {
    console.error('Get image description error:', error);
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({ error: 'Image description not found' });
    } else {
      res.status(500).json({ error: 'Failed to fetch image description' });
    }
  }
});

// Create a new image description
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    // Check if user is an image contributor and has reached the limit
    if (req.user.is_image_contributor && !req.user.is_admin && !req.user.is_reviewer) {
      const imageCount = await ImageModel.countByUser(req.user.id);
      const descriptionCount = await ImageDescriptionModel.countByUser(req.user.id);
      const totalContributions = imageCount + descriptionCount;
      
      if (totalContributions >= 20) {
        return res.status(403).json({ 
          error: 'Contribution limit reached', 
          message: 'Image contributors are limited to 20 total contributions (images + descriptions). Please contact an administrator if you need to contribute more.',
          currentImages: imageCount,
          currentDescriptions: descriptionCount,
          totalContributions,
          limit: 20
        });
      }
    }

    const { question_id, description, usage_type } = req.body;
    
    if (!question_id || !description || !usage_type) {
      return res.status(400).json({ 
        error: 'question_id, description, and usage_type are required' 
      });
    }
    
    if (!['question', 'explanation'].includes(usage_type)) {
      return res.status(400).json({ 
        error: 'usage_type must be either "question" or "explanation"' 
      });
    }
    
    const imageDescription = await ImageDescriptionModel.create({
      question_id: parseInt(question_id),
      description,
      usage_type,
      created_by: req.user.id
    });
    
    res.status(201).json(imageDescription);
  } catch (error) {
    console.error('Create image description error:', error);
    res.status(500).json({ error: 'Failed to create image description' });
  }
});

// Update an image description
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { description, usage_type } = req.body;
    
    const updateData: any = {};
    if (description !== undefined) updateData.description = description;
    if (usage_type !== undefined) {
      if (!['question', 'explanation'].includes(usage_type)) {
        return res.status(400).json({ 
          error: 'usage_type must be either "question" or "explanation"' 
        });
      }
      updateData.usage_type = usage_type;
    }
    
    const imageDescription = await ImageDescriptionModel.update(id, updateData);
    res.json(imageDescription);
  } catch (error) {
    console.error('Update image description error:', error);
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({ error: 'Image description not found' });
    } else {
      res.status(500).json({ error: 'Failed to update image description' });
    }
  }
});

// Delete an image description
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const deleted = await ImageDescriptionModel.delete(id);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Image description not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Delete image description error:', error);
    res.status(500).json({ error: 'Failed to delete image description' });
  }
});

// Delete all image descriptions for a question
router.delete('/question/:questionId', async (req: Request, res: Response) => {
  try {
    const questionId = parseInt(req.params.questionId);
    const deletedCount = await ImageDescriptionModel.deleteByQuestionId(questionId);
    
    res.json({ success: true, deletedCount });
  } catch (error) {
    console.error('Delete question image descriptions error:', error);
    res.status(500).json({ error: 'Failed to delete image descriptions' });
  }
});

export default router;