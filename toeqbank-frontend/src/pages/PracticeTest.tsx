import React, { useState, useEffect } from 'react';
import { questionService } from '../services/api';
import QuestionCard from '../components/QuestionCard';
import TestResults from '../components/TestResults';
import { UserAnswer, TestSession } from '../types';
import { useAuth } from '../contexts/AuthContext';

const PracticeTest: React.FC = () => {
  const { isAdmin } = useAuth();
  const [testSession, setTestSession] = useState<TestSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testCompleted, setTestCompleted] = useState(false);
  const [approvedCount, setApprovedCount] = useState<number>(0);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [checkingQuestions, setCheckingQuestions] = useState(true);
  const [showPendingQuestions, setShowPendingQuestions] = useState(false);
  const [questionCount, setQuestionCount] = useState<number>(2);

  useEffect(() => {
    // Check for approved and pending questions on component mount
    const checkQuestions = async () => {
      try {
        const approvedResponse = await questionService.getQuestionsByReviewStatus('approved');
        setApprovedCount(approvedResponse.questions.length);
        
        if (isAdmin) {
          const pendingResponse = await questionService.getQuestionsByReviewStatus('pending');
          setPendingCount(pendingResponse.questions.length);
        }
      } catch (err) {
        console.error('Failed to check questions:', err);
      } finally {
        setCheckingQuestions(false);
      }
    };
    checkQuestions();
  }, [isAdmin]);

  const startTest = async (questionCount: number = 2) => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch questions based on admin toggle
      const status = isAdmin && showPendingQuestions ? 'pending' : 'approved';
      const response = await questionService.getQuestionsByReviewStatus(status);
      
      if (response.questions.length === 0) {
        const message = showPendingQuestions 
          ? 'No pending questions available for review.'
          : 'No approved questions available yet. Questions must be reviewed and approved before they appear in the Question Bank.';
        setError(message);
        return;
      }

      // Shuffle and limit to requested count
      const shuffledQuestions = [...response.questions]
        .sort(() => Math.random() - 0.5)
        .slice(0, Math.min(questionCount, response.questions.length));
      
      const newSession: TestSession = {
        id: Date.now().toString(),
        questions: shuffledQuestions,
        userAnswers: [],
        currentQuestionIndex: 0,
        startTime: new Date(),
        isCompleted: false
      };

      setTestSession(newSession);
      setTestCompleted(false);
    } catch (err) {
      setError('Failed to start test. Please make sure the backend server is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (answer: string) => {
    if (!testSession || testCompleted) return;

    const currentQuestion = testSession.questions[testSession.currentQuestionIndex];
    const isCorrect = answer === currentQuestion.correct_answer;
    
    const userAnswer: UserAnswer = {
      questionId: currentQuestion.id!,
      selectedAnswer: answer,
      isCorrect,
      timeSpent: Math.floor((Date.now() - testSession.startTime.getTime()) / 1000)
    };

    const updatedAnswers = [...testSession.userAnswers];
    updatedAnswers[testSession.currentQuestionIndex] = userAnswer;

    setTestSession({
      ...testSession,
      userAnswers: updatedAnswers
    });
  };

  const nextQuestion = () => {
    if (!testSession) return;

    if (testSession.currentQuestionIndex < testSession.questions.length - 1) {
      setTestSession({
        ...testSession,
        currentQuestionIndex: testSession.currentQuestionIndex + 1
      });
    } else {
      // Test completed
      setTestSession({
        ...testSession,
        isCompleted: true
      });
      setTestCompleted(true);
    }
  };

  const previousQuestion = () => {
    if (!testSession || testSession.currentQuestionIndex === 0) return;

    setTestSession({
      ...testSession,
      currentQuestionIndex: testSession.currentQuestionIndex - 1
    });
  };

  const getCurrentAnswer = (): string => {
    if (!testSession) return '';
    return testSession.userAnswers[testSession.currentQuestionIndex]?.selectedAnswer || '';
  };

  const isCurrentQuestionAnswered = (): boolean => {
    return getCurrentAnswer() !== '';
  };

  if (loading) {
    return <div className="loading">Loading test...</div>;
  }

  if (error) {
    return (
      <div className="error">
        <p>{error}</p>
        <button onClick={() => startTest()}>Try Again</button>
      </div>
    );
  }

  if (!testSession) {
    if (checkingQuestions) {
      return <div className="loading">Checking available questions...</div>;
    }

    return (
      <div className="practice-test-start">
        <h2>Question Bank</h2>
        
        {isAdmin && (
          <div style={{
            backgroundColor: '#f0f0f0',
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showPendingQuestions}
                onChange={(e) => setShowPendingQuestions(e.target.checked)}
                style={{ marginRight: '0.5rem' }}
              />
              <span>Show pending questions instead of approved</span>
            </label>
            <span style={{ 
              color: showPendingQuestions ? '#ff9800' : '#27ae60',
              fontWeight: 'bold'
            }}>
              ({showPendingQuestions ? `${pendingCount} pending` : `${approvedCount} approved`} questions)
            </span>
          </div>
        )}
        
        {(showPendingQuestions ? pendingCount : approvedCount) > 0 ? (
          <>
            <p>
              {showPendingQuestions 
                ? 'Practice with pending questions that need review.'
                : 'Test your knowledge with approved questions from the question bank.'}
            </p>
            <p style={{ 
              color: showPendingQuestions ? '#ff9800' : '#27ae60', 
              fontWeight: 'bold', 
              marginTop: '0.5rem' 
            }}>
              {showPendingQuestions ? pendingCount : approvedCount} {showPendingQuestions ? 'pending' : 'approved'} questions available
            </p>
            
            <div className="test-options">
              <h3>Test Configuration:</h3>
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '1rem',
                alignItems: 'center',
                marginTop: '1.5rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <label htmlFor="question-count" style={{ fontWeight: 'bold' }}>
                    Number of Questions:
                  </label>
                  <input
                    id="question-count"
                    type="number"
                    min="1"
                    max={Math.min(50, showPendingQuestions ? pendingCount : approvedCount)}
                    value={questionCount}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 1;
                      const maxAvailable = showPendingQuestions ? pendingCount : approvedCount;
                      setQuestionCount(Math.min(Math.max(1, value), Math.min(50, maxAvailable)));
                    }}
                    style={{
                      padding: '0.5rem',
                      fontSize: '1rem',
                      width: '80px',
                      borderRadius: '4px',
                      border: '1px solid #ccc'
                    }}
                  />
                  <span style={{ color: '#666', fontSize: '0.9rem' }}>
                    (max: {Math.min(50, showPendingQuestions ? pendingCount : approvedCount)})
                  </span>
                </div>
                <button 
                  onClick={() => startTest(questionCount)} 
                  className="test-option"
                  style={{
                    marginTop: '1rem',
                    padding: '0.75rem 2rem',
                    fontSize: '1.1rem',
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                >
                  Start Test ({questionCount} question{questionCount !== 1 ? 's' : ''})
                </button>
              </div>
            </div>
          </>
        ) : (
          <div style={{ 
            backgroundColor: '#fff3cd', 
            border: '1px solid #ffeeba',
            borderRadius: '8px',
            padding: '1.5rem',
            marginTop: '2rem'
          }}>
            <h3 style={{ color: '#856404', marginBottom: '1rem' }}>
              No {showPendingQuestions ? 'Pending' : 'Approved'} Questions Available
            </h3>
            <p style={{ color: '#856404', marginBottom: '0.5rem' }}>
              {showPendingQuestions 
                ? 'There are no pending questions to review at this time.'
                : 'The Question Bank is currently empty because no questions have been approved yet.'}
            </p>
            {!showPendingQuestions && (
              <p style={{ color: '#856404' }}>
                Questions must be reviewed and approved by an administrator before they appear here.
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  if (testCompleted) {
    return <TestResults testSession={testSession} onRestartTest={() => {
      setTestSession(null);
      setTestCompleted(false);
    }} />;
  }

  const currentQuestion = testSession.questions[testSession.currentQuestionIndex];
  const progress = ((testSession.currentQuestionIndex + 1) / testSession.questions.length) * 100;

  return (
    <div className="practice-test">
      <div className="test-header">
        <h2>Practice Test</h2>
        <div className="test-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <span className="progress-text">
            Question {testSession.currentQuestionIndex + 1} of {testSession.questions.length}
          </span>
        </div>
      </div>

      <QuestionCard
        question={currentQuestion}
        questionNumber={testSession.currentQuestionIndex + 1}
        onAnswerSelect={handleAnswerSelect}
        selectedAnswer={getCurrentAnswer()}
        showAnswer={false}
        isReviewMode={false}
      />

      <div className="test-navigation">
        <button
          onClick={previousQuestion}
          disabled={testSession.currentQuestionIndex === 0}
          className="nav-button"
        >
          Previous
        </button>

        <div className="question-status">
          {testSession.userAnswers.filter(a => a).length} / {testSession.questions.length} answered
        </div>

        <button
          onClick={nextQuestion}
          disabled={!isCurrentQuestionAnswered()}
          className="nav-button primary"
        >
          {testSession.currentQuestionIndex === testSession.questions.length - 1 ? 'Finish Test' : 'Next'}
        </button>
      </div>
    </div>
  );
};

export default PracticeTest;