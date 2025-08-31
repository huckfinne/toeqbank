import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { examSessionService } from '../services/api';

interface ExamConfig {
  feedbackType: 'immediate' | 'end';
  numberOfQuestions: number;
}

const ExamSetup: React.FC = () => {
  const navigate = useNavigate();
  const [config, setConfig] = useState<ExamConfig>({
    feedbackType: 'end',
    numberOfQuestions: 10
  });
  const [isGenerating, setIsGenerating] = useState(false);

  const handleFeedbackTypeChange = (type: 'immediate' | 'end') => {
    setConfig(prev => ({ ...prev, feedbackType: type }));
  };

  const handleNumberOfQuestionsChange = (num: number) => {
    setConfig(prev => ({ ...prev, numberOfQuestions: num }));
  };

  const handleGenerateExam = async () => {
    try {
      setIsGenerating(true);
      
      // Generate the exam session
      const examSession = await examSessionService.generateExam(config);
      
      // Store exam session in sessionStorage for the exam page to access
      sessionStorage.setItem('currentExamSession', JSON.stringify(examSession));
      
      // Navigate to exam taking page
      navigate(`/exam/${examSession.id}`);
    } catch (error) {
      console.error('Failed to generate exam:', error);
      alert('Failed to generate exam. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const questionOptions = [5, 10, 15, 20, 25, 30, 50];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            📝 Take an Exam
          </h1>
          <p className="text-gray-600 text-lg">
            Configure your exam settings and test your knowledge
          </p>
        </div>

        {/* Exam Configuration Card */}
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-xl p-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
            Exam Configuration
          </h2>

          {/* Feedback Type Selection */}
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-700 mb-4">Feedback Type</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => handleFeedbackTypeChange('immediate')}
                className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                  config.feedbackType === 'immediate'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 bg-gray-50 text-gray-700 hover:border-gray-400'
                }`}
              >
                <div className="text-center">
                  <div className="text-2xl mb-2">⚡</div>
                  <div className="font-semibold mb-1">Immediate Feedback</div>
                  <div className="text-sm">Get answers and explanations right after each question</div>
                </div>
              </button>

              <button
                onClick={() => handleFeedbackTypeChange('end')}
                className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                  config.feedbackType === 'end'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 bg-gray-50 text-gray-700 hover:border-gray-400'
                }`}
              >
                <div className="text-center">
                  <div className="text-2xl mb-2">📊</div>
                  <div className="font-semibold mb-1">Feedback at End</div>
                  <div className="text-sm">Review all answers and explanations after completing the exam</div>
                </div>
              </button>
            </div>
          </div>

          {/* Number of Questions Selection */}
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-700 mb-4">Number of Questions</h3>
            <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
              {questionOptions.map((num) => (
                <button
                  key={num}
                  onClick={() => handleNumberOfQuestionsChange(num)}
                  className={`py-3 px-4 rounded-lg border-2 font-semibold transition-all duration-200 ${
                    config.numberOfQuestions === num
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-300 bg-gray-50 text-gray-700 hover:border-gray-400'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
            
            {/* Custom Number Input */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-600 mb-2">
                Or enter a custom number:
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={config.numberOfQuestions}
                onChange={(e) => handleNumberOfQuestionsChange(parseInt(e.target.value) || 1)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter number of questions"
              />
            </div>
          </div>

          {/* Exam Summary */}
          <div className="mb-8 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-medium text-gray-700 mb-3">Exam Summary</h3>
            <div className="space-y-2 text-gray-600">
              <div className="flex justify-between">
                <span>Questions:</span>
                <span className="font-semibold">{config.numberOfQuestions}</span>
              </div>
              <div className="flex justify-between">
                <span>Feedback:</span>
                <span className="font-semibold capitalize">
                  {config.feedbackType === 'immediate' ? 'After Each Question' : 'At End of Exam'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Estimated Time:</span>
                <span className="font-semibold">
                  {Math.ceil(config.numberOfQuestions * 1.5)} minutes
                </span>
              </div>
            </div>
          </div>

          {/* Generate Exam Button */}
          <div className="text-center">
            <button
              onClick={handleGenerateExam}
              disabled={isGenerating}
              className="w-full md:w-auto px-12 py-4 bg-gradient-to-r from-blue-600 to-green-600 text-white text-lg font-semibold rounded-lg hover:from-blue-700 hover:to-green-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isGenerating ? (
                <>
                  <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Generating Exam...
                </>
              ) : (
                '🚀 Generate Exam'
              )}
            </button>
          </div>

          {/* Additional Info */}
          <div className="mt-6 text-center text-sm text-gray-500">
            <p>Questions will be randomly selected from approved questions in the database</p>
          </div>
        </div>

        {/* Feature Info Cards */}
        <div className="max-w-4xl mx-auto mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="text-3xl mb-3">🎯</div>
            <h3 className="font-semibold text-gray-800 mb-2">Adaptive Learning</h3>
            <p className="text-gray-600 text-sm">
              Questions are selected to help you learn and improve your knowledge
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="text-3xl mb-3">📈</div>
            <h3 className="font-semibold text-gray-800 mb-2">Track Progress</h3>
            <p className="text-gray-600 text-sm">
              Monitor your performance and identify areas for improvement
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="text-3xl mb-3">🏆</div>
            <h3 className="font-semibold text-gray-800 mb-2">Comprehensive Review</h3>
            <p className="text-gray-600 text-sm">
              Detailed explanations help reinforce your understanding
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExamSetup;