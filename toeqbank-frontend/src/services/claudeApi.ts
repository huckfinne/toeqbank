import { Question } from './api';

export interface GeneratedMetadata {
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

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

export class ClaudeApiService {
  static async generateMetadata(question: Question): Promise<GeneratedMetadata> {
    const requestBody = {
      question: question.question,
      choice_a: question.choice_a,
      choice_b: question.choice_b,
      choice_c: question.choice_c,
      choice_d: question.choice_d,
      choice_e: question.choice_e,
      correct_answer: question.correct_answer,
      explanation: question.explanation,
      imageCount: question.images?.length || 0
    };

    const response = await fetch(`${API_BASE_URL}/metadata/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`Metadata API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }
}

export default ClaudeApiService;