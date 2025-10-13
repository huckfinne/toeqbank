import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Question } from '../types';
import { imageService } from '../services/api';

interface QuestionCardProps {
  question: Question;
  questionNumber: number;
  showAnswer?: boolean;
  onAnswerSelect: (answer: string) => void;
  selectedAnswer: string;
  isReviewMode?: boolean;
  showExplanation?: boolean;
}

const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  questionNumber,
  showAnswer = false,
  onAnswerSelect,
  selectedAnswer,
  isReviewMode = false,
  showExplanation = false
}) => {
  const choices = [
    { letter: 'A', text: question.choice_a },
    { letter: 'B', text: question.choice_b },
    { letter: 'C', text: question.choice_c },
    { letter: 'D', text: question.choice_d },
    { letter: 'E', text: question.choice_e },
    { letter: 'F', text: question.choice_f },
    { letter: 'G', text: question.choice_g },
  ].filter(choice => choice.text && choice.text.trim() !== '');

  const getChoiceClassName = (choiceLetter: string) => {
    let className = 'choice';
    
    if (selectedAnswer === choiceLetter) {
      className += ' selected';
    }
    
    if (showAnswer || showExplanation) {
      if (choiceLetter === question.correct_answer) {
        className += ' correct';
      } else if (selectedAnswer === choiceLetter && choiceLetter !== question.correct_answer) {
        className += ' incorrect';
      }
    }
    
    return className;
  };

  return (
    <div className="question-card">
      <div className="question-header">
        <h3>Question {questionNumber}</h3>
        {question.question_number && (
          <span className="question-id">#{question.question_number}</span>
        )}
      </div>
      
      <div className="question-text">
        {question.question}
      </div>
      
      {question.images && question.images.length > 0 && (
        <div className="question-images mb-4">
          <div className="w-full" style={{ width: '60vw', maxWidth: '60vw' }}>
            {question.images.map((image, index) => (
              <div key={image.id || index} className="mb-6">
                <div className="image-container relative">
                  <div className="bg-gray-100 rounded-lg overflow-hidden" style={{ width: '100%' }}>
                    {image.mime_type.startsWith('video/') ? (
                      <video
                        src={imageService.getImageUrl(image.file_path || image.filename)}
                        className="w-full h-auto object-contain"
                        controls
                        loop
                        style={{ width: '100%', height: 'auto' }}
                      />
                    ) : (
                      <img
                        src={imageService.getImageUrl(image.file_path || image.filename)}
                        alt={image.description || `Question image ${index + 1}`}
                        className="w-full h-auto object-contain"
                        style={{ width: '100%', height: 'auto' }}
                        onError={(e) => {
                          const img = e.currentTarget;
                          img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"%3E%3Crect fill="%23f0f0f0" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999" font-family="sans-serif" font-size="20"%3EImage Not Available%3C/text%3E%3C/svg%3E';
                        }}
                      />
                    )}
                  </div>
                      
                  <div className="absolute top-2 left-2">
                    <span className={`px-2 py-1 text-xs font-semibold rounded ${
                      image.image_type === 'cine' 
                        ? 'bg-purple-100 text-purple-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {image.image_type === 'cine' ? 'CINE' : 'STILL'}
                    </span>
                  </div>
                  
                  {image.duration_seconds && (
                    <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white px-2 py-1 text-xs rounded">
                      {image.duration_seconds}s
                    </div>
                  )}
                </div>
                
                {/* Image metadata below the image */}
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  {image.description && (
                    <div className="text-sm text-gray-600 mb-2">
                      <strong>Description:</strong> {image.description}
                    </div>
                  )}
                  
                  <div className="text-xs text-gray-500 flex items-center justify-between">
                    <span>{imageService.getLicenseInfo(image.license).name}</span>
                    {imageService.getLicenseInfo(image.license).requiresAttribution && (
                      <span className="text-orange-600" title="Attribution required">⚠</span>
                    )}
                  </div>
                  
                  <div className="mt-2 text-xs text-gray-500">
                    <div>Image #{index + 1}</div>
                    {image.image_type && (
                      <div>Type: {image.image_type.toUpperCase()}</div>
                    )}
                    {image.duration_seconds && (
                      <div>Duration: {image.duration_seconds}s</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="choices">
        {choices.map((choice) => (
          <div
            key={choice.letter}
            className={getChoiceClassName(choice.letter)}
            onClick={() => !isReviewMode && onAnswerSelect(choice.letter)}
          >
            <span className="choice-letter">{choice.letter}.</span>
            <span className="choice-text">{choice.text}</span>
          </div>
        ))}
      </div>
      
      {(showAnswer || showExplanation) && (
        <div className="answer-section">
          <div className="correct-answer">
            <strong>Correct Answer: {question.correct_answer}</strong>
          </div>
          
          {question.explanation && (showExplanation || isReviewMode) && (
            <div className="explanation">
              <h4>Explanation:</h4>
              <div className="markdown-content">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {question.explanation}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      )}
      
      {question.source_folder && (
        <div className="question-source">
          Source: {question.source_folder}
        </div>
      )}
    </div>
  );
};

export default QuestionCard;