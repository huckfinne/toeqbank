import React from 'react';
import { TestSession } from '../types';
import QuestionCard from './QuestionCard';

interface TestResultsProps {
  testSession: TestSession;
  onRestartTest: () => void;
}

const TestResults: React.FC<TestResultsProps> = ({ testSession, onRestartTest }) => {
  const { questions, userAnswers } = testSession;
  const correctAnswers = userAnswers.filter(answer => answer?.isCorrect).length;
  const totalQuestions = questions.length;
  const scorePercentage = Math.round((correctAnswers / totalQuestions) * 100);
  
  const totalTime = Math.floor((Date.now() - testSession.startTime.getTime()) / 1000);
  const averageTimePerQuestion = Math.round(totalTime / totalQuestions);

  const getScoreColor = () => {
    if (scorePercentage >= 80) return '#4CAF50'; // Green
    if (scorePercentage >= 60) return '#FF9800'; // Orange
    return '#F44336'; // Red
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="test-results">
      <div className="results-header">
        <h2>Test Results</h2>
        
        <div className="score-summary">
          <div className="score-circle" style={{ borderColor: getScoreColor() }}>
            <span className="score-percentage" style={{ color: getScoreColor() }}>
              {scorePercentage}%
            </span>
            <span className="score-fraction">
              {correctAnswers}/{totalQuestions}
            </span>
          </div>
          
          <div className="score-details">
            <div className="score-item">
              <span className="label">Correct Answers:</span>
              <span className="value">{correctAnswers}</span>
            </div>
            <div className="score-item">
              <span className="label">Total Questions:</span>
              <span className="value">{totalQuestions}</span>
            </div>
            <div className="score-item">
              <span className="label">Total Time:</span>
              <span className="value">{formatTime(totalTime)}</span>
            </div>
            <div className="score-item">
              <span className="label">Avg. Time/Question:</span>
              <span className="value">{formatTime(averageTimePerQuestion)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="results-actions">
        <button onClick={onRestartTest} className="primary-button">
          Take Another Test
        </button>
      </div>

      <div className="question-review">
        <h3>Question Review</h3>
        {questions.map((question, index) => {
          const userAnswer = userAnswers[index];
          return (
            <div key={question.id} className="result-question">
              <QuestionCard
                question={question}
                questionNumber={index + 1}
                showAnswer={true}
                showExplanation={true}
                onAnswerSelect={() => {}} // No interaction in results
                selectedAnswer={userAnswer?.selectedAnswer || ''}
                isReviewMode={true}
              />
              
              <div className="answer-result">
                {userAnswer?.isCorrect ? (
                  <div className="result-correct">✓ Correct</div>
                ) : (
                  <div className="result-incorrect">✗ Incorrect</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TestResults;