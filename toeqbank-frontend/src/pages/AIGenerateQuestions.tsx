import React, { useState, useEffect } from 'react';
import { imageService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import './AIGenerateQuestions.css';

interface SelectedImage {
  id: number;
  filename: string;
  description?: string;
  file_path: string;
}

const AIGenerateQuestions: React.FC = () => {
  const [images, setImages] = useState<SelectedImage[]>([]);
  const [selectedImages, setSelectedImages] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }
    loadImages();
  }, [isAdmin, navigate]);

  const loadImages = async () => {
    setLoading(true);
    try {
      const response = await imageService.getImages({ limit: 100 });
      setImages(response.images as SelectedImage[]);
    } catch (err) {
      setError('Failed to load images');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleImageToggle = (imageId: number) => {
    setSelectedImages(prev =>
      prev.includes(imageId)
        ? prev.filter(id => id !== imageId)
        : [...prev, imageId]
    );
  };

  const handleSelectAll = () => {
    if (selectedImages.length === filteredImages.length) {
      setSelectedImages([]);
    } else {
      setSelectedImages(filteredImages.map(img => img.id));
    }
  };

  const handleGenerateQuestions = async () => {
    if (selectedImages.length === 0) {
      setError('Please select at least one image');
      return;
    }

    setGenerating(true);
    setError(null);
    setGeneratedQuestions([]);

    try {
      // TODO: Implement API call to generate questions from images
      // This would call a new endpoint that uses AI to analyze images and generate questions
      // For now, showing a placeholder message
      setError('AI question generation endpoint not yet implemented. This feature will analyze selected images and generate relevant questions.');
    } catch (err) {
      setError('Failed to generate questions');
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  const filteredImages = images.filter(img =>
    img.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (img.description && img.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="ai-generate-questions">
      <div className="page-header">
        <h2>AI Generate Questions from Images</h2>
        <p>Select images to automatically generate questions using AI analysis</p>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      <div className="controls-section">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search images by filename or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="action-buttons">
          <button
            onClick={handleSelectAll}
            className="btn btn-secondary"
            disabled={loading}
          >
            {selectedImages.length === filteredImages.length ? 'Deselect All' : 'Select All'}
          </button>
          <button
            onClick={handleGenerateQuestions}
            className="btn btn-primary"
            disabled={loading || generating || selectedImages.length === 0}
          >
            {generating ? 'Generating...' : `Generate Questions (${selectedImages.length} selected)`}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading images...</p>
        </div>
      ) : (
        <div className="image-grid">
          {filteredImages.map((image) => (
            <div
              key={image.id}
              className={`image-card ${selectedImages.includes(image.id) ? 'selected' : ''}`}
              onClick={() => handleImageToggle(image.id)}
            >
              <div className="image-container">
                <img
                  src={imageService.getImageUrl(image.filename)}
                  alt={image.description || image.filename}
                  loading="lazy"
                />
                {selectedImages.includes(image.id) && (
                  <div className="selection-overlay">
                    <svg className="checkmark" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="image-info">
                <p className="image-filename">{image.filename}</p>
                {image.description && (
                  <p className="image-description">{image.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {generatedQuestions.length > 0 && (
        <div className="generated-questions">
          <h3>Generated Questions</h3>
          {/* TODO: Display generated questions here */}
        </div>
      )}
    </div>
  );
};

export default AIGenerateQuestions;