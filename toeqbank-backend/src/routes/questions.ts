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

// Standardize echo view names from various CSV formats
function standardizeEchoView(rawView: string): string {
  if (!rawView) return '';
  
  // Normalize the input: trim and convert to consistent format
  const normalized = rawView.trim();
  
  // Define mappings for common variations to standardized names
  const viewMappings: { [key: string]: string } = {
    // ME 2-Chamber variations
    'ME 2C': 'ME 2-Chamber',
    'ME 2C comparison': 'ME 2-Chamber',
    'ME 2 Chamber': 'ME 2-Chamber',
    'Mid-oesophageal two-chamber': 'ME 2-Chamber',
    'Mid-oesophageal two-chamber (80-100°)': 'ME 2-Chamber',
    'Mid-oesophageal 2-chamber': 'ME 2-Chamber',
    'Mid-esophageal two-chamber': 'ME 2-Chamber',
    'Mid-esophageal 2-chamber': 'ME 2-Chamber',
    'ME two-chamber': 'ME 2-Chamber',
    
    // ME 4-Chamber variations  
    'ME 4C': 'ME 4-Chamber',
    'ME 4C 0°': 'ME 4-Chamber',
    'ME 4 Chamber': 'ME 4-Chamber',
    'Mid-oesophageal four-chamber': 'ME 4-Chamber',
    'Mid-oesophageal four-chamber (0-15°)': 'ME 4-Chamber',
    'Mid-oesophageal 4-chamber': 'ME 4-Chamber',
    'Mid-esophageal four-chamber': 'ME 4-Chamber',
    'Mid-esophageal 4-chamber': 'ME 4-Chamber',
    'ME four-chamber': 'ME 4-Chamber',
    
    // ME 5-Chamber
    'ME 5C': 'ME 5-Chamber',
    'Mid-oesophageal five-chamber': 'ME 5-Chamber',
    'Mid-oesophageal five-chamber (0°)': 'ME 5-Chamber',
    'ME five-chamber': 'ME 5-Chamber',
    
    // ME LAX variations
    'ME Long Axis': 'ME LAX',
    'ME long axis': 'ME LAX',
    'Mid-oesophageal long axis': 'ME LAX',
    'Mid-oesophageal long axis (120-140°)': 'ME LAX',
    'Mid-esophageal long axis': 'ME LAX',
    
    // ME AV variations
    'ME AV LAX': 'ME AV Long Axis',
    'ME AV LAX 120°': 'ME AV Long Axis',
    'ME AV LAX 135°': 'ME AV Long Axis',
    'Mid-oesophageal AV long axis': 'ME AV Long Axis',
    'Mid-oesophageal AV long axis (120-140°)': 'ME AV Long Axis',
    'ME AV SAX': 'ME AV Short Axis',
    'Mid-oesophageal AV short axis': 'ME AV Short Axis',
    'Mid-oesophageal AV short axis (30-50°)': 'ME AV Short Axis',
    'ME AV LAX/SAX': 'ME AV',
    
    // ME Bicaval variations
    'ME bicaval': 'ME Bicaval',
    'Mid-oesophageal bicaval': 'ME Bicaval',
    'Mid-oesophageal bicaval (90-110°)': 'ME Bicaval',
    'Mid-esophageal bicaval': 'ME Bicaval',
    'ME bicaval/4C': 'ME Bicaval',
    
    // ME Commissural variations
    'ME Commissural': 'ME Mitral Commissural',
    'ME Commissural 65°': 'ME Mitral Commissural',
    'ME mitral commissural': 'ME Mitral Commissural',
    'Mid-oesophageal mitral commissural': 'ME Mitral Commissural',
    'Mid-oesophageal mitral commissural (50-70°)': 'ME Mitral Commissural',
    
    // ME RV Inflow-Outflow
    'ME RV inflow-outflow': 'ME RV Inflow-Outflow',
    'Mid-oesophageal RV inflow-outflow': 'ME RV Inflow-Outflow',
    'Mid-oesophageal RV inflow-outflow (50-70°)': 'ME RV Inflow-Outflow',
    
    // Other ME views
    'Mid-oesophageal ascending aorta short axis': 'ME Ascending Aorta Short Axis',
    'Mid-oesophageal ascending aorta short axis (10-30°)': 'ME Ascending Aorta Short Axis',
    'Mid-oesophageal LA appendage': 'ME LA Appendage',
    'Mid-oesophageal LA appendage (90-120°)': 'ME LA Appendage',
    'Mid-oesophageal LUPV': 'ME LUPV',
    'Mid-oesophageal LUPV (0-90°)': 'ME LUPV',
    'Mid-oesophageal left upper pulmonary vein': 'ME LUPV',
    'Mid-oesophageal left upper pulmonary vein (0-90°)': 'ME LUPV',
    'Mid-oesophageal modified bicaval TV': 'ME Modified Bicaval TV',
    'Mid-oesophageal modified bicaval TV (110-130°)': 'ME Modified Bicaval TV',
    'Modified mid-oesophageal bicaval RUPV': 'ME Modified Bicaval TV',
    'Modified mid-oesophageal bicaval RUPV (110°)': 'ME Modified Bicaval TV',
    'Mid-oesophageal four-chamber CS view': 'ME 4-Chamber CS',
    'Mid-oesophageal four-chamber CS view (0-15°)': 'ME 4-Chamber CS',
    
    // TG variations
    'TG SAX': 'TG Short Axis',
    'TG LAX': 'TG Long Axis',
    'Deep TG LAX': 'Deep TG Long Axis',
    'Transgastric long axis': 'TG Long Axis',
    'Transgastric long axis (120-140°)': 'TG Long Axis',
    'Transgastric mid short-axis': 'TG Mid Short Axis',
    'Transgastric mid-papillary short axis': 'TG Mid Short Axis',
    'Transgastric mid-papillary short axis (0-15°)': 'TG Mid Short Axis',
    'Transgastric basal short axis': 'TG Basal Short Axis',
    'Transgastric basal short axis (0-15°)': 'TG Basal Short Axis',
    'Transgastric apical short axis': 'TG Apical Short Axis',
    'Transgastric apical short axis (0-15°)': 'TG Apical Short Axis',
    'Transgastric two-chamber': 'TG 2-Chamber',
    'Transgastric two-chamber (80-100°)': 'TG 2-Chamber',
    'Transgastric RV basal short axis': 'TG RV Basal Short Axis',
    'Transgastric RV inflow': 'TG RV Inflow',
    'Transgastric inferior vena cava': 'TG IVC',
    'Transgastric inferior vena cava (90-110°)': 'TG IVC',
    'Deep transgastric five-chamber': 'Deep TG 5-Chamber',
    
    // UE variations
    'UE Aortic Arch SAX': 'UE Aortic Arch Short Axis',
    'Upper oesophageal aortic arch short axis': 'UE Aortic Arch Short Axis',
    'Upper oesophageal aortic arch short axis (90°)': 'UE Aortic Arch Short Axis',
    'Upper oesophageal aortic arch long axis': 'UE Aortic Arch Long Axis',
    'Upper oesophageal aortic arch long axis (110-140°)': 'UE Aortic Arch Long Axis',
    
    // Descending Aorta
    'Desc Ao LAX': 'Descending Aorta Long Axis',
    'Descending aorta long axis': 'Descending Aorta Long Axis',
    'Descending aorta long axis (90-100°)': 'Descending Aorta Long Axis',
    'Desc Ao SAX': 'Descending Aorta Short Axis',
    'Descending aorta short axis': 'Descending Aorta Short Axis',
    'Descending aorta short axis (0°)': 'Descending Aorta Short Axis',
    
    // RV focused
    'RV focused': 'RV Focused View',
    
    // Generic/non-specific views (return null for these)
    'ME view': '',
    'ME views': '',
    'Orientation': '',
    'Safety': '',
    'Pleural space assessment': '',
  };
  
  // Check if we have a direct mapping
  if (viewMappings.hasOwnProperty(normalized)) {
    return viewMappings[normalized];
  }
  
  // Check case-insensitive
  const lowerNormalized = normalized.toLowerCase();
  for (const [key, value] of Object.entries(viewMappings)) {
    if (key.toLowerCase() === lowerNormalized) {
      return value;
    }
  }
  
  // If no mapping found, return the original but trimmed
  // This allows for properly formatted views like "3D AV", "CW Doppler", etc.
  return normalized;
}

// Get all questions with pagination (filtered by user's exam)
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    
    // Get user's exam category and type from req.user
    const user = (req as any).user;
    const examCategory = user?.exam_category || 'echocardiography';
    const examType = user?.exam_type || 'eacvi_toe';
    
    console.log('Filtering questions for user:', user?.username, 'exam:', examCategory, examType);
    
    // For USMLE users, show ALL USMLE questions regardless of step
    // For other categories, filter by specific exam type
    let questions;
    let total;
    
    if (examCategory === 'usmle') {
      // Show all USMLE questions for USMLE users
      questions = await QuestionModel.findAllByCategory(limit, offset, examCategory, true);
      total = await QuestionModel.getCountByCategory(examCategory, true);
    } else {
      // Filter by specific exam type for non-USMLE categories
      questions = await QuestionModel.findAll(limit, offset, examCategory, examType, true);
      total = await QuestionModel.getCount(examCategory, examType, true);
    }
    
    console.log(`=== MAIN QUESTIONS RESPONSE ===`);
    console.log(`Total questions found: ${total}`);
    console.log(`Returning ${questions.length} questions:`);
    questions.slice(0, 5).forEach((q: any) => {
      console.log(`- Q${q.id}: ${q.exam_category}/${q.exam_type} - ${q.question?.substring(0, 50)}...`);
    });
    
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

// Get upload batches (filtered by user's exam category)
router.get('/batches', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const examCategory = user?.exam_category || 'echocardiography';
    
    // All users (including admins) see batches filtered by their exam category
    // This ensures USMLE admins only see USMLE batches, Echo admins only see Echo batches
    const batches = await UploadBatchModel.getByExamCategory(examCategory);
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

// Get all questions uploaded by current user
router.get('/my-questions', requireAuth, async (req: Request, res: Response) => {
  try {
    console.log('🔄 GET /my-questions called for user:', req.user.id);
    const userQuestions = await QuestionModel.getByUploader(req.user.id);
    console.log('✅ Found', userQuestions.length, 'questions for user', req.user.id);
    res.json(userQuestions);
  } catch (error) {
    console.error('❌ Error fetching user questions:', error);
    res.status(500).json({ error: 'Failed to fetch user questions' });
  }
});

// Get questions returned to user for rework
router.get('/my-returned', requireAuth, async (req: Request, res: Response) => {
  try {
    console.log('🔍 /my-returned - Request received');
    console.log('🔍 /my-returned - req.user:', req.user);
    console.log('🔍 /my-returned - req.user.id:', req.user?.id);

    if (!req.user || !req.user.id) {
      console.error('❌ /my-returned - No user or user.id found');
      return res.status(401).json({ error: 'Authentication required' });
    }

    console.log('🔍 /my-returned - Calling getReturnedForUploader with userId:', req.user.id);
    const returnedQuestions = await QuestionModel.getReturnedForUploader(req.user.id);
    console.log('✅ /my-returned - Found', returnedQuestions.length, 'returned questions');
    res.json(returnedQuestions);
  } catch (error) {
    console.error('❌ /my-returned - Error fetching returned questions:', error);
    console.error('❌ /my-returned - Error stack:', (error as Error).stack);
    res.status(500).json({ error: 'Failed to fetch returned questions' });
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
    
    // Hide returned questions from users who didn't upload them
    const user = (req as any).user;
    if (question.review_status === 'returned' || question.review_status === 'rejected') {
      if (!user || question.uploaded_by !== user.id) {
        return res.status(404).json({ error: 'Question not found' });
      }
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
    
    // Set exam category and type from user
    const user = (req as any).user;
    if (user) {
      questionData.exam_category = user.exam_category;
      questionData.exam_type = user.exam_type;
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

// Delete a question and its associated image descriptions (admin only)
router.delete('/:id/with-images', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const id = parseInt(req.params.id);
    const deleted = await QuestionModel.deleteWithImages(id);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Question not found' });
    }
    
    res.json({ message: 'Question and associated image descriptions deleted successfully' });
  } catch (error) {
    console.error('Error deleting question with images:', error);
    res.status(500).json({ error: 'Failed to delete question and associated data' });
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
    
    // Read the entire file first to detect if it has headers
    const fileContent = fs.readFileSync(req.file.path, 'utf-8');
    const lines = fileContent.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'CSV file is empty' });
    }
    
    // Check if first line looks like a header
    const firstLine = lines[0];
    // A header line typically contains these keywords and doesn't start with a number
    const lowerFirst = firstLine.toLowerCase();
    const hasHeader = (lowerFirst.includes('question') && 
                      lowerFirst.includes('choice') &&
                      lowerFirst.includes('correct_answer')) ||
                     (lowerFirst.includes('question_number') && 
                      lowerFirst.includes('question'));
    
    // Additional check: if first field is a number, it's probably NOT a header
    const firstField = firstLine.split(',')[0].trim();
    const startsWithNumber = /^\d+$/.test(firstField) || /^"\d+"$/.test(firstField);
    
    const isHeader = hasHeader && !startsWithNumber;
    
    console.log('CSV upload: First line:', firstLine.substring(0, 100));
    console.log('CSV upload: First field:', firstField);
    console.log('CSV upload: Starts with number:', startsWithNumber);
    console.log('CSV upload: Detected header:', isHeader);
    
    // If has header, use csv-parser; otherwise, parse manually
    if (isHeader) {
      // Parse with headers using csv-parser
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
              echo_view: standardizeEchoView(row.image_view || ''),
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
    } else {
      // Parse without headers - assume standard column order
      // Column order: question_number, question, choice_a, choice_b, choice_c, choice_d, choice_e, correct_answer, explanation, source_folder
      // Additional image columns if present: image_description, image_modality, image_view, image_usage, image_type, image_url
      
      const parseCSVLine = (line: string): string[] => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          const nextChar = line[i + 1];
          
          if (char === '"') {
            if (inQuotes && nextChar === '"') {
              // Escaped quote
              current += '"';
              i++; // Skip next quote
            } else {
              // Toggle quote mode
              inQuotes = !inQuotes;
            }
          } else if (char === ',' && !inQuotes) {
            // End of field
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        
        // Add last field
        result.push(current.trim());
        return result;
      };
      
      // Process each line as a data row
      for (const line of lines) {
        const columns = parseCSVLine(line);
        
        console.log(`Processing line with ${columns.length} columns:`, columns.slice(0, 3).join(' | '));
        
        // Skip if line doesn't have enough columns
        if (columns.length < 8) {
          console.log('Skipping line - not enough columns');
          continue;
        }
        
        // Map columns to question fields (adjusted for 0-based index)
        // Expecting: question_number(0), question(1), choice_a(2), choice_b(3), choice_c(4), choice_d(5), choice_e(6), correct_answer(7), explanation(8), source_folder(9)
        const question: Omit<Question, 'id' | 'created_at' | 'updated_at' | 'question_number'> = {
          question: columns[1] || '',
          choice_a: columns[2] || '',
          choice_b: columns[3] || '',
          choice_c: columns[4] || '',
          choice_d: columns[5] || '',
          choice_e: columns[6] || '',
          choice_f: columns[7] || '', // This might be correct_answer if no choice_f
          choice_g: '', // Usually not present in standard format
          correct_answer: columns[7] || columns[8] || '', // Could be at position 7 or 8 depending on number of choices
          explanation: columns[8] || columns[9] || '',
          source_folder: columns[9] || columns[10] || '',
          uploaded_by: req.user?.id
        };
        
        // Adjust for cases where there are fewer choice columns
        // If column 7 is a single letter (A-G), it's likely the correct_answer
        if (columns[7] && columns[7].length === 1 && ['A', 'B', 'C', 'D', 'E', 'F', 'G'].includes(columns[7])) {
          question.correct_answer = columns[7];
          question.choice_f = '';
          question.choice_g = '';
          question.explanation = columns[8] || '';
          question.source_folder = columns[9] || '';
        }
        
        // Handle image descriptions if present (columns 10-15)
        if (columns.length > 10 && (columns[10] || columns[11] || columns[12])) {
          const validModalities = ['transthoracic', 'transesophageal', 'non-echo'];
          const validUsageTypes = ['question', 'explanation'];
          const validImageTypes = ['still', 'cine'];
          
          const modality = columns[11]?.toLowerCase();
          const usageType = columns[13]?.toLowerCase();
          const imageType = columns[14]?.toLowerCase();
          
          const imageDesc = {
            description: columns[10] || '',
            modality: validModalities.includes(modality) ? modality : null,
            echo_view: standardizeEchoView(columns[12] || ''),
            usage_type: validUsageTypes.includes(usageType) ? usageType : 'question',
            image_type: validImageTypes.includes(imageType) ? imageType : 'still',
            questionIndex: questions.length
          };
          imageDescriptions.push(imageDesc);
          
          question.review_status = 'returned';
          question.review_notes = 'Question needs image to be uploaded before review';
        } else {
          question.review_status = 'pending';
        }
        
        // Validate required fields
        if (question.question && question.correct_answer && 
            ['A', 'B', 'C', 'D', 'E', 'F', 'G'].includes(question.correct_answer)) {
          console.log(`Adding question: "${question.question.substring(0, 50)}..." with answer ${question.correct_answer}`);
          questions.push(question);
        } else {
          console.log('Skipping invalid question:', {
            hasQuestion: !!question.question,
            correctAnswer: question.correct_answer,
            isValidAnswer: ['A', 'B', 'C', 'D', 'E', 'F', 'G'].includes(question.correct_answer)
          });
        }
      }
    }
    
    console.log(`Total questions parsed: ${questions.length}`);

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

    // Associate all questions with this batch and user's exam settings
    const user = (req as any).user;
    questions.forEach(question => {
      question.batch_id = batch.id;
      // Add exam category and type from the user
      question.exam_category = user?.exam_category || 'echocardiography';
      question.exam_type = user?.exam_type || 'NBE';
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
    console.log('User exam preferences:', req.user?.exam_category, req.user?.exam_type);
    
    if (!req.user.is_reviewer && !req.user.is_admin) {
      console.log('Access denied - user is not reviewer or admin');
      return res.status(403).json({ error: 'Reviewer access required' });
    }

    // Filter by reviewer's exam preferences
    const questions = await QuestionModel.getPendingReview(req.user.exam_category, req.user.exam_type);
    console.log('Found pending questions for', req.user.exam_category, req.user.exam_type, ':', questions.length);
    console.log('Questions:', questions.map(q => ({ id: q.id, exam_category: q.exam_category, exam_type: q.exam_type, question: q.question.substring(0, 50) + '...' })));
    
    res.json({ questions });
  } catch (error) {
    console.error('Error fetching pending questions:', error);
    res.status(500).json({ error: 'Failed to fetch pending questions' });
  }
});

// Get questions by review status
// - Anyone can get approved questions (for practice)
// - Only reviewers/admins can get pending, rejected, or returned questions
router.get('/review/status/:status', requireAuth, async (req: Request, res: Response) => {
  try {
    const status = req.params.status as 'pending' | 'approved' | 'rejected' | 'returned';
    if (!['pending', 'approved', 'rejected', 'returned'].includes(status)) {
      return res.status(400).json({ error: 'Invalid review status' });
    }

    // Only reviewers/admins can access non-approved questions
    if (status !== 'approved' && !req.user.is_reviewer && !req.user.is_admin) {
      return res.status(403).json({ error: 'Reviewer access required for non-approved questions' });
    }

    // Get user's exam category and type for filtering
    const user = (req as any).user;
    const examCategory = user?.exam_category || 'echocardiography';
    const examType = user?.exam_type || 'eacvi_toe';
    
    console.log(`Getting ${status} questions for user:`, user?.username, 'exam:', examCategory, examType);

    const questions = await QuestionModel.getByReviewStatus(status, examCategory, examType);
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
    const { status, notes, difficulty_rating } = req.body;

    if (!['approved', 'rejected', 'returned'].includes(status)) {
      return res.status(400).json({ error: 'Invalid review status. Must be: approved, rejected, or returned' });
    }

    if ((status === 'rejected' || status === 'returned') && !notes?.trim()) {
      return res.status(400).json({ error: 'Review notes are required for rejected or returned questions' });
    }

    // Validate difficulty rating if provided
    if (difficulty_rating !== undefined && difficulty_rating !== null) {
      const rating = parseInt(difficulty_rating);
      if (isNaN(rating) || rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'Difficulty rating must be between 1 and 5' });
      }
    }

    const updatedQuestion = await QuestionModel.updateReviewStatus(
      questionId, 
      status, 
      notes || '', 
      req.user.id,
      difficulty_rating ? parseInt(difficulty_rating) : undefined
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

    // Get user's exam category and type for filtering
    const user = (req as any).user;
    const examCategory = user?.exam_category || 'echocardiography';
    const examType = user?.exam_type || 'eacvi_toe';
    
    console.log('Getting review stats for user:', user?.username, 'exam:', examCategory, examType);
    
    const stats = await QuestionModel.getReviewStats(examCategory, examType);
    res.json(stats);
  } catch (error) {
    console.error('Error fetching review stats:', error);
    res.status(500).json({ error: 'Failed to fetch review statistics' });
  }
});

export default router;