import React, { useState } from 'react';
import { Question } from '../services/api';
import ExamApiService, { ApplicableExam } from '../services/examApi';

interface ApplicableExamsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: (exams: ApplicableExam[]) => void;
  question: Question;
}

const ApplicableExamsDialog: React.FC<ApplicableExamsDialogProps> = ({
  isOpen,
  onClose,
  onAccept,
  question
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedExams, setGeneratedExams] = useState<ApplicableExam[] | null>(null);
  const [editableExams, setEditableExams] = useState<ApplicableExam[] | null>(null);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');

  const generateApplicableExams = async () => {
    setIsGenerating(true);
    setProgress(10);
    setStatusText('Analyzing question content...');

    try {
      setProgress(30);
      setStatusText('Processing question with AI...');
      
      setProgress(50);
      setStatusText('Matching against exam syllabi...');
      
      setProgress(70);
      setStatusText('Assigning exam topics...');
      
      const exams = await callExamAPI(question);
      
      setProgress(90);
      setStatusText('Finalizing results...');
      
      setGeneratedExams(exams);
      setEditableExams([...exams]);
      setProgress(100);
      setStatusText('Exam assignment complete!');
      
    } catch (error) {
      console.error('Error generating applicable exams:', error);
      setStatusText('Error generating exam assignments. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const callExamAPI = async (question: Question): Promise<ApplicableExam[]> => {
    return await ExamApiService.assignExams(question);
  };

  React.useEffect(() => {
    if (isOpen && !generatedExams && !isGenerating) {
      generateApplicableExams();
    }
  }, [isOpen]);

  const handleAccept = () => {
    if (editableExams) {
      onAccept(editableExams);
      onClose();
    }
  };

  const handleClose = () => {
    setGeneratedExams(null);
    setEditableExams(null);
    setProgress(0);
    setStatusText('');
    onClose();
  };

  const removeSubtopic = (examName: string, subtopicIndex: number) => {
    if (editableExams) {
      setEditableExams(editableExams.map(exam => 
        exam.examName === examName 
          ? { ...exam, subtopics: exam.subtopics.filter((_, index) => index !== subtopicIndex) }
          : exam
      ));
    }
  };

  const removeExam = (examName: string) => {
    if (editableExams) {
      setEditableExams(editableExams.filter(exam => exam.examName !== examName));
    }
  };

  if (!isOpen) return null;

  return (
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
          handleClose();
        }
      }}
    >
      <div 
        className="rounded-2xl shadow-2xl max-w-2xl w-full mx-4 border-4 border-gray-300 relative"
        style={{backgroundColor: 'white', minHeight: '500px', boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.1)'}}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-8 py-6 rounded-t-2xl">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-2xl font-bold text-white">🎯 Assign Applicable Exams</h3>
              <p className="text-purple-100 mt-1">AI-powered exam syllabus matching</p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="text-white hover:text-red-300 bg-red-500/80 hover:bg-red-600 rounded-full p-3 transition-all duration-200 shadow-lg hover:shadow-xl"
              title="Close Dialog"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        <div className="p-8">
          {isGenerating && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">{statusText}</span>
                <span className="text-sm font-medium text-gray-500">{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          )}

          {editableExams && !isGenerating && (
            <div className="space-y-6">
              {editableExams.length > 0 ? (
                editableExams.map((exam, examIndex) => (
                  <div key={examIndex} className="bg-gray-50 rounded-lg p-6 relative">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-lg font-semibold text-gray-800">{exam.examName}</h4>
                      <button
                        onClick={() => removeExam(exam.examName)}
                        className="bg-red-500 text-white hover:bg-red-600 rounded text-xs px-2 py-1 font-medium transition-colors"
                        title="Remove Exam"
                      >
                        Remove Exam
                      </button>
                    </div>
                    
                    <div className="mb-3">
                      <h5 className="font-medium text-gray-700 mb-2">Applicable Subtopics:</h5>
                      <div className="flex flex-wrap gap-2">
                        {exam.subtopics.map((subtopic, subtopicIndex) => (
                          <span key={subtopicIndex} className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                            <span>
                              <span className="font-medium text-blue-600">{subtopic.section}</span> {subtopic.name}
                            </span>
                            <button
                              onClick={() => removeSubtopic(exam.examName, subtopicIndex)}
                              className="ml-1 bg-red-500 text-white hover:bg-red-600 rounded text-xs px-1.5 py-0.5 font-medium transition-colors"
                              title="Remove"
                            >
                              ✕
                            </button>
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
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-600">No applicable exams identified for this question.</p>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="absolute bottom-0 right-0 left-0 flex justify-end items-center gap-3 px-8 py-6 border-t border-gray-100" style={{backgroundColor: 'white', borderRadius: '0 0 1rem 1rem'}}>
          <button
            type="button"
            onClick={handleClose}
            className="px-6 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAccept}
            disabled={!generatedExams || isGenerating}
            className={`px-6 py-2 rounded-lg transition-all duration-200 ${
              generatedExams && !isGenerating
                ? 'bg-purple-600 text-white hover:bg-purple-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Accept Assignments
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApplicableExamsDialog;