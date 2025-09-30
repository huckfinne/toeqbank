import React, { useState, useEffect } from 'react';
import { imageService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import './GenerateQuestionsFromImages.css';

interface SelectedImage {
  id: number;
  filename: string;
  description?: string;
  file_path?: string;
  has_questions?: boolean;
  uploader_username?: string;
}

interface ExpandedDescriptions {
  [key: number]: boolean;
}

interface ImageUploader {
  id: number;
  username: string;
  image_count: number;
}

const GenerateQuestionsFromImages: React.FC = () => {
  const [images, setImages] = useState<SelectedImage[]>([]);
  const [selectedImages, setSelectedImages] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedDescriptions, setExpandedDescriptions] = useState<ExpandedDescriptions>({});
  const [showImagesWithQuestions, setShowImagesWithQuestions] = useState(false);
  const [uploaders, setUploaders] = useState<ImageUploader[]>([]);
  const [selectedUploader, setSelectedUploader] = useState<number | null>(null);
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }
    loadImages();
    loadUploaders();
  }, [isAdmin, navigate]);

  // Reload images when uploader filter changes
  useEffect(() => {
    if (isAdmin) {
      loadImages();
    }
  }, [selectedUploader]);

  const loadImages = async () => {
    setLoading(true);
    try {
      const params: any = { limit: 100 };
      if (selectedUploader) {
        params.uploaded_by = selectedUploader;
        console.log('Loading images with uploader filter:', selectedUploader);
      }
      const response = await imageService.getImages(params);
      setImages(response.images as SelectedImage[]);
    } catch (err) {
      setError('Failed to load images');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadUploaders = async () => {
    try {
      const uploadersData = await imageService.getImageUploaders();
      setUploaders(uploadersData);
    } catch (err) {
      console.error('Failed to load uploaders:', err);
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

  const toggleDescriptionExpansion = (imageId: number, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent image selection toggle
    setExpandedDescriptions(prev => ({
      ...prev,
      [imageId]: !prev[imageId]
    }));
  };

  const isDescriptionTruncated = (description: string) => {
    return description && description.length > 100; // Threshold for showing "Read More"
  };

  const handleGenerateQuestions = () => {
    if (selectedImages.length === 0) {
      setError('Please select at least one image');
      return;
    }

    // Get the selected image objects
    const selectedImageObjects = images.filter(img => selectedImages.includes(img.id));
    
    // Navigate to create-question page with selected images as state
    navigate('/create-question', {
      state: {
        preloadedImages: selectedImageObjects,
        returnTo: '/generate-questions-from-images'
      }
    });
  };

  const filteredImages = images.filter(img => {
    // Filter by search term
    const matchesSearch = img.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (img.description && img.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Filter by whether image has questions
    const matchesQuestionFilter = showImagesWithQuestions || !img.has_questions;
    
    return matchesSearch && matchesQuestionFilter;
  });

  return (
    <div className="generate-questions-from-images">
      <div className="page-header">
        <h2>Generate Questions from Images</h2>
        <p>Select images to automatically generate questions using AI analysis</p>
        {images.length > 0 && (
          <div className="filter-stats">
            Showing {filteredImages.length} of {images.length} images
            {images.filter(img => img.has_questions).length > 0 && (
              <span className="stats-detail">
                {' '}({images.filter(img => img.has_questions).length} already have questions)
              </span>
            )}
          </div>
        )}
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

        <div className="filter-controls">
          <div className="filter-toggle">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={!showImagesWithQuestions}
                onChange={(e) => setShowImagesWithQuestions(!e.target.checked)}
                className="toggle-checkbox"
              />
              <span className="toggle-text">Hide images with existing questions</span>
            </label>
          </div>

          <div className="user-filter">
            <label htmlFor="uploader-select" className="filter-label">Filter by uploader:</label>
            <select
              id="uploader-select"
              value={selectedUploader || ''}
              onChange={(e) => {
                const value = e.target.value;
                setSelectedUploader(value ? parseInt(value) : null);
              }}
              className="filter-select"
            >
              <option value="">All uploaders</option>
              {uploaders.map((uploader) => (
                <option key={uploader.id} value={uploader.id}>
                  {uploader.username} ({uploader.image_count} images)
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="action-buttons">
          <button
            onClick={() => {
              loadImages();
              loadUploaders();
            }}
            className="btn btn-secondary"
            disabled={loading}
            title="Refresh the image list to get latest question associations"
          >
            🔄 Refresh
          </button>
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
            disabled={loading || selectedImages.length === 0}
          >
            {`Create Question (${selectedImages.length} selected)`}
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
              className={`image-card ${selectedImages.includes(image.id) ? 'selected' : ''} ${image.has_questions ? 'has-questions' : ''}`}
              onClick={() => handleImageToggle(image.id)}
            >
              <div className="image-container">
                {(() => {
                  const url = imageService.getImageUrl(image.file_path || image.filename);
                  const isVideo = image.filename.toLowerCase().endsWith('.mp4') || 
                                 image.filename.toLowerCase().endsWith('.webm') || 
                                 image.filename.toLowerCase().endsWith('.mov');
                  
                  if (isVideo) {
                    return (
                      <video
                        src={url}
                        className="w-full h-auto object-contain"
                        style={{ maxHeight: '200px', width: '100%' }}
                        controls
                        muted
                        onError={(e) => {
                          console.error('Video failed to load:', url);
                        }}
                      />
                    );
                  } else {
                    return (
                      <img
                        src={url}
                        alt={image.description || image.filename}
                        loading="lazy"
                        onError={(e) => {
                          const img = e.currentTarget;
                          console.error('Image failed to load:', img.src);
                          img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"%3E%3Crect fill="%23f0f0f0" width="200" height="200"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999" font-family="sans-serif" font-size="14"%3EImage Not Available%3C/text%3E%3C/svg%3E';
                        }}
                      />
                    );
                  }
                })()}
                {selectedImages.includes(image.id) && (
                  <div className="selection-overlay">
                    <svg className="checkmark" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
                {image.has_questions && (
                  <div className="has-questions-badge" title="This image already has associated questions">
                    <svg className="badge-icon" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="image-info">
                <p className="image-filename">{image.filename}</p>
                {image.uploader_username && (
                  <p className="image-contributor" style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '2px', marginBottom: '4px' }}>
                    By: {image.uploader_username}
                  </p>
                )}
                {image.description && (
                  <div className="description-container">
                    <p className={`image-description ${expandedDescriptions[image.id] ? 'expanded' : ''}`}>
                      {expandedDescriptions[image.id] 
                        ? image.description 
                        : isDescriptionTruncated(image.description)
                          ? `${image.description.substring(0, 100)}...`
                          : image.description
                      }
                    </p>
                    {isDescriptionTruncated(image.description) && (
                      <button
                        className="read-more-btn"
                        onClick={(e) => toggleDescriptionExpansion(image.id, e)}
                        title={expandedDescriptions[image.id] ? "Show less" : "Read full description"}
                      >
                        {expandedDescriptions[image.id] ? 'Show Less' : 'Read More'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};

export default GenerateQuestionsFromImages;