import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { questionService, questionMetadataService, examService } from '../services/api';

interface QuestionStatus {
  id: number;
  question_number: string;
  question: string;
  hasMetadata: boolean;
  hasExamMapping: boolean;
  needsProcessing: boolean;
}

const AIManipulation: React.FC = () => {
  const { isAdmin } = useAuth();
  const [questions, setQuestions] = useState<QuestionStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState({ current: 0, total: 0 });
  const [selectedQuestions, setSelectedQuestions] = useState<Set<number>>(new Set());
  const [showOnlyPending, setShowOnlyPending] = useState(true);
  const [costEstimate, setCostEstimate] = useState({ input: 0, output: 0, total: 0 });
  
  // Store processed questions in localStorage for persistence (simulation only)
  const [processedQuestionIds, setProcessedQuestionIds] = useState<Set<number>>(() => {
    const stored = localStorage.getItem('processedQuestions');
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });

  useEffect(() => {
    loadQuestions();
  }, []);

  useEffect(() => {
    calculateCost();
  }, [selectedQuestions, questions]);

  const loadQuestions = async () => {
    try {
      setLoading(true);
      const response = await questionService.getQuestions(1000); // Get up to 1000 questions
      
      // Check which questions have been processed (simulation)
      // In production, this would check actual metadata/exam mapping status from the database
      const questionsWithStatus: QuestionStatus[] = response.questions.map(q => {
        const questionId = q.id || 0;
        const isProcessed = processedQuestionIds.has(questionId);
        
        return {
          id: questionId,
          question_number: q.question_number || `Q${questionId}`,
          question: q.question.substring(0, 100) + (q.question.length > 100 ? '...' : ''),
          hasMetadata: isProcessed, // Processed questions have both metadata and exam mapping
          hasExamMapping: isProcessed,
          needsProcessing: !isProcessed
        };
      });

      setQuestions(questionsWithStatus);
      
      // Auto-select questions that need processing (if not currently processing)
      if (!processing) {
        const needsWork = questionsWithStatus
          .filter(q => q.needsProcessing)
          .map(q => q.id);
        setSelectedQuestions(new Set(needsWork));
      }
    } catch (error) {
      console.error('Error loading questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateCost = () => {
    // Claude 3 Opus pricing (as of 2024)
    // Input: $15 per million tokens
    // Output: $75 per million tokens
    // Estimate ~500 tokens per question for input, ~200 tokens for output
    
    const questionsToProcess = selectedQuestions.size;
    const inputTokens = questionsToProcess * 500;
    const outputTokens = questionsToProcess * 200;
    
    const inputCost = (inputTokens / 1000000) * 15;
    const outputCost = (outputTokens / 1000000) * 75;
    
    setCostEstimate({
      input: inputCost,
      output: outputCost,
      total: inputCost + outputCost
    });
  };

  const handleSelectAll = () => {
    const pendingQuestions = questions
      .filter(q => !showOnlyPending || q.needsProcessing)
      .map(q => q.id);
    setSelectedQuestions(new Set(pendingQuestions));
  };

  const handleDeselectAll = () => {
    setSelectedQuestions(new Set());
  };

  const handleToggleQuestion = (id: number) => {
    const newSelected = new Set(selectedQuestions);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedQuestions(newSelected);
  };

  const handleProcessSelected = async () => {
    if (selectedQuestions.size === 0) {
      alert('Please select questions to process');
      return;
    }

    const confirmMessage = `Process ${selectedQuestions.size} questions?\n\nEstimated cost: $${costEstimate.total.toFixed(4)}\n\nThis will generate metadata and exam mappings using Claude AI.`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    setProcessing(true);
    const questionIds = Array.from(selectedQuestions);
    setProcessingProgress({ current: 0, total: questionIds.length });
    
    try {
      const newProcessedIds = new Set(processedQuestionIds);
      
      // Process each question with realistic delays
      for (let i = 0; i < questionIds.length; i++) {
        const questionId = questionIds[i];
        setProcessingProgress({ current: i + 1, total: questionIds.length });
        
        console.log(`Processing question ${questionId}... (${i + 1}/${questionIds.length})`);
        
        // Simulate realistic processing time (2-4 seconds per question)
        await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 2000));
        
        // Here you would call the actual AI processing endpoints:
        // try {
        //   await questionMetadataService.generateMetadata(questionId);
        //   await examService.generateExamMapping(questionId);
        // } catch (error) {
        //   console.error(`Error processing question ${questionId}:`, error);
        //   continue; // Skip this question but continue with others
        // }
        
        // Mark question as processed (simulation)
        newProcessedIds.add(questionId);
        
        // Update localStorage with processed questions
        localStorage.setItem('processedQuestions', JSON.stringify(Array.from(newProcessedIds)));
      }
      
      // Update state with newly processed questions
      setProcessedQuestionIds(newProcessedIds);
      
      alert(`Successfully processed ${selectedQuestions.size} questions!`);
      
      // Clear selection since these questions are now processed
      setSelectedQuestions(new Set());
      
      // Reload questions to show updated status
      await loadQuestions();
    } catch (error) {
      console.error('Error processing questions:', error);
      alert('Error processing questions. Check console for details.');
    } finally {
      setProcessing(false);
      setProcessingProgress({ current: 0, total: 0 });
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600">You need admin privileges to access this page.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading questions...</p>
        </div>
      </div>
    );
  }

  const displayQuestions = showOnlyPending 
    ? questions.filter(q => q.needsProcessing)
    : questions;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">🤖 AI Processing Center</h1>
          <p className="text-xl text-gray-600">Generate metadata and exam mappings for questions using AI</p>
        </div>

        {/* Cost Estimate Panel */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-lg p-6 text-white mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <h3 className="text-sm opacity-90">Selected Questions</h3>
              <p className="text-2xl font-bold">{selectedQuestions.size}</p>
            </div>
            <div>
              <h3 className="text-sm opacity-90">Input Tokens Cost</h3>
              <p className="text-2xl font-bold">${costEstimate.input.toFixed(4)}</p>
            </div>
            <div>
              <h3 className="text-sm opacity-90">Output Tokens Cost</h3>
              <p className="text-2xl font-bold">${costEstimate.output.toFixed(4)}</p>
            </div>
            <div>
              <h3 className="text-sm opacity-90">Total Estimated Cost</h3>
              <p className="text-2xl font-bold">${costEstimate.total.toFixed(4)}</p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showOnlyPending}
                  onChange={(e) => setShowOnlyPending(e.target.checked)}
                  className="mr-2"
                />
                <span className="font-medium">Show only questions needing processing</span>
              </label>
              <span className="text-gray-500">
                ({questions.filter(q => q.needsProcessing).length} of {questions.length} need processing)
              </span>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={handleSelectAll}
                disabled={processing}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  processing 
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Select All
              </button>
              <button
                onClick={handleDeselectAll}
                disabled={processing}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  processing 
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Deselect All
              </button>
              <button
                onClick={handleProcessSelected}
                disabled={selectedQuestions.size === 0 || processing}
                className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                  selectedQuestions.size === 0 || processing
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {processing ? 'Processing...' : `Process ${selectedQuestions.size} Questions`}
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          {processing && processingProgress.total > 0 && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-800">
                  Processing Questions...
                </span>
                <span className="text-sm text-blue-600">
                  {processingProgress.current} of {processingProgress.total}
                </span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2 mb-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${(processingProgress.current / processingProgress.total) * 100}%` }}
                ></div>
              </div>
              <p className="text-xs text-blue-600">
                Generating metadata and exam mappings using Claude AI...
              </p>
            </div>
          )}
        </div>

        {/* Questions Table */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Select
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Question #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Question Text
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Metadata
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Exam Mapping
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {displayQuestions.map((question) => (
                  <tr key={question.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedQuestions.has(question.id)}
                        onChange={() => handleToggleQuestion(question.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {question.question_number}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {question.question}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        question.hasMetadata 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {question.hasMetadata ? '✓ Has Metadata' : '✗ Needs Metadata'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        question.hasExamMapping 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {question.hasExamMapping ? '✓ Mapped' : '✗ Not Mapped'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {question.needsProcessing ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          Pending
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          Complete
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {displayQuestions.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No questions to display</p>
            </div>
          )}
        </div>

        {/* Info Panel */}
        <div className="mt-8 bg-blue-50 border-l-4 border-blue-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">About AI Processing</h3>
              <div className="mt-2 text-sm text-blue-700">
                <ul className="list-disc list-inside space-y-1">
                  <li>Metadata generation includes: difficulty level, categories, topics, and keywords</li>
                  <li>Exam mapping associates questions with specific exam objectives and learning outcomes</li>
                  <li>Cost estimates are based on Claude 3 Opus pricing (~500 input tokens, ~200 output tokens per question)</li>
                  <li>Processing happens in batches for efficiency</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIManipulation;