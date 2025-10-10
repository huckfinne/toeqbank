import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { questionService } from '../services/api';

interface ReturnedQuestion {
  id: number;
  question_number: string;
  question: string;
  correct_answer: string;
  review_status: string;
  review_notes: string;
  reviewer_name: string;
  reviewed_at: string;
  created_at: string;
}

const MyReturnedQuestions: React.FC = () => {
  const [returnedQuestions, setReturnedQuestions] = useState<ReturnedQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadReturnedQuestions();
  }, []);

  const loadReturnedQuestions = async () => {
    try {
      setLoading(true);
      console.log('🔍 MyReturnedQuestions - Loading returned questions...');
      const questions = await questionService.getMyReturnedQuestions();
      console.log('✅ MyReturnedQuestions - Received questions:', questions);
      console.log('📊 MyReturnedQuestions - Question count:', questions.length);
      setReturnedQuestions(questions);
    } catch (err: any) {
      console.error('❌ MyReturnedQuestions - Error loading returned questions:', err);
      console.error('❌ MyReturnedQuestions - Error response:', err.response);
      setError(err.response?.data?.error || 'Failed to load returned questions');
      console.error('Error loading returned questions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditQuestion = (questionId: number) => {
    navigate(`/edit-question/${questionId}?from=returned`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Questions Returned for Rework</h1>
          <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
            {returnedQuestions.length} question{returnedQuestions.length !== 1 ? 's' : ''} need attention
          </span>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {returnedQuestions.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">All caught up!</h3>
            <p className="text-gray-500">You don't have any questions that need rework at the moment.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {returnedQuestions.map((question) => (
              <div key={question.id} className="border border-red-200 rounded-lg p-6 bg-red-50 hover:bg-red-100 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-sm font-medium text-gray-900 bg-white px-2 py-1 rounded">
                        {question.question_number}
                      </span>
                      <span className="text-xs text-red-600 bg-red-200 px-2 py-1 rounded-full font-medium">
                        NEEDS REWORK
                      </span>
                      <span className="text-xs text-gray-500">
                        Reviewed by {question.reviewer_name} on {new Date(question.reviewed_at).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <p className="text-gray-800 mb-4 line-clamp-2">
                      {question.question}
                    </p>
                    
                    <div className="bg-white border-l-4 border-red-500 p-4 mb-4 rounded">
                      <h4 className="font-medium text-gray-900 mb-2">Reviewer Feedback:</h4>
                      <p className="text-gray-700 text-sm">{question.review_notes}</p>
                    </div>
                  </div>
                  
                  <div className="ml-4 flex-shrink-0">
                    <button
                      onClick={() => handleEditQuestion(question.id)}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors font-medium"
                    >
                      Fix Question
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 text-center">
          <button
            onClick={() => navigate('/')}
            className="bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default MyReturnedQuestions;