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

interface PaginationInfo {
  limit: number;
  offset: number;
  total: number;
  hasMore: boolean;
}

const ReviewImages: React.FC = () => {
  const { isReviewer, isAdmin, token } = useAuth();
  const navigate = useNavigate();
  const [images, setImages] = useState<Image[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo>({
    limit: 20,
    offset: 0,
    total: 0,
    hasMore: false
  });

  // Redirect if not authorized
  useEffect(() => {
    if (!isReviewer && !isAdmin) {
      navigate('/');
      return;
    }
  }, [isReviewer, isAdmin, navigate]);

  const fetchImages = useCallback(async (offset = 0) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(
        `http://localhost:3001/api/images?limit=${pagination.limit}&offset=${offset}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch images');
      }

      const data = await response.json();
      setImages(data.images);
      setPagination(data.pagination);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [pagination.limit, token]);

  useEffect(() => {
    if (isReviewer || isAdmin) {
      fetchImages();
    }
  }, [isReviewer, isAdmin, fetchImages]);

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

  const handlePrevPage = () => {
    const newOffset = Math.max(0, pagination.offset - pagination.limit);
    fetchImages(newOffset);
  };

  const handleNextPage = () => {
    const newOffset = pagination.offset + pagination.limit;
    fetchImages(newOffset);
  };

  const getImageUrl = (filename: string) => {
    return `http://localhost:3001/api/images/serve/${filename}`;
  };

  const isImage = (mimeType: string): boolean => {
    return mimeType.startsWith('image/');
  };

  const isVideo = (mimeType: string): boolean => {
    return mimeType.startsWith('video/');
  };

  if (!isReviewer && !isAdmin) {
    return null; // Will redirect
  }

  if (loading && images.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center">
          <div className="text-lg">Loading images...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Error: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Review Images</h1>
        <p className="text-gray-600">
          Review and manage all uploaded images in the system
        </p>
      </div>

      {/* Summary Stats */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{pagination.total}</div>
            <div className="text-sm text-gray-600">Total Images</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {images.filter(img => img.image_type === 'still').length}
            </div>
            <div className="text-sm text-gray-600">Still Images</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {images.filter(img => img.image_type === 'cine').length}
            </div>
            <div className="text-sm text-gray-600">Cine Clips</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {images.filter(img => !img.description).length}
            </div>
            <div className="text-sm text-gray-600">No Description</div>
          </div>
        </div>
      </div>

      {/* Images Grid */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {images.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No images found
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Preview
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      License
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Upload Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {images.map((image) => (
                    <tr key={image.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex-shrink-0 h-12 w-12">
                          {isImage(image.mime_type) ? (
                            <img
                              src={getImageUrl(image.filename)}
                              alt={image.original_name}
                              className="h-12 w-12 object-cover rounded border"
                            />
                          ) : isVideo(image.mime_type) ? (
                            <video
                              src={getImageUrl(image.filename)}
                              className="h-12 w-12 object-cover rounded border"
                              muted
                            />
                          ) : (
                            <div className="h-12 w-12 bg-gray-200 rounded border flex items-center justify-center">
                              <span className="text-xs text-gray-500">File</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900 truncate max-w-xs">
                            {image.original_name}
                          </div>
                          <div className="text-gray-500">
                            {formatFileSize(image.file_size)} • {image.mime_type}
                          </div>
                          {image.tags && image.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {image.tags.slice(0, 3).map((tag, index) => (
                                <span
                                  key={index}
                                  className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded"
                                >
                                  {tag}
                                </span>
                              ))}
                              {image.tags.length > 3 && (
                                <span className="text-xs text-gray-500">
                                  +{image.tags.length - 3} more
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          image.image_type === 'still' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {image.image_type === 'still' ? 'Still' : 'Cine'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs">
                          {image.description ? (
                            <p className="truncate">{image.description}</p>
                          ) : (
                            <span className="text-gray-400 italic">No description</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">
                          {image.license}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(image.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
              <div className="flex items-center">
                <p className="text-sm text-gray-700">
                  Showing {pagination.offset + 1} to {Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total} images
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handlePrevPage}
                  disabled={pagination.offset === 0}
                  className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={handleNextPage}
                  disabled={!pagination.hasMore}
                  className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ReviewImages;