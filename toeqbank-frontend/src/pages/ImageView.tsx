import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { imageService, Image } from '../services/api';

const ImageView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [image, setImage] = useState<Image | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadImage = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const imageData = await imageService.getImage(parseInt(id));
        setImage(imageData);
      } catch (err) {
        console.error('Failed to load image:', err);
        setError('Failed to load image');
      } finally {
        setLoading(false);
      }
    };

    loadImage();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading image...</p>
        </div>
      </div>
    );
  }

  if (error || !image) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Image Not Found</h2>
          <p className="text-gray-600 mb-4">{error || 'The requested image could not be found.'}</p>
          <button
            onClick={() => navigate('/images')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Back to Images
          </button>
        </div>
      </div>
    );
  }

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Image Details</h1>
            <p className="text-gray-600 mt-1">ID: {image.id}</p>
          </div>
          <button
            onClick={() => navigate('/images')}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Images
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Image Display */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Image Preview</h2>
            <div className="bg-gray-100 rounded-lg overflow-hidden">
              {image.mime_type.startsWith('video/') ? (
                <video
                  src={imageService.getImageUrl(image.file_path || image.filename)}
                  className="w-full h-auto max-h-96 object-contain"
                  controls
                  loop
                />
              ) : (
                <img
                  src={imageService.getImageUrl(image.file_path || image.filename)}
                  alt={image.description || image.original_name}
                  className="w-full h-auto max-h-96 object-contain"
                />
              )}
            </div>
          </div>

          {/* Image Information */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Information</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Original Name</label>
                <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{image.original_name}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <span className={`inline-block px-2 py-1 text-xs font-semibold rounded ${
                  image.image_type === 'cine' 
                    ? 'bg-purple-100 text-purple-800' 
                    : 'bg-green-100 text-green-800'
                }`}>
                  {image.image_type === 'cine' ? 'Cine Loop' : 'Still Image'}
                </span>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">File Size</label>
                <p className="text-sm text-gray-900">{formatFileSize(image.file_size)}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">MIME Type</label>
                <p className="text-sm text-gray-900">{image.mime_type}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">License</label>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-900">{imageService.getLicenseInfo(image.license).name}</span>
                  {imageService.getLicenseInfo(image.license).requiresAttribution && (
                    <span className="text-xs text-orange-600" title="Attribution required">⚠</span>
                  )}
                </div>
              </div>

              {image.license_details && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">License Details</label>
                  <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">{image.license_details}</p>
                </div>
              )}

              {image.tags && image.tags.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {image.tags.map((tag, index) => (
                      <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Created</label>
                <p className="text-sm text-gray-900">
                  {image.created_at ? (
                    <>
                      {new Date(image.created_at).toLocaleDateString()} at {new Date(image.created_at).toLocaleTimeString()}
                    </>
                  ) : (
                    'Unknown'
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        {image.description && (
          <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Description</h2>
            <div className="prose max-w-none">
              <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">
                {image.description}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageView;