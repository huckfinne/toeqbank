export type LicenseType = 
  | 'mit' 
  | 'apache-2.0' 
  | 'gpl-3.0' 
  | 'bsd-3-clause' 
  | 'cc0-1.0' 
  | 'cc-by-4.0' 
  | 'cc-by-sa-3.0'
  | 'cc-by-sa-4.0' 
  | 'cc-by-nc-4.0' 
  | 'cc-by-nc-sa-4.0'
  | 'copyright-borrowed' 
  | 'user-contributed';

export interface Image {
  id?: number;
  filename: string;
  original_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  image_type: 'still' | 'cine';
  width?: number;
  height?: number;
  duration_seconds?: number;
  description?: string;
  tags?: string[];
  license: LicenseType;
  license_details?: string;
  created_at?: string;
  updated_at?: string;
  display_order?: number;
}

export interface Question {
  id?: number;
  question_number?: string;
  question: string;
  choice_a?: string;
  choice_b?: string;
  choice_c?: string;
  choice_d?: string;
  choice_e?: string;
  choice_f?: string;
  choice_g?: string;
  correct_answer: string;
  explanation?: string;
  source_folder?: string;
  created_at?: string;
  updated_at?: string;
  images?: Image[];
}

export interface UserAnswer {
  questionId: number;
  selectedAnswer: string;
  isCorrect: boolean;
  timeSpent: number;
}

export interface TestSession {
  id: string;
  questions: Question[];
  userAnswers: UserAnswer[];
  currentQuestionIndex: number;
  startTime: Date;
  isCompleted: boolean;
}

export interface TestResults {
  totalQuestions: number;
  correctAnswers: number;
  scorePercentage: number;
  timeSpent: number;
  questions: Question[];
  userAnswers: UserAnswer[];
}