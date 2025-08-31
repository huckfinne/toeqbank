import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { questionService, Question } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import QuestionCard from '../components/QuestionCard';
import QuestionForm from '../components/QuestionForm';
import MetadataGenerationDialog from '../components/MetadataGenerationDialog';
import EditMetadataModal from '../components/EditMetadataModal';
import ApplicableExamsDialog from '../components/ApplicableExamsDialog';
import ManualExamAssignmentModal from '../components/ManualExamAssignmentModal';
import { GeneratedMetadata } from '../services/claudeApi';
import { ApplicableExam } from '../services/examApi';

const QuestionEditor: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { isAdmin, user } = useAuth();
  const isEditMode = !!id;
  
  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(isEditMode);
  const [error, setError] = useState<string | null>(null);
  const [isMetadataDialogOpen, setIsMetadataDialogOpen] = useState(false);
  const [isEditMetadataModalOpen, setIsEditMetadataModalOpen] = useState(false);
  const [isApplicableExamsDialogOpen, setIsApplicableExamsDialogOpen] = useState(false);
  const [isManualExamModalOpen, setIsManualExamModalOpen] = useState(false);
  const [questionMetadata, setQuestionMetadata] = useState<GeneratedMetadata | null>(null);
  const [applicableExams, setApplicableExams] = useState<ApplicableExam[] | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isEditMode && id) {
      loadQuestion(parseInt(id));
    }
  }, [id, isEditMode]);

  const loadQuestion = async (questionId: number) => {
    try {
      setLoading(true);
      setError(null);
      const loadedQuestion = await questionService.getQuestion(questionId);
      setQuestion(loadedQuestion);
      
      // Load existing metadata and exams
      await Promise.all([
        loadMetadata(questionId),
        loadExams(questionId)
      ]);
    } catch (err) {
      setError('Failed to load question. Please try again.');
      console.error('Load question error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMetadata = async (questionId: number) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/questions/${questionId}/metadata`);
      if (response.ok) {
        const data = await response.json();
        if (data.metadata) {
          setQuestionMetadata(data.metadata);
        }
      }
    } catch (error) {
      console.error('Failed to load metadata:', error);
    }
  };

  const loadExams = async (questionId: number) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/questions/${questionId}/exams`);
      if (response.ok) {
        const data = await response.json();
        if (data.exams && data.exams.length > 0) {
          setApplicableExams(data.exams);
        }
      }
    } catch (error) {
      console.error('Failed to load exams:', error);
    }
  };

  const handleMetadataAccept = (metadata: GeneratedMetadata) => {
    setQuestionMetadata(metadata);
    setIsMetadataDialogOpen(false);
    setHasUnsavedChanges(true);
    console.log('Metadata accepted:', metadata);
  };

  const handleMetadataDialogClose = () => {
    setIsMetadataDialogOpen(false);
  };

  const handleEditMetadata = (metadata: GeneratedMetadata) => {
    setQuestionMetadata(metadata);
    setIsEditMetadataModalOpen(false);
    setHasUnsavedChanges(true);
    console.log('Metadata edited:', metadata);
  };

  const handleApplicableExamsAccept = (exams: ApplicableExam[]) => {
    setApplicableExams(exams);
    setIsApplicableExamsDialogOpen(false);
    setHasUnsavedChanges(true);
    console.log('Applicable exams accepted:', exams);
  };

  const handleManualExamsSave = (exams: ApplicableExam[]) => {
    setApplicableExams(exams);
    setIsManualExamModalOpen(false);
    setHasUnsavedChanges(true);
    console.log('Manual exams saved:', exams);
  };

  const handleSaveChanges = async () => {
    if (!question || !hasUnsavedChanges) return;
    
    try {
      setIsSaving(true);
      
      // Save metadata if exists
      if (questionMetadata) {
        const metadataResponse = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/questions/${question.id}/metadata`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(questionMetadata)
        });
        
        if (!metadataResponse.ok) {
          throw new Error('Failed to save metadata');
        }
      }
      
      // Save applicable exams if exists
      if (applicableExams) {
        const examsResponse = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/questions/${question.id}/exams`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ exams: applicableExams })
        });
        
        if (!examsResponse.ok) {
          throw new Error('Failed to save exam assignments');
        }
      }
      
      setHasUnsavedChanges(false);
      console.log('Changes saved successfully');
      
      // After saving, navigate to a new blank create question page
      setTimeout(() => {
        navigate('/create-question');
      }, 500); // Small delay to show the save was successful
      
    } catch (error) {
      console.error('Error saving changes:', error);
      alert('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleApplicableExamsDialogClose = () => {
    setIsApplicableExamsDialogOpen(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="animate-spin inline-block w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mb-4"></div>
            <p className="text-gray-600">Loading question...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && isEditMode) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="text-red-600 mb-4">{error}</div>
            <div className="space-x-4">
              <button
                onClick={() => id && loadQuestion(parseInt(id))}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Retry
              </button>
              <button
                onClick={() => navigate('/')}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Only show "Question not found" if we're in edit mode but couldn't load the question
  if (isEditMode && !question && !loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <p className="text-gray-600">Question not found.</p>
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 mt-4"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // For create mode, show the form instead of the view
  if (!isEditMode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="w-full px-0 py-4">
          <QuestionForm
            mode="create"
            onSuccess={(savedQuestion) => {
              // After creating a question, redirect to a fresh create-question page
              navigate('/create-question');
            }}
          />
        </div>
      </div>
    );
  }

  // For edit mode, also use QuestionForm with edit mode so it has all image functionality
  if (isEditMode && question) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="w-full px-0 py-4">
          <QuestionForm
            mode="edit"
            initialData={question}
            onSuccess={(savedQuestion) => {
              if (savedQuestion.id) {
                navigate(`/question/${savedQuestion.id}`);
              } else {
                navigate('/');
              }
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                ✏️ Edit Question {question?.question_number || `#${question?.id}`}
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed">
                Review and modify this TOE exam question.
              </p>
            </div>
            <div className="flex space-x-4">
              {hasUnsavedChanges && (
                <button
                  onClick={handleSaveChanges}
                  disabled={isSaving}
                  className={`px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 ${
                    isSaving 
                      ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                      : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700'
                  }`}
                >
                  <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              )}
              <button
                onClick={() => navigate(`/question/${question?.id}`)}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                View Question
              </button>
              <button
                onClick={() => navigate('/')}
                className="px-6 py-3 text-gray-600 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl hover:bg-white hover:shadow-md transition-all duration-200"
              >
                <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to List
              </button>
            </div>
          </div>
        </div>

        {/* Breadcrumb */}
        <nav className="mb-8">
          <div className="flex items-center space-x-3 text-sm bg-white/60 backdrop-blur-sm px-4 py-3 rounded-xl border border-gray-200 w-fit">
            <button
              onClick={() => navigate('/')}
              className="flex items-center text-gray-600 hover:text-blue-600 transition-colors font-medium"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Questions
            </button>
            <span className="text-gray-900 font-semibold">
              Edit Question {question?.question_number || `#${question?.id}`}
            </span>
          </div>
        </nav>

        {/* Question Card */}
        {question && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden mb-8">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-8 py-6">
              <h2 className="text-2xl font-bold text-white">📚 Question Review</h2>
              <p className="text-emerald-100 mt-1">Complete question with answer and explanation</p>
            </div>
            <div className="p-8">
              <QuestionCard
                question={question}
                questionNumber={1}
                showAnswer={true}
                showExplanation={true}
                onAnswerSelect={() => {}} // No-op for display mode
                selectedAnswer=""
                isReviewMode={true}
              />
            </div>
          </div>
        )}

        {/* Metadata Section */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-8 py-6">
            <h2 className="text-2xl font-bold text-white">📋 Metadata</h2>
            <p className="text-blue-100 mt-1">Question classification and details</p>
          </div>
          <div className="p-8">
            {questionMetadata ? (
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-700 mb-2">Difficulty Level</h4>
                    <p className="text-gray-900">{questionMetadata.difficulty}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-700 mb-2">Category</h4>
                    <p className="text-gray-900">{questionMetadata.category}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-700 mb-2">Topic</h4>
                    <p className="text-gray-900">{questionMetadata.topic}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-700 mb-2">Question Type</h4>
                    <p className="text-gray-900">{questionMetadata.questionType}</p>
                  </div>
                  {questionMetadata.view && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-700 mb-2">TEE View</h4>
                      <p className="text-gray-900">{questionMetadata.view}</p>
                    </div>
                  )}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-700 mb-2">Modalities</h4>
                    <p className="text-gray-900">{questionMetadata.modalities.join(', ')}</p>
                  </div>
                </div>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-700 mb-2">Major Structures</h4>
                    <p className="text-gray-900">{questionMetadata.majorStructures.join(', ') || 'None identified'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-700 mb-2">Minor Structures</h4>
                    <p className="text-gray-900">{questionMetadata.minorStructures.join(', ') || 'None identified'}</p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-700 mb-2">Keywords</h4>
                  <p className="text-gray-900">{questionMetadata.keywords.join(', ')}</p>
                </div>
                <div className="text-center space-x-4">
                  {isAdmin && (
                    <button 
                      onClick={() => setIsMetadataDialogOpen(true)}
                      className="px-6 py-2 text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors font-medium"
                    >
                      Regenerate Metadata
                    </button>
                  )}
                  <button 
                    onClick={() => setIsEditMetadataModalOpen(true)}
                    className="px-6 py-2 text-green-600 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors font-medium"
                  >
                    Edit Metadata
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-600 mb-6">No metadata has been added to this question yet.</p>
                <div className="space-x-4">
                  {isAdmin && (
                    <button 
                      onClick={() => setIsMetadataDialogOpen(true)}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                    >
                      Generate with AI
                    </button>
                  )}
                  <button 
                    onClick={() => setIsEditMetadataModalOpen(true)}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
                  >
                    Add Manually
                  </button>
                </div>
                {!isAdmin && (
                  <p className="text-sm text-gray-500 mt-4">AI generation is admin-only. Use manual editing to add metadata.</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Applicable Exams Section */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-purple-500 to-pink-600 px-8 py-6">
            <h2 className="text-2xl font-bold text-white">🎯 Applicable Exams</h2>
            <p className="text-purple-100 mt-1">Exams where this question may appear</p>
          </div>
          <div className="p-8">
            {applicableExams ? (
              <div className="space-y-6">
                {applicableExams.map((exam, examIndex) => (
                  <div key={examIndex} className="bg-gray-50 rounded-lg p-6">
                    <h4 className="text-lg font-semibold text-gray-800 mb-3">{exam.examName}</h4>
                    <div className="mb-3">
                      <h5 className="font-medium text-gray-700 mb-2">Applicable Subtopics:</h5>
                      <div className="flex flex-wrap gap-2">
                        {exam.subtopics.map((subtopic, subtopicIndex) => (
                          <span key={subtopicIndex} className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                            {typeof subtopic === 'string' ? subtopic : (
                              <span>
                                <span className="font-medium text-blue-600">{subtopic.section}</span> {subtopic.name}
                              </span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                    {exam.reasoning && (
                      <div className="mt-3 p-3 bg-purple-50 rounded-md">
                        <h6 className="font-medium text-purple-800 mb-1">AI Reasoning:</h6>
                        <p className="text-purple-700 text-sm">{exam.reasoning}</p>
                      </div>
                    )}
                  </div>
                ))}
                <div className="text-center space-x-4">
                  {isAdmin && (
                    <button 
                      onClick={() => setIsApplicableExamsDialogOpen(true)}
                      className="px-6 py-2 text-purple-600 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors font-medium"
                    >
                      Regenerate with AI
                    </button>
                  )}
                  <button 
                    onClick={() => setIsManualExamModalOpen(true)}
                    className="px-6 py-2 text-orange-600 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors font-medium"
                  >
                    Edit Manually
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-600 mb-6">No applicable exams have been assigned to this question yet.</p>
                <div className="space-x-4">
                  {isAdmin && (
                    <button 
                      onClick={() => setIsApplicableExamsDialogOpen(true)}
                      className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold"
                    >
                      Generate with AI
                    </button>
                  )}
                  <button 
                    className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-semibold"
                    onClick={() => setIsManualExamModalOpen(true)}
                  >
                    Add Manually
                  </button>
                </div>
                {!isAdmin && (
                  <p className="text-sm text-gray-500 mt-4">AI assignment is admin-only. Use manual editing to assign exams.</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Dialogs */}
        <>
          {isAdmin && question && (
            <>
              <MetadataGenerationDialog 
                isOpen={isMetadataDialogOpen}
                onClose={handleMetadataDialogClose}
                onAccept={handleMetadataAccept}
                question={question}
              />

              <ApplicableExamsDialog 
                isOpen={isApplicableExamsDialogOpen}
                onClose={handleApplicableExamsDialogClose}
                onAccept={handleApplicableExamsAccept}
                question={question}
              />
            </>
          )}

          <EditMetadataModal
            isOpen={isEditMetadataModalOpen}
            onClose={() => setIsEditMetadataModalOpen(false)}
            onSave={handleEditMetadata}
            metadata={questionMetadata || {
              difficulty: 'Medium',
              category: 'Transesophageal Echocardiography (TEE/TOE)',
              topic: '',
              keywords: [],
              questionType: 'Multiple Choice',
              view: '',
              majorStructures: [],
              minorStructures: [],
              modalities: []
            }}
          />

          <ManualExamAssignmentModal
            isOpen={isManualExamModalOpen}
            onClose={() => setIsManualExamModalOpen(false)}
            onSave={handleManualExamsSave}
            initialExams={applicableExams || []}
          />
        </>
      </div>
    </div>
  );
};

export default QuestionEditor;