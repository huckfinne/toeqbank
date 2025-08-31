import { Router, Request, Response } from 'express';
import { optionalAuth } from '../middleware/auth';
import fetch from 'node-fetch';

const router = Router();

// Apply optional authentication
router.use(optionalAuth);

const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

interface AssignExamsRequest {
  question: string;
  choice_a?: string;
  choice_b?: string;
  choice_c?: string;
  choice_d?: string;
  choice_e?: string;
  correct_answer: string;
  explanation?: string;
  imageCount?: number;
}

interface SubtopicWithSection {
  name: string;
  section: string;
}

interface ApplicableExam {
  examName: string;
  subtopics: SubtopicWithSection[];
  reasoning?: string;
}

// Exam topics structure with section numbers
const EXAM_TOPICS = {
  "PTEeXAM": {
    "1. Basic TEE": {
      "1.1": "TEE Probe Insertion and Safety",
      "1.2": "Basic TEE Views and Anatomy",
      "1.3": "Standard TEE Examination",
      "1.4": "TEE Equipment and Technology"
    },
    "2. Cardiac Anatomy and Physiology": {
      "2.1": "Chamber Assessment",
      "2.2": "Valvular Anatomy",
      "2.3": "Great Vessel Assessment",
      "2.4": "Congenital Heart Disease"
    },
    "3. Valvular Disease": {
      "3.1": "Mitral Valve Disease",
      "3.2": "Aortic Valve Disease",
      "3.3": "Tricuspid Valve Disease",
      "3.4": "Pulmonary Valve Disease",
      "3.5": "Prosthetic Valves"
    },
    "4. Hemodynamic Assessment": {
      "4.1": "Doppler Principles",
      "4.2": "Pressure Gradients",
      "4.3": "Cardiac Output Assessment",
      "4.4": "Diastolic Function"
    },
    "5. TEE in Cardiac Surgery": {
      "5.1": "Intraoperative TEE",
      "5.2": "Post-surgical Assessment",
      "5.3": "Surgical Planning"
    },
    "6. Advanced TEE Applications": {
      "6.1": "3D TEE",
      "6.2": "Strain Imaging",
      "6.3": "Contrast Enhancement",
      "6.4": "Interventional Guidance"
    }
  },
  "EACTVI": {
    "1. Basic Echocardiography": {
      "1.1": "Ultrasound Physics",
      "1.2": "Image Optimization",
      "1.3": "Standard Views",
      "1.4": "Doppler Techniques"
    },
    "2. Left Heart Assessment": {
      "2.1": "LV Function and Geometry",
      "2.2": "LA Assessment",
      "2.3": "Mitral Valve Evaluation",
      "2.4": "Aortic Valve Assessment"
    },
    "3. Right Heart Assessment": {
      "3.1": "RV Function Assessment",
      "3.2": "RA Evaluation",
      "3.3": "Tricuspid Valve Assessment",
      "3.4": "Pulmonary Assessment"
    },
    "4. Hemodynamics and Flow": {
      "4.1": "Pressure Measurements",
      "4.2": "Flow Quantification",
      "4.3": "Shunt Assessment",
      "4.4": "Valve Stenosis/Regurgitation"
    },
    "5. Advanced Techniques": {
      "5.1": "Tissue Doppler",
      "5.2": "Strain Echocardiography",
      "5.3": "3D Echocardiography",
      "5.4": "Contrast Echocardiography"
    },
    "6. Clinical Applications": {
      "6.1": "Heart Failure Assessment",
      "6.2": "Ischemic Heart Disease",
      "6.3": "Cardioembolic Source",
      "6.4": "Critical Care Echocardiography"
    }
  }
};

// Helper function to create a flat lookup of subtopics with their sections
function createSubtopicLookup() {
  const lookup: Record<string, Record<string, string>> = {};
  
  Object.entries(EXAM_TOPICS).forEach(([examName, categories]) => {
    lookup[examName] = {};
    Object.entries(categories).forEach(([categoryName, subtopics]) => {
      Object.entries(subtopics).forEach(([section, subtopicName]) => {
        lookup[examName][subtopicName as string] = section;
      });
    });
  });
  
  return lookup;
}

// Get all subtopic names for the prompt
function getSubtopicNamesForExam(examName: string): string[] {
  const subtopics: string[] = [];
  const categories = EXAM_TOPICS[examName as keyof typeof EXAM_TOPICS];
  
  if (categories) {
    Object.values(categories).forEach(subtopicsObj => {
      const subtopicValues = Object.values(subtopicsObj as Record<string, string>);
      subtopics.push(...subtopicValues);
    });
  }
  
  return subtopics;
}

// Assign applicable exams for a question using Claude API
router.post('/assign', async (req: Request, res: Response) => {
  try {
    const questionData: AssignExamsRequest = req.body;

    if (!questionData.question || !questionData.correct_answer) {
      return res.status(400).json({ error: 'Question and correct_answer are required' });
    }

    let applicableExams: ApplicableExam[];

    if (CLAUDE_API_KEY) {
      // Use Claude API
      applicableExams = await assignExamsWithClaude(questionData);
    } else {
      // Fallback to basic assignment
      applicableExams = assignFallbackExams(questionData);
    }

    res.json(applicableExams);
  } catch (error) {
    console.error('Error assigning exams:', error);
    
    // Return fallback exam assignments if Claude API fails
    const fallbackExams = assignFallbackExams(req.body);
    res.json(fallbackExams);
  }
});

async function assignExamsWithClaude(questionData: AssignExamsRequest): Promise<ApplicableExam[]> {
  // Build context about the question
  let questionContext = `Question: ${questionData.question}\n\n`;
  
  if (questionData.choice_a) questionContext += `A) ${questionData.choice_a}\n`;
  if (questionData.choice_b) questionContext += `B) ${questionData.choice_b}\n`;
  if (questionData.choice_c) questionContext += `C) ${questionData.choice_c}\n`;
  if (questionData.choice_d) questionContext += `D) ${questionData.choice_d}\n`;
  if (questionData.choice_e) questionContext += `E) ${questionData.choice_e}\n`;
  
  questionContext += `\nCorrect Answer: ${questionData.correct_answer}\n`;
  
  if (questionData.explanation) {
    questionContext += `\nExplanation: ${questionData.explanation}\n`;
  }

  if (questionData.imageCount && questionData.imageCount > 0) {
    questionContext += `\nThis question includes ${questionData.imageCount} image(s) that are relevant to the medical context.\n`;
  }

  const examTopicsText = JSON.stringify(EXAM_TOPICS, null, 2);

  const prompt = `You are an expert in echocardiography and TEE education who specializes in exam curriculum mapping.

Analyze the following TEE/echocardiography question and assign it to appropriate exam syllabi with specific subtopics:

${questionContext}

Available Exam Syllabi:
${examTopicsText}

Based on this question's content, determine which exams (PTEeXAM and/or EACTVI) this question is suitable for and identify the specific subtopics within each exam that this question addresses.

Most questions will be applicable to BOTH exams but may map to different subtopic areas within each syllabus.

Provide your response in the following JSON format:

[
  {
    "examName": "PTEeXAM",
    "subtopics": ["specific subtopic 1", "specific subtopic 2"],
    "reasoning": "Brief explanation of why this question fits these subtopics"
  },
  {
    "examName": "EACTVI", 
    "subtopics": ["specific subtopic 1", "specific subtopic 2"],
    "reasoning": "Brief explanation of why this question fits these subtopics"
  }
]

Guidelines:
- Only include exams where the question is truly relevant
- Select 1-3 most relevant subtopics per exam (be specific, don't overassign)
- Subtopics must exactly match those listed in the exam syllabi (use the exact text, not the section numbers)
- Provide brief reasoning for each exam assignment
- Focus on the core concepts being tested in the question
- Consider both the question content AND the explanation when making assignments

Respond only with the JSON array, no additional text.`;

  const response = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': CLAUDE_API_KEY!,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as any;
  const responseText = data.content[0].text;
  
  // Extract JSON if it's wrapped in other text
  let jsonStr = responseText.trim();
  const jsonMatch = responseText.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    jsonStr = jsonMatch[0];
  }
  
  const applicableExams = JSON.parse(jsonStr);
  
  // Validate the response structure
  if (!Array.isArray(applicableExams)) {
    throw new Error('Invalid response format from Claude API');
  }
  
  const subtopicLookup = createSubtopicLookup();
  
  return applicableExams.map((exam: any) => ({
    examName: exam.examName || 'Unknown',
    subtopics: Array.isArray(exam.subtopics) 
      ? exam.subtopics.map((subtopic: string) => ({
          name: subtopic,
          section: subtopicLookup[exam.examName]?.[subtopic] || 'Unknown'
        }))
      : [],
    reasoning: exam.reasoning || ''
  }));
}

