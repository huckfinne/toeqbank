import { Router, Request, Response } from 'express';
import { QuestionModel, Question } from '../models/Question';
import { ImageDescriptionModel } from '../models/ImageDescription';
import { ImageModel } from '../models/Image';
import { UploadBatchModel } from '../models/UploadBatch';
import { requireAuth, optionalAuth } from '../middleware/auth';
import { query } from '../models/database';
import multer from 'multer';
import csv from 'csv-parser';
import * as fs from 'fs';

const router = Router();

// Apply optional authentication to all routes for development
router.use(optionalAuth);

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Get all questions with pagination
router.get('/', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    
    const questions = await QuestionModel.findAll(limit, offset);
    const total = await QuestionModel.getCount();
    
    res.json({
      questions,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    });
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({ error: 'Failed to fetch questions' });
  }
});

// Get question by ID with associated images
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const question = await QuestionModel.findById(id);
    
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }
    
    const images = await ImageModel.findByQuestionId(id);
    
    res.json({
      ...question,
      images
    });
  } catch (error) {
    console.error('Error fetching question:', error);
    res.status(500).json({ error: 'Failed to fetch question' });
  }
});

// Create a new question
router.post('/', async (req: Request, res: Response) => {
  try {
    const questionData: Omit<Question, 'id' | 'created_at' | 'updated_at' | 'question_number'> = req.body;
    
    // Validate required fields
    if (!questionData.question || !questionData.correct_answer) {
      return res.status(400).json({ error: 'Question and correct_answer are required' });
    }
    
    if (!['A', 'B', 'C', 'D', 'E', 'F', 'G'].includes(questionData.correct_answer)) {
      return res.status(400).json({ error: 'correct_answer must be A, B, C, D, E, F, or G' });
    }
    
    const question = await QuestionModel.create(questionData);
    res.status(201).json(question);
  } catch (error) {
    console.error('Error creating question:', error);
    res.status(500).json({ error: 'Failed to create question' });
  }
});

// Update a question
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const questionData: Partial<Question> = req.body;
    
    // Validate correct_answer if provided
    if (questionData.correct_answer && !['A', 'B', 'C', 'D', 'E', 'F', 'G'].includes(questionData.correct_answer)) {
      return res.status(400).json({ error: 'correct_answer must be A, B, C, D, E, F, or G' });
    }
    
    const question = await QuestionModel.update(id, questionData);
    
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }
    
    res.json(question);
  } catch (error) {
    console.error('Error updating question:', error);
    res.status(500).json({ error: 'Failed to update question' });
  }
});

// Delete a question
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const deleted = await QuestionModel.delete(id);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Question not found' });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting question:', error);
    res.status(500).json({ error: 'Failed to delete question' });
  }
});

// Batch upload questions from CSV
router.post('/upload', requireAuth, upload.single('csvFile'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const withImages = req.body.withImages === 'true';
    const userDescription = req.body.description || '';
    const isbn = req.body.isbn || '';
    const startingPage = req.body.startingPage ? parseInt(req.body.startingPage) : undefined;
    const endingPage = req.body.endingPage ? parseInt(req.body.endingPage) : undefined;
    const chapter = req.body.chapter || '';
    console.log('CSV upload started with withImages:', withImages);
    const questions: Omit<Question, 'id' | 'created_at' | 'updated_at' | 'question_number'>[] = [];
    const imageDescriptions: any[] = [];
    
    // Parse CSV file
    await new Promise<void>((resolve, reject) => {
      fs.createReadStream(req.file!.path)
        .pipe(csv())
        .on('data', (row) => {
          // Map CSV columns to question fields
          const question: Omit<Question, 'id' | 'created_at' | 'updated_at' | 'question_number'> = {
            question: row.question || '',
            choice_a: row.choice_a || '',
            choice_b: row.choice_b || '',
            choice_c: row.choice_c || '',
            choice_d: row.choice_d || '',
            choice_e: row.choice_e || '',
            choice_f: row.choice_f || '',
            choice_g: row.choice_g || '',
            correct_answer: row.correct_answer || '',
            explanation: row.explanation || '',
            source_folder: row.source_folder || '',
            uploaded_by: req.user?.id
          };
          
          // Handle image descriptions - check for image fields regardless of withImages flag
          // This allows mixed CSV files with some questions needing images and others not
          if (row.image_description || row.image_modality || row.image_view) {
            // Validate and sanitize enum values
            const validModalities = ['transthoracic', 'transesophageal', 'non-echo'];
            const validUsageTypes = ['question', 'explanation'];
            const validImageTypes = ['still', 'cine'];
            
            const modality = row.image_modality?.toLowerCase();
            const usageType = row.image_usage?.toLowerCase();
            const imageType = row.image_type?.toLowerCase();
            
            const imageDesc = {
              description: row.image_description || '',
              modality: validModalities.includes(modality) ? modality : null,
              echo_view: row.image_view || '',
              usage_type: validUsageTypes.includes(usageType) ? usageType : 'question',
              image_type: validImageTypes.includes(imageType) ? imageType : 'still',
              questionIndex: questions.length // Track which question this belongs to
            };
            imageDescriptions.push(imageDesc);
            
            // Set review status to 'returned' for questions needing images
            question.review_status = 'returned';
            question.review_notes = 'Question needs image to be uploaded before review';
          } else {
            // No image fields provided - question is ready for review
            question.review_status = 'pending';
          }
          
          // Validate required fields
          if (question.question && question.correct_answer && 
              ['A', 'B', 'C', 'D', 'E', 'F', 'G'].includes(question.correct_answer)) {
            questions.push(question);
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    if (questions.length === 0) {
      return res.status(400).json({ error: 'No valid questions found in CSV file' });
    }

    // Create a new batch for this upload
    const batchName = `Upload ${new Date().toISOString().slice(0, 19).replace(/T/, ' ')}`;
    const batch = await UploadBatchModel.create({
      batch_name: batchName,
      uploaded_by: req.user.id,
      question_count: questions.length,
      file_name: req.file.originalname,
      description: userDescription || `Batch upload of ${questions.length} questions`,
      isbn: isbn || undefined,
      starting_page: startingPage,
      ending_page: endingPage,
      chapter: chapter || undefined
    });

    // Associate all questions with this batch
    questions.forEach(question => {
      question.batch_id = batch.id;
    });

    // Bulk insert questions
    const createdQuestions = await QuestionModel.bulkCreate(questions);
    
    // If we have image descriptions, create them in the database
    if (imageDescriptions.length > 0) {
      console.log(`Creating ${imageDescriptions.length} image descriptions`);
      for (let i = 0; i < imageDescriptions.length; i++) {
        try {
          const imageDesc = imageDescriptions[i];
          const questionIndex = imageDesc.questionIndex;
          const createdQuestion = createdQuestions[questionIndex];
          
          if (createdQuestion && createdQuestion.id) {
            console.log('Creating image description:', {
              question_id: createdQuestion.id,
              description: imageDesc.description,
              modality: imageDesc.modality,
              echo_view: imageDesc.echo_view,
              usage_type: imageDesc.usage_type,
              image_type: imageDesc.image_type
            });
            
            // Create image description entry
            await ImageDescriptionModel.create({
              question_id: createdQuestion.id,
              description: imageDesc.description,
              modality: imageDesc.modality,
              echo_view: imageDesc.echo_view,
              usage_type: imageDesc.usage_type,
              image_type: imageDesc.image_type
            });
          }
        } catch (imageError) {
          console.error('Error creating image description:', imageError);
          throw imageError; // Re-throw to trigger main error handler
        }
      }
    }
    
    const questionsWithImages = imageDescriptions.length;
    const questionsWithoutImages = createdQuestions.length - questionsWithImages;
    
    let message = `Successfully uploaded ${createdQuestions.length} questions`;
    if (questionsWithImages > 0 && questionsWithoutImages > 0) {
      message += ` (${questionsWithImages} need images, ${questionsWithoutImages} ready for review)`;
    } else if (questionsWithImages > 0) {
      message += ` with image requirements`;
    } else {
      message += ` ready for review`;
    }
    
    res.status(201).json({
      message,
      questions: createdQuestions
    });
  } catch (error) {
    console.error('Error uploading questions:', error);
    
    // Clean up file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ error: 'Failed to upload questions' });
  }
});

// Get images for a question
router.get('/:id/images', async (req: Request, res: Response) => {
  try {
    const questionId = parseInt(req.params.id);
    const images = await ImageModel.findByQuestionId(questionId);
    res.json(images);
  } catch (error) {
    console.error('Error fetching question images:', error);
    res.status(500).json({ error: 'Failed to fetch question images' });
  }
});

// Save metadata for a question
router.post('/:id/metadata', async (req: Request, res: Response) => {
  try {
    const questionId = parseInt(req.params.id);
    
    if (isNaN(questionId)) {
      return res.status(400).json({ error: 'Invalid question ID' });
    }

    const metadata = req.body;
    console.log('Saving metadata for question', questionId, ':', metadata);
    
    // Save to database using upsert (INSERT ... ON CONFLICT)
    const sql = `
      INSERT INTO question_metadata (
        question_id, difficulty, category, topic, keywords, question_type, 
        view_type, major_structures, minor_structures, modalities, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
      ON CONFLICT (question_id) 
      DO UPDATE SET 
        difficulty = EXCLUDED.difficulty,
        category = EXCLUDED.category,
        topic = EXCLUDED.topic,
        keywords = EXCLUDED.keywords,
        question_type = EXCLUDED.question_type,
        view_type = EXCLUDED.view_type,
        major_structures = EXCLUDED.major_structures,
        minor_structures = EXCLUDED.minor_structures,
        modalities = EXCLUDED.modalities,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `;
    
    const values = [
      questionId,
      metadata.difficulty,
      metadata.category,
      metadata.topic,
      metadata.keywords || [],
      metadata.questionType,
      metadata.view,
      metadata.majorStructures || [],
      metadata.minorStructures || [],
      metadata.modalities || []
    ];
    
    await query(sql, values);
    res.json({ success: true, message: 'Metadata saved successfully' });
  } catch (error) {
    console.error('Error saving metadata:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Save exam assignments for a question
router.post('/:id/exams', async (req: Request, res: Response) => {
  try {
    const questionId = parseInt(req.params.id);
    
    if (isNaN(questionId)) {
      return res.status(400).json({ error: 'Invalid question ID' });
    }

    const { exams } = req.body;
    console.log('Saving exam assignments for question', questionId);
    console.log('Exam data received:', JSON.stringify(exams, null, 2));
    
    // First, delete existing exam assignments for this question
    await query('DELETE FROM question_exam_assignments WHERE question_id = $1', [questionId]);
    
    // Then insert new assignments
    if (exams && exams.length > 0) {
      for (const exam of exams) {
        // Process subtopics to ensure they're stored as strings
        let subtopicsArray = [];
        if (exam.subtopics) {
          subtopicsArray = exam.subtopics.map((st: any) => {
            if (typeof st === 'string') {
              return st;
            } else if (st && typeof st === 'object' && st.name) {
              // Store as "section: name" format
              return st.section ? `${st.section}: ${st.name}` : st.name;
            }
            return String(st);
          });
        }
        
        const sql = `
          INSERT INTO question_exam_assignments (
            question_id, exam_name, subtopics, reasoning, updated_at
          ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
        `;
        
        const values = [
          questionId,
          exam.examName,
          subtopicsArray,
          exam.reasoning || null
        ];
        
        console.log('Inserting exam assignment:', values);
        await query(sql, values);
      }
    }
    
    res.json({ success: true, message: 'Exam assignments saved successfully' });
  } catch (error) {
    console.error('Error saving exam assignments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get metadata for a question
router.get('/:id/metadata', async (req: Request, res: Response) => {
  try {
    const questionId = parseInt(req.params.id);
    
    if (isNaN(questionId)) {
      return res.status(400).json({ error: 'Invalid question ID' });
    }
    
    const sql = 'SELECT * FROM question_metadata WHERE question_id = $1';
    const result = await query(sql, [questionId]);
    
    if (result.rows.length === 0) {
      return res.json({ metadata: null });
    }
    
    const row = result.rows[0];
    const metadata = {
      difficulty: row.difficulty,
      category: row.category,
      topic: row.topic,
      keywords: row.keywords || [],
      questionType: row.question_type,
      view: row.view_type,
      majorStructures: row.major_structures || [],
      minorStructures: row.minor_structures || [],
      modalities: row.modalities || []
    };
    
    res.json({ metadata });
  } catch (error) {
    console.error('Error fetching metadata:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get exam assignments for a question
router.get('/:id/exams', async (req: Request, res: Response) => {
  try {
    const questionId = parseInt(req.params.id);
    
    if (isNaN(questionId)) {
      return res.status(400).json({ error: 'Invalid question ID' });
    }
    
    const sql = 'SELECT * FROM question_exam_assignments WHERE question_id = $1 ORDER BY exam_name';
    const result = await query(sql, [questionId]);
    
    const exams = result.rows.map((row: any) => {
      // Parse subtopics back into objects if they were stored as strings
      let subtopics = row.subtopics || [];
      if (Array.isArray(subtopics)) {
        subtopics = subtopics.map((st: string) => {
          // Check if it's in "section: name" format
          const colonIndex = st.indexOf(': ');
          if (colonIndex > -1) {
            return {
              section: st.substring(0, colonIndex),
              name: st.substring(colonIndex + 2)
            };
          }
          // Otherwise just return as a simple object
          return { name: st, section: '' };
        });
      }
      
      return {
        examName: row.exam_name,
        subtopics: subtopics,
        reasoning: row.reasoning
      };
    });
    
    res.json({ exams });
  } catch (error) {
    console.error('Error fetching exam assignments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// REVIEW SYSTEM ENDPOINTS

// Get pending questions for review (reviewers only)
router.get('/review/pending', requireAuth, async (req: Request, res: Response) => {
  try {
    console.log('=== REVIEW QUEUE REQUEST ===');
    console.log('User:', req.user?.username, 'Admin:', req.user?.is_admin, 'Reviewer:', req.user?.is_reviewer);
    
    if (!req.user.is_reviewer && !req.user.is_admin) {
      console.log('Access denied - user is not reviewer or admin');
      return res.status(403).json({ error: 'Reviewer access required' });
    }

    const questions = await QuestionModel.getPendingReview();
    console.log('Found pending questions:', questions.length);
    console.log('Questions:', questions.map(q => ({ id: q.id, question: q.question.substring(0, 50) + '...' })));
    
    res.json({ questions });
  } catch (error) {
    console.error('Error fetching pending questions:', error);
    res.status(500).json({ error: 'Failed to fetch pending questions' });
  }
});

// Get questions by review status (reviewers only)
router.get('/review/status/:status', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user.is_reviewer && !req.user.is_admin) {
      return res.status(403).json({ error: 'Reviewer access required' });
    }

    const status = req.params.status as 'pending' | 'approved' | 'rejected' | 'returned';
    if (!['pending', 'approved', 'rejected', 'returned'].includes(status)) {
      return res.status(400).json({ error: 'Invalid review status' });
    }

    const questions = await QuestionModel.getByReviewStatus(status);
    res.json({ questions });
  } catch (error) {
    console.error('Error fetching questions by status:', error);
    res.status(500).json({ error: 'Failed to fetch questions' });
  }
});

// Update question review status (reviewers only)
router.post('/review/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user.is_reviewer && !req.user.is_admin) {
      return res.status(403).json({ error: 'Reviewer access required' });
    }

    const questionId = parseInt(req.params.id);
    const { status, notes } = req.body;

    if (!['approved', 'rejected', 'returned'].includes(status)) {
      return res.status(400).json({ error: 'Invalid review status. Must be: approved, rejected, or returned' });
    }

    if ((status === 'rejected' || status === 'returned') && !notes?.trim()) {
      return res.status(400).json({ error: 'Review notes are required for rejected or returned questions' });
    }

    const updatedQuestion = await QuestionModel.updateReviewStatus(
      questionId, 
      status, 
      notes || '', 
      req.user.id
    );

    if (!updatedQuestion) {
      return res.status(404).json({ error: 'Question not found' });
    }

    res.json({ 
      message: `Question ${status} successfully`, 
      question: updatedQuestion 
    });
  } catch (error) {
    console.error('Error updating review status:', error);
    res.status(500).json({ error: 'Failed to update review status' });
  }
});

// Get review statistics (reviewers only)
router.get('/review/stats', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user.is_reviewer && !req.user.is_admin) {
      return res.status(403).json({ error: 'Reviewer access required' });
    }

    const stats = await QuestionModel.getReviewStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching review stats:', error);
    res.status(500).json({ error: 'Failed to fetch review statistics' });
  }
});

// Get questions returned to user for rework
router.get('/my-returned', requireAuth, async (req: Request, res: Response) => {
  try {
    const returnedQuestions = await QuestionModel.getReturnedForUploader(req.user.id);
    res.json(returnedQuestions);
  } catch (error) {
    console.error('Error fetching returned questions:', error);
    res.status(500).json({ error: 'Failed to fetch returned questions' });
  }
});

// Get all questions uploaded by current user
router.get('/my-questions', requireAuth, async (req: Request, res: Response) => {
  try {
    const userQuestions = await QuestionModel.getByUploader(req.user.id);
    res.json(userQuestions);
  } catch (error) {
    console.error('Error fetching user questions:', error);
    res.status(500).json({ error: 'Failed to fetch user questions' });
  }
});

// Get all upload batches (admin only)
router.get('/batches', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const batches = await UploadBatchModel.getAll();
    res.json(batches);
  } catch (error) {
    console.error('Error fetching upload batches:', error);
    res.status(500).json({ error: 'Failed to fetch upload batches' });
  }
});

// Get batch details (admin only)
router.get('/batches/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const batchId = parseInt(req.params.id);
    const batch = await UploadBatchModel.getById(batchId);
    
    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    const questions = await UploadBatchModel.getQuestionsByBatchId(batchId);
    
    res.json({
      batch,
      questions
    });
  } catch (error) {
    console.error('Error fetching batch details:', error);
    res.status(500).json({ error: 'Failed to fetch batch details' });
  }
});

// Delete entire batch (admin only)
router.delete('/batches/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const batchId = parseInt(req.params.id);
    const batch = await UploadBatchModel.getById(batchId);
    
    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    // Get question count before deletion
    const questions = await UploadBatchModel.getQuestionsByBatchId(batchId);
    const questionCount = questions.length;

    // Delete the batch (cascade will delete all associated questions and related data)
    const deleted = await UploadBatchModel.delete(batchId);
    
    if (!deleted) {
      return res.status(500).json({ error: 'Failed to delete batch' });
    }

    res.json({ 
      message: `Batch "${batch.batch_name}" deleted successfully`,
      deletedQuestions: questionCount,
      batchId: batchId
    });
  } catch (error) {
    console.error('Error deleting batch:', error);
    res.status(500).json({ error: 'Failed to delete batch' });
  }
});

export default router;