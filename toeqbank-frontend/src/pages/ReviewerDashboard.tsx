import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  questionService, 
  Question, 
  Image, 
  imageService, 
  questionMetadataService, 
  QuestionMetadata,
  examService,
  ExamAssignment
} from '../services/api';
import { handleImageError, getPlaceholderImage } from '../utils/imageHelpers';

interface QuestionWithStatus extends Question {
  review_status?: 'pending' | 'approved' | 'rejected' | 'returned';
  review_notes?: string;
  questionImages?: Image[];
  explanationImages?: Image[];
  metadata?: QuestionMetadata | null;
  examAssignments?: ExamAssignment[];
}

const ReviewerDashboard: React.FC = () => {
  const { isReviewer, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [currentQuestion, setCurrentQuestion] = useState<QuestionWithStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected_and_returned: 0
  });

  useEffect(() => {
    if (isReviewer || isAdmin) {
      loadNextQuestion();
    }
  }, [isReviewer, isAdmin]);

  const loadNextQuestion = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get pending questions from the review API
      const pendingResponse = await questionService.getPendingReview();
      const pendingQuestions = pendingResponse.questions || [];
      
      // Get review stats
      const statsResponse = await questionService.getReviewStats();
      setStats({
        total: statsResponse.total,
        pending: statsResponse.pending,
        approved: statsResponse.approved,
        rejected_and_returned: statsResponse.rejected + statsResponse.returned
      });
      
      if (pendingQuestions.length === 0) {
        setCurrentQuestion(null);
        return;
      }
      
      // Get the first (oldest) pending question
      const question = pendingQuestions[0];
      
      // Load additional data for the question
      try {
        const [questionImages, metadata, examAssignments] = await Promise.all([
          imageService.getImagesForQuestion(question.id!).catch(() => []),
          questionMetadataService.getByQuestionId(question.id!).catch(() => null),
          examService.getExamAssignments(question.id!).catch(() => [])
        ]);

        // Separate question and explanation images
        const allImages = questionImages || [];
        
        setCurrentQuestion({
          ...question,
          review_status: question.review_status || 'pending',
          review_notes: question.review_notes || '',
          questionImages: allImages,
          explanationImages: [], // For now, we'll assume all images are for questions
          metadata: metadata,
          examAssignments: examAssignments
        });
      } catch (error) {
        console.error(`Error loading data for question ${question.id}:`, error);
        setCurrentQuestion({
          ...question,
          review_status: question.review_status || 'pending',
          review_notes: question.review_notes || '',
          questionImages: [],
          explanationImages: [],
          metadata: undefined,
          examAssignments: []
        });
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        // Token expired or invalid - redirect to login
        setError('Your session has expired. Please log in again.');
        setTimeout(() => {
          // Clear auth data and redirect
          localStorage.removeItem('authToken');
          localStorage.removeItem('authUser');
          window.location.href = '/';
        }, 2000);
      } else {
        setError(err.response?.data?.error || 'Failed to load question for review');
      }
      console.error('Load question error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (questionId: number) => {
    try {
      await questionService.updateReviewStatus(questionId, 'approved', reviewNotes);
      
      // Show success message and load next question
      alert('Question approved successfully!');
      setReviewNotes('');
      loadNextQuestion();
    } catch (err) {
      console.error('Approve error:', err);
      alert('Failed to approve question');
    }
  };

  const handleNeedsWork = async (questionId: number) => {
    if (!reviewNotes.trim()) {
      alert('Please provide notes on what needs work');
      return;
    }
    
    try {
      await questionService.updateReviewStatus(questionId, 'returned', reviewNotes);
      
      // Show success message and load next question
      alert('Question marked as needs work');
      setReviewNotes('');
      loadNextQuestion();
    } catch (err) {
      console.error('Needs work error:', err);
      alert('Failed to mark question as needs work');
    }
  };

  if (!isReviewer && !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600">You need reviewer privileges to access this page.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading questions for review...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            📋 Question Review Queue
          </h1>
          <p className="text-gray-600">
            Review questions one at a time to approve them for the question bank
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-yellow-50 rounded-lg shadow-md p-6 border-l-4 border-yellow-400">
            <div className="text-2xl font-bold text-yellow-800">{stats.pending}</div>
            <div className="text-sm text-yellow-600">Pending Review</div>
          </div>
          <div className="bg-green-50 rounded-lg shadow-md p-6 border-l-4 border-green-400">
            <div className="text-2xl font-bold text-green-800">{stats.approved}</div>
            <div className="text-sm text-green-600">Approved</div>
          </div>
          <div className="bg-orange-50 rounded-lg shadow-md p-6 border-l-4 border-orange-400">
            <div className="text-2xl font-bold text-orange-800">{stats.rejected_and_returned}</div>
            <div className="text-sm text-orange-600">Needs Work</div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Single Question Review */}
        {!currentQuestion ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="text-gray-500">
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p>Loading next question...</p>
                </>
              ) : (
                <>
                  <div className="text-6xl mb-4">🎉</div>
                  <p className="text-xl">No more questions to review!</p>
                  <p className="mt-2">All questions have been processed.</p>
                  <button 
                    onClick={loadNextQuestion}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Check Again
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-8">
            {/* Question Header */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-2xl font-bold text-gray-900">
                  Question #{currentQuestion.question_number || currentQuestion.id}
                </h2>
                <span className="px-3 py-1 text-sm font-semibold rounded-full bg-yellow-100 text-yellow-800">
                  PENDING REVIEW
                </span>
              </div>
              <div className="flex gap-4 text-sm text-gray-500">
                {currentQuestion.source_folder && (
                  <span>Source: {currentQuestion.source_folder}</span>
                )}
                {currentQuestion.created_at && (
                  <span>Created: {new Date(currentQuestion.created_at).toLocaleDateString()}</span>
                )}
              </div>
            </div>

            {/* Question Content */}
            <div className="space-y-6 mb-8">
              <div>
                <h3 className="font-semibold text-gray-700 mb-3 text-lg">Question:</h3>
                <p className="text-gray-900 bg-gray-50 p-4 rounded-lg text-lg leading-relaxed">
                  {currentQuestion.question}
                </p>
                
                {/* Question Images */}
                {currentQuestion.questionImages && currentQuestion.questionImages.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium text-gray-600 mb-2">Question Images:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {currentQuestion.questionImages.map((image: Image) => (
                        <div key={image.id} className="border rounded-lg p-3 bg-white">
                          <img 
                            src={imageService.getImageUrl(image.filename)}
                            alt={image.description || image.original_name}
                            className="w-full max-w-none rounded"
                            style={{ width: '60%' }}
                            onError={(e) => handleImageError(e, getPlaceholderImage())}
                          />
                          <div className="mt-2 text-sm text-gray-600">
                            <p><strong>File:</strong> {image.original_name}</p>
                            {image.description && <p><strong>Description:</strong> {image.description}</p>}
                            <p><strong>License:</strong> {imageService.getLicenseInfo(image.license).name}</p>
                            {image.tags && image.tags.length > 0 && (
                              <p><strong>Tags:</strong> {image.tags.join(', ')}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((letter) => {
                  const choiceKey = `choice_${letter.toLowerCase()}` as keyof Question;
                  const choiceText = currentQuestion[choiceKey];
                  if (!choiceText) return null;
                  
                  return (
                    <div key={letter} className={`p-4 rounded-lg border-2 transition-colors ${
                      letter === currentQuestion.correct_answer
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <span className="font-semibold text-lg">{letter}.</span> 
                      <span className="ml-2">{choiceText as string}</span>
                      {letter === currentQuestion.correct_answer && (
                        <span className="ml-2 text-green-600 font-semibold">✓ CORRECT</span>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {currentQuestion.explanation && (
                <div>
                  <h3 className="font-semibold text-gray-700 mb-3 text-lg">Explanation:</h3>
                  <p className="text-gray-900 bg-blue-50 p-4 rounded-lg leading-relaxed">
                    {currentQuestion.explanation}
                  </p>
                  
                  {/* Explanation Images */}
                  {currentQuestion.explanationImages && currentQuestion.explanationImages.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-medium text-gray-600 mb-2">Explanation Images:</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {currentQuestion.explanationImages.map((image: Image) => (
                          <div key={image.id} className="border rounded-lg p-3 bg-white">
                            <img 
                              src={imageService.getImageUrl(image.filename)}
                              alt={image.description || image.original_name}
                              className="w-full max-w-none rounded"
                              style={{ width: '60%' }}
                              onError={(e) => handleImageError(e, getPlaceholderImage())}
                            />
                            <div className="mt-2 text-sm text-gray-600">
                              <p><strong>File:</strong> {image.original_name}</p>
                              {image.description && <p><strong>Description:</strong> {image.description}</p>}
                              <p><strong>License:</strong> {imageService.getLicenseInfo(image.license).name}</p>
                              {image.tags && image.tags.length > 0 && (
                                <p><strong>Tags:</strong> {image.tags.join(', ')}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Metadata Section */}
              {currentQuestion.metadata && (
                <div>
                  <h3 className="font-semibold text-gray-700 mb-3 text-lg">Question Metadata:</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      {currentQuestion.metadata.difficulty && (
                        <div><strong>Difficulty:</strong> {currentQuestion.metadata.difficulty}</div>
                      )}
                      {currentQuestion.metadata.category && (
                        <div><strong>Category:</strong> {currentQuestion.metadata.category}</div>
                      )}
                      {currentQuestion.metadata.topic && (
                        <div><strong>Topic:</strong> {currentQuestion.metadata.topic}</div>
                      )}
                      {currentQuestion.metadata.question_type && (
                        <div><strong>Question Type:</strong> {currentQuestion.metadata.question_type}</div>
                      )}
                      {currentQuestion.metadata.view_type && (
                        <div><strong>View Type:</strong> {currentQuestion.metadata.view_type}</div>
                      )}
                      {currentQuestion.metadata.keywords && currentQuestion.metadata.keywords.length > 0 && (
                        <div className="md:col-span-2">
                          <strong>Keywords:</strong> {currentQuestion.metadata.keywords.join(', ')}
                        </div>
                      )}
                      {currentQuestion.metadata.major_structures && currentQuestion.metadata.major_structures.length > 0 && (
                        <div className="md:col-span-2">
                          <strong>Major Structures:</strong> {currentQuestion.metadata.major_structures.join(', ')}
                        </div>
                      )}
                      {currentQuestion.metadata.minor_structures && currentQuestion.metadata.minor_structures.length > 0 && (
                        <div className="md:col-span-2">
                          <strong>Minor Structures:</strong> {currentQuestion.metadata.minor_structures.join(', ')}
                        </div>
                      )}
                      {currentQuestion.metadata.modalities && currentQuestion.metadata.modalities.length > 0 && (
                        <div className="md:col-span-2">
                          <strong>Modalities:</strong> {currentQuestion.metadata.modalities.join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Exam Assignments Section */}
              {currentQuestion.examAssignments && currentQuestion.examAssignments.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-700 mb-3 text-lg">Exam Assignments:</h3>
                  <div className="space-y-3">
                    {currentQuestion.examAssignments.map((exam, index) => (
                      <div key={index} className="bg-blue-50 p-4 rounded-lg">
                        <div className="font-medium text-blue-900 mb-2">{exam.examName}</div>
                        {exam.subtopics && exam.subtopics.length > 0 && (
                          <div className="text-sm text-blue-800">
                            <strong>Subtopics:</strong>
                            <ul className="list-disc list-inside mt-1 ml-4">
                              {exam.subtopics.map((subtopic, subIndex) => (
                                <li key={subIndex}>
                                  <span className="font-medium">{subtopic.name}</span>
                                  {subtopic.section && <span className="text-blue-600"> (Section: {subtopic.section})</span>}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {exam.reasoning && (
                          <div className="text-sm text-blue-700 mt-2">
                            <strong>Reasoning:</strong> {exam.reasoning}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Review Actions */}
            <div className="border-t pt-6">
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Review Notes:
                </label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                  rows={4}
                  placeholder="Enter your review notes, suggestions, or feedback (required for 'Needs Work')..."
                />
              </div>
              
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => handleApprove(currentQuestion.id!)}
                  className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-lg font-medium"
                >
                  ✓ Approve Question
                </button>
                <button
                  onClick={() => handleNeedsWork(currentQuestion.id!)}
                  className="px-8 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-lg font-medium"
                >
                  ⚠ Needs Work
                </button>
                <button
                  onClick={() => navigate(`/edit-question/${currentQuestion.id}`)}
                  className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-lg font-medium"
                >
                  ✏️ Edit Question
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewerDashboard;