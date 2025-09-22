import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface Image {
  id: number;
  filename: string;
  original_name: string;
  file_size: number;
  mime_type: string;
  image_type: 'still' | 'cine';
  description: string | null;
  tags: string[];
  license: string;
  license_details: string | null;
  source_url: string | null;
  uploaded_by: number | null;
  created_at: string;
  updated_at: string;
}

interface ReviewStats {
  total: number;
  reviewed: number;
  remaining: number;
}

interface ImageUploader {
  id: number;
  username: string;
  image_count: number;
}

const ReviewImages: React.FC = () => {
  const { isReviewer, isAdmin, token } = useAuth();
  const navigate = useNavigate();
  const [currentImage, setCurrentImage] = useState<Image | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [stats, setStats] = useState<ReviewStats>({
    total: 0,
    reviewed: 0,
    remaining: 0
  });
  const [uploaders, setUploaders] = useState<ImageUploader[]>([]);
  const [selectedUploader, setSelectedUploader] = useState<number | null>(null);

  // Redirect if not authorized
  useEffect(() => {
    if (!isReviewer && !isAdmin) {
      navigate('/');
      return;
    }
  }, [isReviewer, isAdmin, navigate]);

  const fetchNextImageToReview = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Build URL with optional user filter
      let url = `http://localhost:3001/api/images/next-for-review`;
      if (selectedUploader) {
        url += `?uploaded_by=${selectedUploader}`;
      }
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          setCurrentImage(null);
          return;
        }
        throw new Error('Failed to fetch next image for review');
      }

      const data = await response.json();
      setCurrentImage(data.image);
      setStats(data.stats);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, selectedUploader]);

  const submitReview = async (imageId: number, rating: number) => {
    try {
      setSubmitting(true);
      setError(null);

      let status: string;
      if (rating >= 8) {
        status = 'approved';
      } else if (rating <= 5) {
        status = 'rejected';
      } else { // 6 or 7
        status = 'needs_revision';
      }

      const response = await fetch(
        `http://localhost:3001/api/images/${imageId}/review`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ rating, status })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to submit review');
      }

      // Automatically fetch next image
      await fetchNextImageToReview();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const loadUploaders = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:3001/api/images/uploaders', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const uploadersData = await response.json();
        setUploaders(uploadersData);
      }
    } catch (err) {
      console.error('Failed to load uploaders:', err);
    }
  }, [token]);

  useEffect(() => {
    if (isReviewer || isAdmin) {
      fetchNextImageToReview();
      loadUploaders();
    }
  }, [isReviewer, isAdmin, fetchNextImageToReview, loadUploaders]);

  // Reload images when uploader filter changes
  useEffect(() => {
    if ((isReviewer || isAdmin) && selectedUploader !== null) {
      fetchNextImageToReview();
    }
  }, [selectedUploader, isReviewer, isAdmin, fetchNextImageToReview]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRatingColor = (rating: number): string => {
    if (rating >= 8) return 'bg-green-500 hover:bg-green-600 text-white';
    if (rating <= 5) return 'bg-red-500 hover:bg-red-600 text-white';
    return 'bg-yellow-500 hover:bg-yellow-600 text-white';
  };

  const getRatingLabel = (rating: number): string => {
    if (rating >= 8) return 'APPROVE';
    if (rating <= 5) return 'REJECT';
    return 'REVISE';
  };

  const getImageUrl = (filename: string) => {
    return `http://localhost:3001/api/images/serve/${filename}`;
  };

  if (!isReviewer && !isAdmin) {
    return null; // Will redirect
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Loading next image for review...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-lg max-w-md">
          <h3 className="font-bold mb-2">Error</h3>
          <p>{error}</p>
          <button 
            onClick={() => fetchNextImageToReview()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!currentImage) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">All Images Reviewed!</h2>
          <p className="text-lg text-gray-600 mb-4">Great job! There are no more images pending review.</p>
          <div className="bg-white rounded-lg shadow-md p-6 inline-block">
            <div className="grid grid-cols-3 gap-8 text-center">
              <div>
                <div className="text-3xl font-bold text-blue-600">{stats.total}</div>
                <div className="text-sm text-gray-600">Total Images</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-green-600">{stats.reviewed}</div>
                <div className="text-sm text-gray-600">Reviewed</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-gray-600">{stats.remaining}</div>
                <div className="text-sm text-gray-600">Remaining</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isImage = (mimeType: string): boolean => {
    return mimeType.startsWith('image/');
  };

  const isVideo = (mimeType: string): boolean => {
    return mimeType.startsWith('video/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Progress */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Image Review</h1>
              <p className="text-gray-600">Rate images from 0-10 to approve, reject, or request revision</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Progress</div>
              <div className="text-xl font-bold text-blue-600">
                {stats.reviewed} / {stats.total}
              </div>
              <div className="w-32 bg-gray-200 rounded-full h-2 mt-1">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(stats.reviewed / stats.total) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
          
          {/* User Filter */}
          {isAdmin && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-4">
                <label htmlFor="uploader-select" className="text-sm font-medium text-gray-700">
                  Filter by uploader:
                </label>
                <select
                  id="uploader-select"
                  value={selectedUploader || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSelectedUploader(value ? parseInt(value) : null);
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All uploaders</option>
                  {uploaders.map((uploader) => (
                    <option key={uploader.id} value={uploader.id}>
                      {uploader.username} ({uploader.image_count} images)
                    </option>
                  ))}
                </select>
                {selectedUploader && (
                  <span className="text-sm text-gray-600">
                    Reviewing images from {uploaders.find(u => u.id === selectedUploader)?.username}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Review Interface */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Image Display - Perfect Size Container */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div 
                className="relative bg-gray-100 flex items-center justify-center"
                style={{
                  width: '100%',
                  maxWidth: '1200px',
                  height: '1000px',
                  margin: '0 auto'
                }}
              >
                {isImage(currentImage.mime_type) ? (
                  <img
                    src={getImageUrl(currentImage.filename)}
                    alt={currentImage.original_name}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      width: 'auto',
                      height: 'auto',
                      objectFit: 'contain'
                    }}
                    className="rounded"
                  />
                ) : isVideo(currentImage.mime_type) ? (
                  <video
                    src={getImageUrl(currentImage.filename)}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      width: 'auto',
                      height: 'auto',
                      objectFit: 'contain'
                    }}
                    className="rounded"
                    controls
                    muted
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-gray-500 text-lg">Unsupported file type</span>
                  </div>
                )}
                
                {/* Type Badge */}
                <div className="absolute top-4 left-4">
                  <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                    currentImage.image_type === 'still' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-purple-100 text-purple-800'
                  }`}>
                    {currentImage.image_type === 'still' ? 'Still Image' : 'Cine Clip'}
                  </span>
                </div>
              </div>
            </div>

            {/* Image Details & Rating */}
            <div className="space-y-6">
              
              {/* Image Info */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Image Details</h3>
                
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Filename</label>
                    <p className="text-gray-900">{currentImage.original_name}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Size</label>
                      <p className="text-gray-900">{formatFileSize(currentImage.file_size)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Type</label>
                      <p className="text-gray-900">{currentImage.mime_type}</p>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500">License</label>
                    <p className="text-gray-900">{currentImage.license}</p>
                  </div>
                  
                  {currentImage.description && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Description</label>
                      <p className="text-gray-900">{currentImage.description}</p>
                    </div>
                  )}
                  
                  {currentImage.tags && currentImage.tags.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Tags</label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {currentImage.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500">Uploaded</label>
                    <p className="text-gray-900">{formatDate(currentImage.created_at)}</p>
                  </div>
                  
                  {(currentImage as any).uploader_username && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Uploaded by</label>
                      <p className="text-gray-900">{(currentImage as any).uploader_username}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Rating Scale */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Rate This Image</h3>
                <p className="text-sm text-gray-600 mb-6">
                  • <span className="font-medium text-red-600">0-5: Reject</span> (Poor quality, inappropriate, or violates guidelines)<br/>
                  • <span className="font-medium text-yellow-600">6-7: Needs Revision</span> (Good potential but needs improvement)<br/>
                  • <span className="font-medium text-green-600">8-10: Approve</span> (Excellent quality and appropriate for use)
                </p>
                
                <div className="grid grid-cols-11 gap-2">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => (
                    <button
                      key={rating}
                      onClick={() => submitReview(currentImage.id, rating)}
                      disabled={submitting}
                      className={`
                        relative h-12 rounded-lg font-bold transition-all duration-200
                        ${getRatingColor(rating)}
                        ${submitting ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 hover:shadow-lg'}
                        disabled:hover:scale-100 disabled:hover:shadow-none
                      `}
                    >
                      <div className="text-lg">{rating}</div>
                      <div className="text-xs opacity-90">{getRatingLabel(rating)}</div>
                    </button>
                  ))}
                </div>
                
                {submitting && (
                  <div className="mt-4 text-center">
                    <div className="inline-flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                      <span className="text-sm text-gray-600">Submitting review...</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewImages;