import { Question, SubtopicWithSection } from './api';
import { getApiBaseUrl } from '../config/api.config';

const API_BASE_URL = getApiBaseUrl();

export interface ApplicableExam {
  examName: string;
  subtopics: SubtopicWithSection[];
  reasoning?: string;
}

export class ExamApiService {
  static async assignExams(question: Question): Promise<ApplicableExam[]> {
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

    const response = await fetch(`${API_BASE_URL}/exams/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`Exam API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }
}

export default ExamApiService;