function assignFallbackExams(questionData: AssignExamsRequest): ApplicableExam[] {
  const questionText = questionData.question.toLowerCase();
  const explanationText = questionData.explanation?.toLowerCase() || '';
  const fullText = `${questionText} ${explanationText}`;
  
  const applicableExams: ApplicableExam[] = [];
  const subtopicLookup = createSubtopicLookup();
  
  // Default assignments based on keywords
  let pteexamSubtopics: string[] = [];
  let eactviSubtopics: string[] = [];
  
  // TEE-specific content
  if (fullText.includes('tee') || fullText.includes('transesophageal') || fullText.includes('probe')) {
    pteexamSubtopics.push('Basic TEE Views and Anatomy');
    eactviSubtopics.push('Standard Views');
  }
  
  // Valve-related content
  if (fullText.includes('mitral') || fullText.includes('valve')) {
    pteexamSubtopics.push('Mitral Valve Disease');
    eactviSubtopics.push('Mitral Valve Evaluation');
  }
  
  if (fullText.includes('aortic')) {
    pteexamSubtopics.push('Aortic Valve Disease');
    eactviSubtopics.push('Aortic Valve Assessment');
  }
  
  // Doppler/hemodynamics
  if (fullText.includes('doppler') || fullText.includes('gradient') || fullText.includes('flow')) {
    pteexamSubtopics.push('Doppler Principles');
    eactviSubtopics.push('Doppler Techniques');
  }
  
  // LV function
  if (fullText.includes('left ventricle') || fullText.includes('lv') || fullText.includes('systolic')) {
    pteexamSubtopics.push('Chamber Assessment');
    eactviSubtopics.push('LV Function and Geometry');
  }
  
  // Default to basic topics if nothing specific found
  if (pteexamSubtopics.length === 0) {
    pteexamSubtopics.push('Standard TEE Examination');
  }
  
  if (eactviSubtopics.length === 0) {
    eactviSubtopics.push('Standard Views');
  }
  
  // Add PTEeXAM
  applicableExams.push({
    examName: 'PTEeXAM',
    subtopics: Array.from(new Set(pteexamSubtopics)).slice(0, 3).map(subtopic => ({
      name: subtopic,
      section: subtopicLookup['PTEeXAM']?.[subtopic] || 'Unknown'
    })),
    reasoning: 'Assigned based on TEE/echocardiography content analysis'
  });
  
  // Add EACTVI
  applicableExams.push({
    examName: 'EACTVI',
    subtopics: Array.from(new Set(eactviSubtopics)).slice(0, 3).map(subtopic => ({
      name: subtopic,
      section: subtopicLookup['EACTVI']?.[subtopic] || 'Unknown'
    })),
    reasoning: 'Assigned based on echocardiography principles and techniques'
  });
  
  return applicableExams;
}

export default router;