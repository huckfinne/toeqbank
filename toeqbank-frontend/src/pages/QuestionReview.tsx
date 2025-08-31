import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { questionService, Question } from '../services/api';

const QuestionReview: React.FC = () => {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; questionId: number | null; questionText: string }>({ 
    isOpen: false, 
    questionId: null, 
    questionText: '' 
  });

  const limit = 50; // Show more questions in list view

  useEffect(() => {
    fetchQuestions();
  }, [currentPage]);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const offset = currentPage * limit;
      const response = await questionService.getQuestions(limit, offset);
      setQuestions(response.questions);
      setTotalQuestions(response.pagination.total);
      setError(null);
    } catch (err) {
      setError('Failed to fetch questions. Please make sure the backend server is running.');
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(totalQuestions / limit);

  const truncateText = (text: string, maxLength: number = 80) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const handleDeleteClick = (questionId: number, questionText: string) => {
    setDeleteConfirmation({
      isOpen: true,
      questionId,
      questionText: truncateText(questionText, 100)
    });
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirmation.questionId) {
      try {
        await questionService.deleteQuestion(deleteConfirmation.questionId);
        // Refresh the questions list
        fetchQuestions();
        setDeleteConfirmation({ isOpen: false, questionId: null, questionText: '' });
      } catch (error) {
        console.error('Error deleting question:', error);
        alert('Failed to delete question. Please try again.');
      }
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmation({ isOpen: false, questionId: null, questionText: '' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="animate-spin inline-block w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mb-4"></div>
            <p className="text-gray-600">Loading questions...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="text-red-600 mb-4">{error}</div>
            <button
              onClick={fetchQuestions}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
      <div className="container mx-auto px-4 py-12">
        {/* Open Queue Button */}
        <div className="mb-8">
          <div className="flex justify-end">
            <button 
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
              onClick={() => console.log('Open Queue clicked')}
            >
              <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              Open Queue
            </button>
          </div>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            📋 Question Review
          </h1>
          <p className="text-xl text-gray-600 leading-relaxed">
            Browse and manage your question collection.
          </p>
        </div>

        {/* Stats */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="text-lg font-semibold text-gray-800">
            {totalQuestions} Total Questions
          </div>
        </div>

        {/* Questions Table */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {questions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-6">No questions found. Upload some questions to get started!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Question
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {questions.map((question) => {
                    return (
                      <tr key={question.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div className="max-w-md">
                            {question.question_number && (
                              <span className="text-blue-600 font-medium">#{question.question_number}&nbsp;&nbsp;&nbsp;&nbsp;</span>
                            )}
                            {truncateText(question.question)}
                          </div>
                          {question.images && question.images.length > 0 && (
                            <div className="mt-1 text-xs text-gray-500 flex items-center">
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 002 2z" />
                              </svg>
                              {question.images.length} image{question.images.length > 1 ? 's' : ''}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {question.source_folder || 'Uncategorized'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-3">
                            <button
                              onClick={() => navigate(`/edit-question/${question.id}`)}
                              className="text-blue-600 hover:text-blue-900 font-medium"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteClick(question.id!, question.question)}
                              className="text-red-600 hover:text-red-900 font-medium"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex justify-center items-center space-x-4">
            <button
              onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                currentPage === 0
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-gray-700 hover:bg-gray-50 shadow-md'
              }`}
            >
              Previous
            </button>
            
            <span className="text-sm text-gray-600">
              Page {currentPage + 1} of {totalPages} ({totalQuestions} total questions)
            </span>
            
            <button
              onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
              disabled={currentPage >= totalPages - 1}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                currentPage >= totalPages - 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-gray-700 hover:bg-gray-50 shadow-md'
              }`}
            >
              Next
            </button>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        {deleteConfirmation.isOpen && (
          <div 
            className="fixed inset-0 flex items-center justify-center p-4" 
            style={{
              zIndex: 99999, 
              position: 'fixed', 
              top: 0, 
              left: 0, 
              right: 0, 
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.75)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                handleDeleteCancel();
              }
            }}
          >
            <div 
              className="rounded-2xl shadow-2xl max-w-md w-full mx-4 border-4 border-gray-300 relative"
              style={{backgroundColor: 'white', boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.1)'}}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-red-600 to-red-700 px-8 py-6 rounded-t-2xl">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-2xl font-bold text-white">🗑️ Delete Question</h3>
                    <p className="text-red-100 mt-1">This action cannot be undone</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDeleteCancel}
                    className="text-white hover:text-red-200 rounded-full p-2 hover:bg-red-700 transition-all duration-200"
                    title="Close Dialog"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="p-8">
                <div className="text-center">
                  <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
                    <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">
                    Are you sure you want to delete this question?
                  </h4>
                  <p className="text-sm text-gray-600 mb-4">
                    "{deleteConfirmation.questionText}"
                  </p>
                  <p className="text-sm text-red-600 font-medium">
                    This will permanently delete the question and all its associated data.
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end items-center gap-3 px-8 py-6 border-t border-gray-100" style={{backgroundColor: 'white', borderRadius: '0 0 1rem 1rem'}}>
                <button
                  type="button"
                  onClick={handleDeleteCancel}
                  className="px-6 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-200 font-semibold"
                >
                  Delete Question
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionReview;