import { Router, Request, Response } from 'express';
import { QuestionModel, Question } from '../models/Question';
import { ImageModel } from '../models/Image';
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
router.post('/upload', upload.single('csvFile'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const questions: Omit<Question, 'id' | 'created_at' | 'updated_at' | 'question_number'>[] = [];
    
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
            source_folder: row.source_folder || ''
          };
          
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

    // Bulk insert questions
    const createdQuestions = await QuestionModel.bulkCreate(questions);
    
    res.status(201).json({
      message: `Successfully uploaded ${createdQuestions.length} questions`,
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

export default router;