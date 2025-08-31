import { Router, Request, Response } from 'express';
import { optionalAuth } from '../middleware/auth';
import fetch from 'node-fetch';

const router = Router();

// Apply optional authentication
router.use(optionalAuth);

const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

interface GenerateMetadataRequest {
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

interface GeneratedMetadata {
  difficulty: string;
  category: string;
  topic: string;
  keywords: string[];
  questionType: string;
  view?: string;
  majorStructures: string[];
  minorStructures: string[];
  modalities: string[];
}

// Generate metadata for a question using Claude API
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const questionData: GenerateMetadataRequest = req.body;

    if (!questionData.question || !questionData.correct_answer) {
      return res.status(400).json({ error: 'Question and correct_answer are required' });
    }

    let metadata: GeneratedMetadata;

    if (CLAUDE_API_KEY) {
      // Use Claude API
      metadata = await generateMetadataWithClaude(questionData);
    } else {
      // Fallback to basic analysis
      metadata = generateFallbackMetadata(questionData);
    }

    res.json(metadata);
  } catch (error) {
    console.error('Error generating metadata:', error);
    
    // Return fallback metadata if Claude API fails
    const fallbackMetadata = generateFallbackMetadata(req.body);
    res.json(fallbackMetadata);
  }
});

async function generateMetadataWithClaude(questionData: GenerateMetadataRequest): Promise<GeneratedMetadata> {
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

  const prompt = `You are a board-certified cardiologist and expert in Transesophageal Echocardiography (TEE) who specializes in medical education and examination systems.

Analyze the following TEE/echocardiography exam question and generate ONLY echocardiography-specific metadata:

${questionContext}

Based on this question, provide metadata focused EXCLUSIVELY on echocardiography concepts in the following JSON format:

{
  "difficulty": "Beginner|Intermediate|Advanced",
  "category": "Transthoracic Echocardiography (TTE)|Transesophageal Echocardiography (TEE/TOE)",
  "topic": "Specific TEE/echo topic", 
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "questionType": "Multiple Choice|Short Answer|Essay|Fill-in-the-Blank|Matching|True/False|Constructed Response|Performance Tasks|Grid-in|Student-Produced Response|Authentic Assessment|Free Response",
  "view": "TEE view name (if applicable)",
  "majorStructures": ["major cardiac structure1", "major cardiac structure2"],
  "minorStructures": ["minor cardiac structure1", "minor cardiac structure2"],
  "modalities": ["imaging modality1", "imaging modality2"]
}

STRICT Guidelines for echocardiography focus:
- Difficulty: Based on TEE/echo complexity (Basic TEE concepts = Beginner, Advanced pathophysiology = Advanced)
- Category: Must be either "Transthoracic Echocardiography (TTE)" or "Transesophageal Echocardiography (TEE/TOE)" based on the imaging approach used in the question
- Topic: Specific echo areas ONLY (e.g., "Mitral Valve TEE Assessment", "Left Atrial Appendage Imaging", "Aortic Stenosis Quantification", "Pulmonary Vein Assessment", "Intracardiac Shunts")
- Keywords: ONLY specific echocardiography terms as separate array items (e.g., ["Transgastric View", "Color Doppler", "LVOT", "Mitral Regurgitation"]). Each keyword must be a separate string in the array. Do NOT include general terms like "TEE", "TTE", or "TOE" as keywords.
- Question type: Identify the ANSWER FORMAT based on how the student responds. If choices A, B, C, D, E are provided, it's "Multiple Choice". Look for answer format indicators like: fill-in blanks (__), true/false options, essay prompts, matching columns, constructed response requirements, etc. Multiple Choice takes precedence over content-based classifications.
- View: TEE view name if question involves specific imaging planes (e.g., "Midesophageal Four-Chamber", "Transgastric Short Axis", "Upper Esophageal Aortic Arch", "Deep Transgastric Long Axis"). Leave empty if not view-specific.
- Major Structures: Primary cardiac structures discussed (e.g., ["Left Ventricle", "Mitral Valve", "Aorta", "Left Atrium", "Right Ventricle", "Tricuspid Valve", "Pulmonary Artery"])
- Minor Structures: Secondary cardiac structures or detailed components (e.g., ["LVOT", "Chordae Tendineae", "Papillary Muscles", "Coronary Sinus", "Pulmonary Veins", "Interatrial Septum"])
- Modalities: Imaging techniques used (e.g., ["2D Imaging", "Color Doppler", "Spectral Doppler", "Tissue Doppler", "3D Echo", "Contrast Echo"])

Do NOT include general cardiology, internal medicine, or non-echo specific terms. Focus ONLY on echocardiography concepts, techniques, views, measurements, and pathology assessment.

Respond only with the JSON object, no additional text.`;

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
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    jsonStr = jsonMatch[0];
  }
  
  const metadata = JSON.parse(jsonStr);
  
  // Validate and return the metadata
  let keywords: string[] = [];
  if (Array.isArray(metadata.keywords)) {
    keywords = metadata.keywords;
  } else if (typeof metadata.keywords === 'string') {
    keywords = metadata.keywords.split(/[,;]/).map((k: string) => k.trim()).filter((k: string) => k.length > 0);
  }

  let majorStructures: string[] = [];
  if (Array.isArray(metadata.majorStructures)) {
    majorStructures = metadata.majorStructures;
  }

  let minorStructures: string[] = [];
  if (Array.isArray(metadata.minorStructures)) {
    minorStructures = metadata.minorStructures;
  }

  let modalities: string[] = [];
  if (Array.isArray(metadata.modalities)) {
    modalities = metadata.modalities;
  }
  
  return {
    difficulty: metadata.difficulty || 'Intermediate',
    category: metadata.category || '2D Echocardiography',
    topic: metadata.topic || 'General TEE Assessment',
    keywords: keywords,
    questionType: metadata.questionType || 'Multiple Choice',
    view: metadata.view || undefined,
    majorStructures: majorStructures,
    minorStructures: minorStructures,
    modalities: modalities
  };
}

function generateFallbackMetadata(questionData: GenerateMetadataRequest): GeneratedMetadata {
  const questionText = questionData.question.toLowerCase();
  const explanationText = questionData.explanation?.toLowerCase() || '';
  
  // Echocardiography-specific keyword extraction (excluding general terms)
  const keywords: string[] = [];
  const echoTerms = [
    'transesophageal', 'echocardiography', 'echo', 
    'doppler', 'color doppler', 'pulsed doppler', 'continuous wave',
    'mitral valve', 'aortic valve', 'tricuspid valve', 'pulmonary valve',
    'left ventricle', 'right ventricle', 'left atrium', 'right atrium',
    'lvot', 'rvot', 'la appendage', 'transgastric', 'midesophageal',
    'stenosis', 'regurgitation', 'prolapse', 'vegetation',
    'strain', 'tissue doppler', 'e/a ratio', 'deceleration time',
    'pulmonary vein', 'shunt', 'pfo', 'asd', 'vsd'
  ];
  
  echoTerms.forEach(term => {
    if (questionText.includes(term) || explanationText.includes(term)) {
      let formattedTerm;
      if (term.includes('/')) {
        formattedTerm = term.toUpperCase();
      } else {
        formattedTerm = term.split(' ').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
      }
      keywords.push(formattedTerm);
    }
  });
  
  // Filter out general terms and limit to 5 keywords
  let selectedKeywords = Array.from(new Set(keywords))
    .filter(keyword => !['TEE', 'TTE', 'TOE', 'Tee', 'Tte', 'Toe'].includes(keyword))
    .slice(0, 5);
    
  if (selectedKeywords.length === 0) {
    selectedKeywords.push('Echocardiography');
  }
  
  // Determine question type based on answer format
  let questionType = 'Multiple Choice'; // Default for TOE exams
  
  // Check if it has multiple choice options
  if (questionData.choice_a || questionData.choice_b || questionData.choice_c || questionData.choice_d || questionData.choice_e) {
    questionType = 'Multiple Choice';
  } else if (questionText.includes('true or false') || questionText.includes('t/f')) {
    questionType = 'True/False';
  } else if (questionText.includes('fill in') || questionText.includes('____') || questionText.includes('blank')) {
    questionType = 'Fill-in-the-Blank';
  } else if (questionText.includes('essay') || questionText.includes('explain in detail') || questionText.includes('discuss')) {
    questionType = 'Essay';
  } else if (questionText.includes('short answer') || questionText.includes('briefly')) {
    questionType = 'Short Answer';
  } else if (questionText.includes('match') && questionText.includes('column')) {
    questionType = 'Matching';
  }
  
  // Determine category based on imaging approach
  let category = 'Transesophageal Echocardiography (TEE/TOE)'; // Default for TOE questions
  
  if (questionText.includes('transthoracic') || questionText.includes('tte') || 
      questionText.includes('surface echo') || questionText.includes('chest wall')) {
    category = 'Transthoracic Echocardiography (TTE)';
  } else if (questionText.includes('transesophageal') || questionText.includes('tee') || 
             questionText.includes('toe') || questionText.includes('esophageal') ||
             questionText.includes('probe')) {
    category = 'Transesophageal Echocardiography (TEE/TOE)';
  }
  
  // Determine topic based on content
  let topic = 'General TEE Assessment';
  let view = undefined;
  
  if (questionText.includes('doppler')) {
    topic = 'Doppler Evaluation';
  } else if (questionText.includes('valve')) {
    topic = 'Valve Evaluation';
  } else if (questionText.includes('view') || questionText.includes('imaging')) {
    topic = 'TEE Imaging Planes';
  }

  // Detect TEE view if mentioned
  if (questionText.includes('midesophageal')) {
    view = 'Midesophageal View';
  } else if (questionText.includes('transgastric')) {
    view = 'Transgastric View';
  } else if (questionText.includes('upper esophageal')) {
    view = 'Upper Esophageal View';
  }

  // Detect major structures
  const majorStructures: string[] = [];
  const majorStructureTerms = [
    'left ventricle', 'right ventricle', 'left atrium', 'right atrium',
    'mitral valve', 'aortic valve', 'tricuspid valve', 'pulmonary valve',
    'aorta', 'pulmonary artery'
  ];
  
  majorStructureTerms.forEach(term => {
    if (questionText.includes(term) || explanationText.includes(term)) {
      majorStructures.push(term.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' '));
    }
  });

  // Detect minor structures
  const minorStructures: string[] = [];
  const minorStructureTerms = [
    'lvot', 'rvot', 'chordae', 'papillary muscle', 'coronary sinus',
    'pulmonary vein', 'interatrial septum', 'interventricular septum'
  ];
  
  minorStructureTerms.forEach(term => {
    if (questionText.includes(term) || explanationText.includes(term)) {
      minorStructures.push(term.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' '));
    }
  });

  // Detect modalities
  const modalities: string[] = [];
  const modalityTerms = [
    '2d', 'color doppler', 'spectral doppler', 'tissue doppler',
    '3d', 'contrast'
  ];
  
  modalityTerms.forEach(term => {
    if (questionText.includes(term) || explanationText.includes(term)) {
      if (term === '2d') {
        modalities.push('2D Imaging');
      } else if (term === '3d') {
        modalities.push('3D Echo');
      } else {
        modalities.push(term.split(' ').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' '));
      }
    }
  });

  // Ensure at least one modality
  if (modalities.length === 0) {
    modalities.push('2D Imaging');
  }
  
  return {
    difficulty: 'Intermediate',
    category: category,
    topic: topic,
    keywords: selectedKeywords,
    questionType: questionType,
    view: view,
    majorStructures: Array.from(new Set(majorStructures)).slice(0, 3),
    minorStructures: Array.from(new Set(minorStructures)).slice(0, 3),
    modalities: Array.from(new Set(modalities))
  };
}

export default router;