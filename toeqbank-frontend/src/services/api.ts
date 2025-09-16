import axios from 'axios';
import { API_BASE_URL } from '../config/api.config';

console.log('🔧 API service - baseURL:', API_BASE_URL);

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include the auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    console.log('🔑 Request interceptor - token exists:', !!token);
    console.log('🌐 Request URL:', config.url);
    console.log('🏠 Request baseURL:', config.baseURL);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('✅ Added auth header');
    } else {
      console.log('❌ No auth token found');
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

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
  review_status?: 'pending' | 'approved' | 'rejected' | 'returned';
  review_notes?: string;
  reviewed_by?: number;
  reviewed_at?: string;
  created_at?: string;
  updated_at?: string;
  images?: Image[];
}

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

export interface ImagesResponse {
  images: Image[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
}

export interface QuestionsResponse {
  questions: Question[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export const questionService = {
  // Get all questions with pagination
  getQuestions: async (limit = 50, offset = 0): Promise<QuestionsResponse> => {
    const response = await api.get(`/questions?limit=${limit}&offset=${offset}`);
    return response.data;
  },

  // Get question by ID
  getQuestion: async (id: number): Promise<Question> => {
    const response = await api.get(`/questions/${id}`);
    return response.data;
  },

  // Create new question
  createQuestion: async (question: Omit<Question, 'id' | 'created_at' | 'updated_at'>): Promise<Question> => {
    const response = await api.post('/questions', question);
    return response.data;
  },

  // Update question
  updateQuestion: async (id: number, question: Partial<Question>): Promise<Question> => {
    const response = await api.put(`/questions/${id}`, question);
    return response.data;
  },

  // Delete question
  deleteQuestion: async (id: number): Promise<void> => {
    await api.delete(`/questions/${id}`);
  },

  // Upload CSV file
  uploadCSV: async (file: File, withImages: boolean = false, sourceInfo?: {
    description: string;
    isbn?: string;
    startingPage?: string;
    endingPage?: string;
    chapter?: string;
  }): Promise<{ message: string; questions: Question[] }> => {
    const formData = new FormData();
    formData.append('csvFile', file);
    formData.append('withImages', String(withImages));
    
    if (sourceInfo) {
      formData.append('description', sourceInfo.description);
      if (sourceInfo.isbn) formData.append('isbn', sourceInfo.isbn);
      if (sourceInfo.startingPage) formData.append('startingPage', sourceInfo.startingPage);
      if (sourceInfo.endingPage) formData.append('endingPage', sourceInfo.endingPage);
      if (sourceInfo.chapter) formData.append('chapter', sourceInfo.chapter);
    }
    
    const response = await api.post('/questions/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Review system methods
  getPendingReview: async (): Promise<{ questions: Question[] }> => {
    const response = await api.get('/questions/review/pending');
    return response.data;
  },

  getReviewStats: async (): Promise<{ total: number; pending: number; approved: number; rejected: number; returned: number }> => {
    const response = await api.get('/questions/review/stats');
    return response.data;
  },

  updateReviewStatus: async (questionId: number, status: 'approved' | 'rejected' | 'returned', notes: string): Promise<{ message: string; question: Question }> => {
    const response = await api.post(`/questions/review/${questionId}`, { status, notes });
    return response.data;
  },

  getQuestionsByReviewStatus: async (status: 'pending' | 'approved' | 'rejected' | 'returned'): Promise<{ questions: Question[] }> => {
    const response = await api.get(`/questions/review/status/${status}`);
    return response.data;
  },

  // Get questions returned to current user for rework
  getMyReturnedQuestions: async (): Promise<any[]> => {
    const response = await api.get('/questions/my-returned');
    return response.data;
  },

  // Get all questions uploaded by current user
  getMyQuestions: async (): Promise<any[]> => {
    const response = await api.get('/questions/my-questions');
    return response.data;
  },
};

export const batchService = {
  // Get all upload batches (admin only)
  getAllBatches: async (): Promise<any[]> => {
    const response = await api.get('/questions/batches');
    return response.data;
  },

  // Get batch details (admin only)
  getBatchDetails: async (batchId: number): Promise<any> => {
    const response = await api.get(`/questions/batches/${batchId}`);
    return response.data;
  },

  // Delete entire batch (admin only)
  deleteBatch: async (batchId: number): Promise<any> => {
    const response = await api.delete(`/questions/batches/${batchId}`);
    return response.data;
  },
};

export const imageService = {
  // Get all images with pagination and filtering
  getImages: async (params?: {
    limit?: number;
    offset?: number;
    type?: 'still' | 'cine';
    license?: LicenseType;
    tags?: string;
  }): Promise<ImagesResponse> => {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());
    if (params?.type) searchParams.set('type', params.type);
    if (params?.license) searchParams.set('license', params.license);
    if (params?.tags) searchParams.set('tags', params.tags);
    
    const response = await api.get(`/images?${searchParams.toString()}`);
    return response.data;
  },

  // Get image by ID
  getImage: async (id: number): Promise<Image> => {
    const response = await api.get(`/images/${id}`);
    return response.data;
  },

  // Upload image (file or URL)
  uploadImage: async (file: File | null, metadata: {
    description?: string;
    tags?: string[];
    image_type?: 'still' | 'cine';
    license?: LicenseType;
    license_details?: string;
    source_url?: string;
    modality?: string;
    echo_view?: string;
    usage_type?: 'question' | 'explanation';
  }): Promise<Image> => {
    // If there's a source_url, use URL upload
    if (metadata.source_url) {
      const response = await api.post('/images/upload-url', {
        url: metadata.source_url,
        description: metadata.description,
        tags: metadata.tags,
        image_type: metadata.image_type,
        license: metadata.license,
        license_details: metadata.license_details,
        source_url: metadata.source_url,
        modality: metadata.modality,
        echo_view: metadata.echo_view,
        usage_type: metadata.usage_type
      });
      return response.data;
    }
    
    // Otherwise use file upload
    if (!file) {
      throw new Error('Either file or source_url must be provided');
    }
    
    const formData = new FormData();
    formData.append('image', file);
    if (metadata.description) formData.append('description', metadata.description);
    if (metadata.tags) formData.append('tags', metadata.tags.join(','));
    if (metadata.image_type) formData.append('image_type', metadata.image_type);
    if (metadata.license) formData.append('license', metadata.license);
    if (metadata.license_details) formData.append('license_details', metadata.license_details);
    if (metadata.source_url) formData.append('source_url', metadata.source_url);
    if (metadata.modality) formData.append('modality', metadata.modality);
    if (metadata.echo_view) formData.append('echo_view', metadata.echo_view);
    if (metadata.usage_type) formData.append('usage_type', metadata.usage_type);
    
    const response = await api.post('/images/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Update image
  updateImage: async (id: number, data: {
    description?: string;
    tags?: string[];
    image_type?: 'still' | 'cine';
    license?: LicenseType;
    license_details?: string;
  }): Promise<Image> => {
    const response = await api.put(`/images/${id}`, data);
    return response.data;
  },

  // Delete image
  deleteImage: async (id: number): Promise<void> => {
    await api.delete(`/images/${id}`);
  },


  // Associate image with question
  associateWithQuestion: async (imageId: number, questionId: number, displayOrder = 1, usageType: 'question' | 'explanation' = 'question'): Promise<void> => {
    await api.post(`/images/${imageId}/associate/${questionId}`, { 
      display_order: displayOrder,
      usage_type: usageType 
    });
  },

  // Update image usage type (question vs explanation)
  updateImageUsage: async (imageId: number, questionId: number, usageType: 'question' | 'explanation'): Promise<void> => {
    await api.put(`/images/${imageId}/usage/${questionId}`, { usage_type: usageType });
  },

  // Remove image from question
  removeFromQuestion: async (imageId: number, questionId: number): Promise<void> => {
    await api.delete(`/images/${imageId}/associate/${questionId}`);
  },

  // Get questions for an image
  getQuestionsForImage: async (imageId: number): Promise<Question[]> => {
    const response = await api.get(`/images/${imageId}/questions`);
    return response.data;
  },

  // Get images for a question
  getImagesForQuestion: async (questionId: number): Promise<Image[]> => {
    const response = await api.get(`/questions/${questionId}/images`);
    return response.data;
  },

  // Get image file URL
  getImageUrl: (filename: string): string => {
    // Check if this is already a full URL (from DigitalOcean Spaces)
    if (filename.startsWith('http://') || filename.startsWith('https://')) {
      // If it's a Spaces URL, return it directly (no proxy needed)
      if (filename.includes('digitaloceanspaces.com')) {
        return filename;
      }
      // For other external URLs, use proxy to avoid CORS issues
      return `${API_BASE_URL}/images/proxy?url=${encodeURIComponent(filename)}`;
    }
    // Local images use direct serving
    return `${API_BASE_URL}/images/serve/${filename}`;
  },

  // Get license information
  getLicenseInfo: (license: LicenseType): { name: string; url?: string; requiresAttribution: boolean } => {
    const licenses = {
      'mit': { name: 'MIT License', url: 'https://opensource.org/licenses/MIT', requiresAttribution: true },
      'apache-2.0': { name: 'Apache License 2.0', url: 'https://opensource.org/licenses/Apache-2.0', requiresAttribution: true },
      'gpl-3.0': { name: 'GNU General Public License v3.0', url: 'https://opensource.org/licenses/GPL-3.0', requiresAttribution: true },
      'bsd-3-clause': { name: 'BSD 3-Clause License', url: 'https://opensource.org/licenses/BSD-3-Clause', requiresAttribution: true },
      'cc0-1.0': { name: 'Creative Commons Zero v1.0', url: 'https://creativecommons.org/publicdomain/zero/1.0/', requiresAttribution: false },
      'cc-by-4.0': { name: 'Creative Commons Attribution 4.0', url: 'https://creativecommons.org/licenses/by/4.0/', requiresAttribution: true },
      'cc-by-sa-3.0': { name: 'Creative Commons Attribution-Share Alike 3.0 Unported', url: 'https://creativecommons.org/licenses/by-sa/3.0/', requiresAttribution: true },
      'cc-by-sa-4.0': { name: 'Creative Commons Attribution-ShareAlike 4.0', url: 'https://creativecommons.org/licenses/by-sa/4.0/', requiresAttribution: true },
      'cc-by-nc-4.0': { name: 'Creative Commons Attribution-NonCommercial 4.0', url: 'https://creativecommons.org/licenses/by-nc/4.0/', requiresAttribution: true },
      'cc-by-nc-sa-4.0': { name: 'Creative Commons Attribution-NonCommercial-ShareAlike 4.0', url: 'https://creativecommons.org/licenses/by-nc-sa/4.0/', requiresAttribution: true },
      'copyright-borrowed': { name: 'Copyright Borrowed', requiresAttribution: true },
      'user-contributed': { name: 'User Contributed', requiresAttribution: false }
    };
    return licenses[license];
  },

  // Get all available license options
  getLicenseOptions: (): { value: LicenseType; label: string; category: string }[] => [
    // Open Source Licenses
    { value: 'mit', label: 'MIT License', category: 'Open Source' },
    { value: 'apache-2.0', label: 'Apache License 2.0', category: 'Open Source' },
    { value: 'gpl-3.0', label: 'GNU GPL v3.0', category: 'Open Source' },
    { value: 'bsd-3-clause', label: 'BSD 3-Clause', category: 'Open Source' },
    
    // Creative Commons
    { value: 'cc0-1.0', label: 'CC0 1.0 (Public Domain)', category: 'Creative Commons' },
    { value: 'cc-by-4.0', label: 'CC BY 4.0', category: 'Creative Commons' },
    { value: 'cc-by-sa-3.0', label: 'CC BY-SA 3.0 Unported', category: 'Creative Commons' },
    { value: 'cc-by-sa-4.0', label: 'CC BY-SA 4.0', category: 'Creative Commons' },
    { value: 'cc-by-nc-4.0', label: 'CC BY-NC 4.0', category: 'Creative Commons' },
    { value: 'cc-by-nc-sa-4.0', label: 'CC BY-NC-SA 4.0', category: 'Creative Commons' },
    
    // Special Categories
    { value: 'copyright-borrowed', label: 'Copyright Borrowed', category: 'Special' },
    { value: 'user-contributed', label: 'User Contributed', category: 'Special' },
  ],
};

export interface ImageDescription {
  id?: number;
  question_id: number;
  description: string;
  usage_type: 'question' | 'explanation';
  modality?: 'transthoracic' | 'transesophageal' | 'non-echo';
  echo_view?: string;
  image_type?: 'still' | 'cine';
  created_at?: string;
  updated_at?: string;
}

export interface QuestionMetadata {
  id?: number;
  question_id: number;
  difficulty?: string;
  category?: string;
  topic?: string;
  keywords?: string[];
  question_type?: string;
  view_type?: string;
  major_structures?: string[];
  minor_structures?: string[];
  modalities?: string[];
  created_at?: string;
  updated_at?: string;
}

export const questionMetadataService = {
  // Get metadata for a question
  getByQuestionId: async (questionId: number): Promise<QuestionMetadata> => {
    const response = await api.get(`/question-metadata/question/${questionId}`);
    return response.data;
  },

  // Create or update metadata for a question
  createOrUpdate: async (questionId: number, metadata: Partial<Omit<QuestionMetadata, 'id' | 'question_id' | 'created_at' | 'updated_at'>>): Promise<QuestionMetadata> => {
    const response = await api.post(`/question-metadata/question/${questionId}`, metadata);
    return response.data;
  },

  // Update metadata for a question
  update: async (questionId: number, metadata: Partial<Omit<QuestionMetadata, 'id' | 'question_id' | 'created_at' | 'updated_at'>>): Promise<QuestionMetadata> => {
    const response = await api.put(`/question-metadata/question/${questionId}`, metadata);
    return response.data;
  },

  // Delete metadata for a question
  delete: async (questionId: number): Promise<void> => {
    await api.delete(`/question-metadata/question/${questionId}`);
  },
};

export const imageDescriptionService = {
  // Get all image descriptions
  getAll: async (): Promise<ImageDescription[]> => {
    const response = await api.get('/image-descriptions');
    return response.data;
  },

  // Get all image descriptions for a question
  getByQuestionId: async (questionId: number, usageType?: 'question' | 'explanation'): Promise<ImageDescription[]> => {
    const params = new URLSearchParams();
    if (usageType) params.set('usage_type', usageType);
    
    const response = await api.get(`/image-descriptions/question/${questionId}?${params.toString()}`);
    return response.data;
  },

  // Get a single image description
  getById: async (id: number): Promise<ImageDescription> => {
    const response = await api.get(`/image-descriptions/${id}`);
    return response.data;
  },

  // Create a new image description
  create: async (imageDescription: Omit<ImageDescription, 'id' | 'created_at' | 'updated_at'>): Promise<ImageDescription> => {
    const response = await api.post('/image-descriptions', imageDescription);
    return response.data;
  },

  // Update an image description
  update: async (id: number, data: Partial<Pick<ImageDescription, 'description' | 'usage_type'>>): Promise<ImageDescription> => {
    const response = await api.put(`/image-descriptions/${id}`, data);
    return response.data;
  },

  // Delete an image description
  delete: async (id: number): Promise<void> => {
    await api.delete(`/image-descriptions/${id}`);
  },

  // Delete all image descriptions for a question
  deleteByQuestionId: async (questionId: number): Promise<{ success: boolean; deletedCount: number }> => {
    const response = await api.delete(`/image-descriptions/question/${questionId}`);
    return response.data;
  },
};

export interface SubtopicWithSection {
  name: string;
  section: string;
}

export interface ExamAssignment {
  examName: string;
  subtopics: SubtopicWithSection[];
  reasoning?: string;
}

export const examService = {
  // Assign applicable exams for a question using AI
  assignExams: async (questionData: {
    question: string;
    choice_a?: string;
    choice_b?: string;
    choice_c?: string;
    choice_d?: string;
    choice_e?: string;
    correct_answer: string;
    explanation?: string;
    imageCount?: number;
  }): Promise<ExamAssignment[]> => {
    const response = await api.post('/exams/assign', questionData);
    return response.data;
  },

  // Save exam assignments for a question
  saveExamAssignments: async (questionId: number, exams: ExamAssignment[]): Promise<void> => {
    await api.post(`/questions/${questionId}/exams`, { exams });
  },

  // Get exam assignments for a question
  getExamAssignments: async (questionId: number): Promise<ExamAssignment[]> => {
    const response = await api.get(`/questions/${questionId}/exams`);
    return response.data.exams;
  },
};

export interface ExamSession {
  id?: number;
  questions: Question[];
  config: {
    feedbackType: 'immediate' | 'end';
    numberOfQuestions: number;
  };
  startedAt: string;
  completedAt?: string;
}

export const examSessionService = {
  // Generate a new exam session
  generateExam: async (config: { feedbackType: 'immediate' | 'end'; numberOfQuestions: number }): Promise<ExamSession> => {
    // For now, we'll generate a mock exam session
    // In production, this would call a backend API to select questions
    const questionsResponse = await questionService.getQuestions(config.numberOfQuestions);
    
    // Shuffle questions to randomize order
    const shuffledQuestions = questionsResponse.questions.sort(() => Math.random() - 0.5);
    const selectedQuestions = shuffledQuestions.slice(0, config.numberOfQuestions);

    return {
      id: Date.now(), // Mock ID
      questions: selectedQuestions,
      config,
      startedAt: new Date().toISOString()
    };
  },

  // Submit exam results (placeholder)
  submitExam: async (sessionId: number, answers: Record<number, string>): Promise<{ score: number; results: any[] }> => {
    // Mock implementation
    console.log('Submitting exam:', { sessionId, answers });
    return {
      score: 0,
      results: []
    };
  }
};

export default api;