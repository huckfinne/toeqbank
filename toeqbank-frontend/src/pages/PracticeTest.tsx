import React, { useState, useEffect } from 'react';
import { questionService, Question } from '../services/api';
import QuestionCard from '../components/QuestionCard';
import TestResults from '../components/TestResults';
import { UserAnswer, TestSession } from '../types';

const PracticeTest: React.FC = () => {
  const [testSession, setTestSession] = useState<TestSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testCompleted, setTestCompleted] = useState(false);
  const [approvedCount, setApprovedCount] = useState<number>(0);
  const [checkingQuestions, setCheckingQuestions] = useState(true);

  useEffect(() => {
    // Check for approved questions on component mount
    const checkApprovedQuestions = async () => {
      try {
        const response = await questionService.getQuestionsByReviewStatus('approved');
        setApprovedCount(response.questions.length);
      } catch (err) {
        console.error('Failed to check approved questions:', err);
      } finally {
        setCheckingQuestions(false);
      }
    };
    checkApprovedQuestions();
  }, []);

  const startTest = async (questionCount: number = 20) => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch only approved questions
      const response = await questionService.getQuestionsByReviewStatus('approved');
      
      if (response.questions.length === 0) {
        setError('No approved questions available yet. Questions must be reviewed and approved before they appear in the Question Bank.');
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
        {approvedCount > 0 ? (
          <>
            <p>Test your knowledge with approved questions from the question bank.</p>
            <p style={{ color: '#27ae60', fontWeight: 'bold', marginTop: '0.5rem' }}>
              {approvedCount} approved questions available
            </p>
            
            <div className="test-options">
              <h3>Select Test Length:</h3>
              <div className="test-buttons">
                {approvedCount >= 10 && (
                  <button onClick={() => startTest(10)} className="test-option">
                    Quick Test (10 questions)
                  </button>
                )}
                {approvedCount >= 20 && (
                  <button onClick={() => startTest(20)} className="test-option">
                    Standard Test (20 questions)
                  </button>
                )}
                {approvedCount >= 50 && (
                  <button onClick={() => startTest(50)} className="test-option">
                    Long Test (50 questions)
                  </button>
                )}
                {approvedCount < 10 && (
                  <button onClick={() => startTest(approvedCount)} className="test-option">
                    Practice All ({approvedCount} questions)
                  </button>
                )}
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
            <h3 style={{ color: '#856404', marginBottom: '1rem' }}>No Approved Questions Available</h3>
            <p style={{ color: '#856404', marginBottom: '0.5rem' }}>
              The Question Bank is currently empty because no questions have been approved yet.
            </p>
            <p style={{ color: '#856404' }}>
              Questions must be reviewed and approved by an administrator before they appear here.
            </p>
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