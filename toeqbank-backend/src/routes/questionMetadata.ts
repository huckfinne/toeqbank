import { Router, Request, Response } from 'express';
import { QuestionMetadataModel } from '../models/QuestionMetadata';

const router = Router();

// Get metadata for a question
router.get('/question/:questionId', async (req: Request, res: Response) => {
  try {
    const questionId = parseInt(req.params.questionId);
    const metadata = await QuestionMetadataModel.findByQuestionId(questionId);
    
    if (!metadata) {
      return res.status(404).json({ error: 'Metadata not found for this question' });
    }
    
    res.json(metadata);
  } catch (error) {
    console.error('Get question metadata error:', error);
    res.status(500).json({ error: 'Failed to fetch question metadata' });
  }
});

// Create or update metadata for a question
router.post('/question/:questionId', async (req: Request, res: Response) => {
  try {
    const questionId = parseInt(req.params.questionId);
    const metadataData = req.body;
    
    console.log('Creating/updating metadata for question:', questionId);
    console.log('Metadata data received:', JSON.stringify(metadataData, null, 2));
    
    const metadata = await QuestionMetadataModel.create({
      question_id: questionId,
      ...metadataData
    });
    
    console.log('Metadata saved successfully:', metadata);
    res.status(201).json(metadata);
  } catch (error) {
    console.error('Create/update question metadata error:', error);
    console.error('Error details:', error);
    res.status(500).json({ error: 'Failed to save question metadata', details: error });
  }
});

// Update metadata for a question
router.put('/question/:questionId', async (req: Request, res: Response) => {
  try {
    const questionId = parseInt(req.params.questionId);
    const metadataData = req.body;
    
    const metadata = await QuestionMetadataModel.update(questionId, metadataData);
    res.json(metadata);
  } catch (error) {
    console.error('Update question metadata error:', error);
    res.status(500).json({ error: 'Failed to update question metadata' });
  }
});

// Delete metadata for a question
router.delete('/question/:questionId', async (req: Request, res: Response) => {
  try {
    const questionId = parseInt(req.params.questionId);
    const deleted = await QuestionMetadataModel.delete(questionId);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Metadata not found for this question' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Delete question metadata error:', error);
    res.status(500).json({ error: 'Failed to delete question metadata' });
  }
});

export default router;