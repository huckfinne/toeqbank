import React, { useState, useEffect } from 'react';
import { imageService, Image, Question, LicenseType } from '../services/api';
import ImageUpload from './ImageUpload';
import ImageGallery from './ImageGallery';

interface ImageManagerProps {
  mode?: 'standalone' | 'selection';
  onImageSelect?: (image: Image) => void;
  selectedImages?: number[];
  questionId?: number;
}

const ImageManager: React.FC<ImageManagerProps> = ({
  mode = 'standalone',
  onImageSelect,
  selectedImages = [],
  questionId
}) => {
  const [activeTab, setActiveTab] = useState<'gallery' | 'upload'>('gallery');
  const [filterType, setFilterType] = useState<'all' | 'still' | 'cine'>('all');
  const [filterLicense, setFilterLicense] = useState<'all' | LicenseType>('all');
  const [searchTags, setSearchTags] = useState('');
  const [selectedImage, setSelectedImage] = useState<Image | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleUpload = (image: Image) => {
    setRefreshKey(prev => prev + 1);
    setActiveTab('gallery');
    
    if (mode === 'selection') {
      onImageSelect?.(image);
    }
  };

  const handleImageClick = (image: Image) => {
    if (mode === 'selection') {
      onImageSelect?.(image);
    } else {
      setSelectedImage(image);
    }
  };

  const handleSearch = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="image-manager">
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1">
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-5">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                <div>
                  <h2 className="text-xl font-bold text-white mb-2">
                    {mode === 'selection' ? '🖼️ Select Images' : 'Image Library'}
                  </h2>
                  <p className="text-indigo-100 text-sm">
                    {mode === 'selection' ? 'Choose images to associate with your question' : 'Manage your TOE exam image collection'}
                  </p>
                </div>
                
                <div className="flex space-x-2 mt-4 sm:mt-0">
                  <button
                    onClick={() => setActiveTab('gallery')}
                    className={`px-6 py-3 rounded-lg transition-all duration-200 font-medium ${
                      activeTab === 'gallery'
                        ? 'bg-white text-indigo-600 shadow-md'
                        : 'bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm'
                    }`}
                  >
                    <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Gallery
                  </button>
                  <button
                    onClick={() => setActiveTab('upload')}
                    className={`px-6 py-3 rounded-lg transition-all duration-200 font-medium ${
                      activeTab === 'upload'
                        ? 'bg-white text-indigo-600 shadow-md'
                        : 'bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm'
                    }`}
                  >
                    <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    Upload
                  </button>
                </div>
              </div>
            </div>
            
            <div className="p-6">{/* Content area */}

              {/* Filters (only show in gallery tab) */}
              {activeTab === 'gallery' && (
                <div className="mb-8 space-y-6">
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">🔍 Search & Filter</h3>
                    <div className="flex flex-col lg:flex-row gap-4">
                      <div className="flex-1">
                        <input
                          type="text"
                          placeholder="Search by tags (e.g., mitral, stenosis, aortic...)"
                          value={searchTags}
                          onChange={(e) => setSearchTags(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                          className="w-full px-4 py-4 text-lg border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200"
                        />
                      </div>
                      
                      <button
                        onClick={handleSearch}
                        className="px-8 py-4 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all duration-200 font-semibold shadow-md hover:shadow-lg transform hover:scale-105"
                      >
                        <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        Search
                      </button>
                    </div>
                    
                    <div className="mt-6 flex flex-wrap gap-4">
                      <div className="flex items-center space-x-3">
                        <label className="text-sm font-semibold text-gray-700">Type:</label>
                        <select
                          value={filterType}
                          onChange={(e) => setFilterType(e.target.value as 'all' | 'still' | 'cine')}
                          className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                        >
                          <option value="all">All Types</option>
                          <option value="still">Still Images</option>
                          <option value="cine">Cine Loops</option>
                        </select>
                      </div>

                      <div className="flex items-center space-x-3">
                        <label className="text-sm font-semibold text-gray-700">License:</label>
                        <select
                          value={filterLicense}
                          onChange={(e) => setFilterLicense(e.target.value as 'all' | LicenseType)}
                          className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                        >
                          <option value="all">All Licenses</option>
                          {imageService.getLicenseOptions().map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Content */}
              {activeTab === 'gallery' ? (
                <ImageGallery
                  key={refreshKey}
                  onImageSelect={handleImageClick}
                  selectedImages={selectedImages}
                  showQuestionInfo={mode === 'standalone'}
                  filterType={filterType === 'all' ? undefined : filterType}
                  filterLicense={filterLicense === 'all' ? undefined : filterLicense}
                  searchTags={searchTags}
                />
              ) : (
                <ImageUpload onUpload={handleUpload} />
              )}
            </div>
          </div>
        </div>

        {/* Side panel for selected image details (standalone mode only) */}
        {mode === 'standalone' && selectedImage && (
          <div className="w-full lg:w-80">
            <ImageDetails
              image={selectedImage}
              onUpdate={(updatedImage) => {
                setSelectedImage(updatedImage);
                setRefreshKey(prev => prev + 1);
              }}
              onClose={() => setSelectedImage(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
};

const ImageDetails: React.FC<{
  image: Image;
  onUpdate: (image: Image) => void;
  onClose: () => void;
}> = ({ image, onUpdate, onClose }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    description: image.description || '',
    tags: image.tags?.join(', ') || '',
    image_type: image.image_type,
    license: image.license,
    license_details: image.license_details || ''
  });
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadQuestions();
  }, [image.id]);

  const loadQuestions = async () => {
    if (!image.id) return;
    try {
      const questionsList = await imageService.getQuestionsForImage(image.id);
      setQuestions(questionsList);
    } catch (error) {
      console.error('Failed to load questions:', error);
    }
  };

  const handleSave = async () => {
    if (!image.id) return;
    
    setLoading(true);
    try {
      const updatedImage = await imageService.updateImage(image.id, {
        description: editData.description,
        tags: editData.tags.split(',').map(t => t.trim()).filter(t => t.length > 0),
        image_type: editData.image_type,
        license: editData.license,
        license_details: editData.license_details
      });
      onUpdate(updatedImage);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update image:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!image.id || !window.confirm('Are you sure you want to delete this image?')) return;
    
    setLoading(true);
    try {
      await imageService.deleteImage(image.id);
      onClose();
    } catch (error) {
      console.error('Failed to delete image:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-semibold">Image Details</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Image Preview */}
      <div className="aspect-square mb-4 bg-gray-100 rounded-lg overflow-hidden">
        {image.mime_type.startsWith('video/') ? (
          <video
            src={imageService.getImageUrl(image.filename)}
            className="w-full h-full object-cover"
            controls
          />
        ) : (
          <img
            src={imageService.getImageUrl(image.filename)}
            alt={image.description || image.original_name}
            className="w-full h-full object-cover"
          />
        )}
      </div>

      {/* Details */}
      <div className="space-y-4">
        {isEditing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                value={editData.description}
                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Tags</label>
              <input
                type="text"
                value={editData.tags}
                onChange={(e) => setEditData({ ...editData, tags: e.target.value })}
                placeholder="Comma-separated tags"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <select
                value={editData.image_type}
                onChange={(e) => setEditData({ ...editData, image_type: e.target.value as 'still' | 'cine' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="still">Still Image</option>
                <option value="cine">Cine Loop</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">License</label>
              <select
                value={editData.license}
                onChange={(e) => setEditData({ ...editData, license: e.target.value as LicenseType })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {imageService.getLicenseOptions().map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">License Details/Attribution</label>
              <textarea
                value={editData.license_details}
                onChange={(e) => setEditData({ ...editData, license_details: e.target.value })}
                placeholder="Attribution text, source URL, copyright holder, etc."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
              <p className="text-xs text-gray-500 mt-1">
                {imageService.getLicenseInfo(editData.license).requiresAttribution
                  ? 'Attribution is required for this license type'
                  : 'Optional: Add source information or attribution text'}
              </p>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={handleSave}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <h4 className="text-sm font-medium text-gray-500">Filename</h4>
              <p className="text-sm">{image.original_name}</p>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-500">Description</h4>
              <p className="text-sm">{image.description || 'No description'}</p>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-500">Type</h4>
              <span className={`inline-block px-2 py-1 text-xs font-semibold rounded ${
                image.image_type === 'cine' 
                  ? 'bg-purple-100 text-purple-800' 
                  : 'bg-green-100 text-green-800'
              }`}>
                {image.image_type === 'cine' ? 'Cine Loop' : 'Still Image'}
              </span>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-500">File Size</h4>
              <p className="text-sm">{formatFileSize(image.file_size)}</p>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-500">License</h4>
              <div className="flex items-center space-x-2">
                <span className="text-sm">{imageService.getLicenseInfo(image.license).name}</span>
                {imageService.getLicenseInfo(image.license).requiresAttribution && (
                  <span className="text-xs text-orange-600" title="Attribution required">⚠</span>
                )}
              </div>
              {imageService.getLicenseInfo(image.license).url && (
                <a 
                  href={imageService.getLicenseInfo(image.license).url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline"
                >
                  View License
                </a>
              )}
            </div>
            
            {image.license_details && (
              <div>
                <h4 className="text-sm font-medium text-gray-500">License Details</h4>
                <p className="text-sm text-gray-700">{image.license_details}</p>
              </div>
            )}
            
            {image.tags && image.tags.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-500">Tags</h4>
                <div className="flex flex-wrap gap-1 mt-1">
                  {image.tags.map((tag, index) => (
                    <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {questions.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-500">Associated Questions</h4>
                <p className="text-sm">{questions.length} question{questions.length !== 1 ? 's' : ''}</p>
              </div>
            )}
            
            <div className="flex space-x-2 pt-2">
              <button
                onClick={() => setIsEditing(true)}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                Edit
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50"
              >
                {loading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageManager;