import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { questionService, Question } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import QuestionCard from '../components/QuestionCard';
import MetadataGenerationDialog from '../components/MetadataGenerationDialog';
import EditMetadataModal from '../components/EditMetadataModal';
import ApplicableExamsDialog from '../components/ApplicableExamsDialog';
import ManualExamAssignmentModal from '../components/ManualExamAssignmentModal';
import { GeneratedMetadata } from '../services/claudeApi';
import { ApplicableExam } from '../services/examApi';

const QuestionView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useAuth();
  
  // Get the 'from' path from navigation state, default to '/' if not provided
  const fromPath = (location.state as any)?.from || '/';
  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
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
    if (id) {
      loadQuestion(parseInt(id));
    }
  }, [id]);

  const loadQuestion = async (questionId: number) => {
    try {
      setLoading(true);
      setError(null);
      const loadedQuestion = await questionService.getQuestion(questionId);
      setQuestion(loadedQuestion);
    } catch (err) {
      setError('Failed to load question. Please try again.');
      console.error('Load question error:', err);
    } finally {
      setLoading(false);
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

  if (error || !question) {
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
                onClick={() => navigate(fromPath)}
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                📝 Question {question.question_number || `#${question.id}`}
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed">
                Review and analyze this TOE exam question in detail.
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
                onClick={() => navigate(`/edit-question/${question.id}`)}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Question
              </button>
              <button
                onClick={() => navigate(fromPath)}
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
              onClick={() => navigate(fromPath)}
              className="flex items-center text-gray-600 hover:text-blue-600 transition-colors font-medium"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Questions
            </button>
            <span className="text-gray-900 font-semibold">
              Question {question.question_number || `#${question.id}`}
            </span>
          </div>
        </nav>

        {/* Question Card */}
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

        {/* Question Metadata */}
        {(question.source_folder || question.created_at || question.updated_at) && (
          <div className="bg-gradient-to-r from-slate-100 to-gray-100 rounded-2xl p-8 shadow-lg">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-gray-900">📊 Question Metadata</h3>
              <p className="text-gray-600">Additional information about this question</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6">
              {question.source_folder && (
                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <div className="mb-3">
                    <span className="font-semibold text-gray-700">Source</span>
                  </div>
                  <p className="text-gray-900 font-medium">{question.source_folder}</p>
                </div>
              )}
              
              {question.created_at && (
                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <div className="mb-3">
                    <span className="font-semibold text-gray-700">Created</span>
                  </div>
                  <p className="text-gray-900 font-medium">
                    {new Date(question.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              )}
              
              {question.updated_at && question.updated_at !== question.created_at && (
                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <div className="mb-3">
                    <span className="font-semibold text-gray-700">Last Updated</span>
                  </div>
                  <p className="text-gray-900 font-medium">
                    {new Date(question.updated_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Metadata Generation Dialog */}
        <MetadataGenerationDialog 
          isOpen={isMetadataDialogOpen}
          onClose={handleMetadataDialogClose}
          onAccept={handleMetadataAccept}
          question={question!}
        />

        {/* Edit Metadata Modal */}
        {questionMetadata && (
          <EditMetadataModal 
            isOpen={isEditMetadataModalOpen}
            onClose={() => setIsEditMetadataModalOpen(false)}
            onSave={handleEditMetadata}
            metadata={questionMetadata}
          />
        )}

        {/* Applicable Exams Dialog */}
        <ApplicableExamsDialog 
          isOpen={isApplicableExamsDialogOpen}
          onClose={handleApplicableExamsDialogClose}
          onAccept={handleApplicableExamsAccept}
          question={question!}
        />

        {/* Manual Exam Assignment Modal */}
        <ManualExamAssignmentModal 
          isOpen={isManualExamModalOpen}
          onClose={() => setIsManualExamModalOpen(false)}
          onSave={handleManualExamsSave}
          initialExams={applicableExams || []}
        />
      </div>
    </div>
  );
};

export default QuestionView;