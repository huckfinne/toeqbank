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

  const startTest = async (questionCount: number = 20) => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch random questions
      const response = await questionService.getQuestions(questionCount, 0);
      
      if (response.questions.length === 0) {
        setError('No questions available. Please upload some questions first.');
        return;
      }

      // Shuffle questions
      const shuffledQuestions = [...response.questions].sort(() => Math.random() - 0.5);
      
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
    return (
      <div className="practice-test-start">
        <h2>Practice Test</h2>
        <p>Test your knowledge with a randomized set of questions.</p>
        
        <div className="test-options">
          <h3>Select Test Length:</h3>
          <div className="test-buttons">
            <button onClick={() => startTest(10)} className="test-option">
              Quick Test (10 questions)
            </button>
            <button onClick={() => startTest(20)} className="test-option">
              Standard Test (20 questions)
            </button>
            <button onClick={() => startTest(50)} className="test-option">
              Long Test (50 questions)
            </button>
          </div>
        </div>
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