import React, { useState, useEffect } from 'react';
import { imageService, Image, LicenseType } from '../services/api';

interface ImageGalleryProps {
  onImageSelect?: (image: Image) => void;
  onImageRemove?: (imageId: number) => void;
  selectedImages?: number[];
  showQuestionInfo?: boolean;
  filterType?: 'still' | 'cine';
  filterLicense?: LicenseType;
  searchTags?: string;
}

const ImageGallery: React.FC<ImageGalleryProps> = ({
  onImageSelect,
  onImageRemove,
  selectedImages = [],
  showQuestionInfo = false,
  filterType,
  filterLicense,
  searchTags
}) => {
  const [images, setImages] = useState<Image[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingImages, setEditingImages] = useState<{[key: number]: boolean}>({});
  const [editForms, setEditForms] = useState<{[key: number]: any}>({});
  const [deletingImage, setDeletingImage] = useState<Image | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pagination, setPagination] = useState({
    limit: 20,
    offset: 0,
    total: 0,
    hasMore: false
  });

  const loadImages = async (reset = false) => {
    try {
      setLoading(true);
      setError(null);

      const offset = reset ? 0 : pagination.offset;
      const response = await imageService.getImages({
        limit: pagination.limit,
        offset,
        type: filterType,
        license: filterLicense,
        tags: searchTags
      });


      if (reset) {
        setImages(response.images);
      } else {
        setImages(prev => [...prev, ...response.images]);
      }

      setPagination(prev => ({
        ...prev,
        offset: offset + response.images.length,
        total: response.pagination.total,
        hasMore: response.pagination.hasMore
      }));
    } catch (err) {
      setError('Failed to load images');
      console.error('Load images error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadImages(true);
  }, [filterType, filterLicense, searchTags]);

  const loadMore = () => {
    if (!loading && pagination.hasMore) {
      loadImages(false);
    }
  };

  const handleImageClick = (image: Image) => {
    onImageSelect?.(image);
  };

  const startEditing = (image: Image) => {
    setEditingImages(prev => ({ ...prev, [image.id!]: true }));
    setEditForms(prev => ({
      ...prev,
      [image.id!]: {
        description: image.description || '',
        tags: image.tags?.join(', ') || '',
        image_type: image.image_type,
        license: image.license,
        license_details: image.license_details || ''
      }
    }));
  };

  const cancelEditing = (imageId: number) => {
    setEditingImages(prev => ({ ...prev, [imageId]: false }));
    setEditForms(prev => {
      const newForms = { ...prev };
      delete newForms[imageId];
      return newForms;
    });
  };

  const saveEditing = async (imageId: number) => {
    try {
      const form = editForms[imageId];
      const updateData = {
        description: form.description || null,
        tags: form.tags ? form.tags.split(',').map((t: string) => t.trim()).filter((t: string) => t) : [],
        image_type: form.image_type,
        license: form.license,
        license_details: form.license_details || null
      };

      const updatedImage = await imageService.updateImage(imageId, updateData);
      
      // Update the image in the local state
      setImages(prev => prev.map(img => img.id === imageId ? updatedImage : img));
      
      // Exit edit mode
      setEditingImages(prev => ({ ...prev, [imageId]: false }));
      setEditForms(prev => {
        const newForms = { ...prev };
        delete newForms[imageId];
        return newForms;
      });
    } catch (err) {
      console.error('Failed to update image:', err);
      setError('Failed to update image');
    }
  };

  const updateEditForm = (imageId: number, field: string, value: string) => {
    setEditForms(prev => ({
      ...prev,
      [imageId]: {
        ...prev[imageId],
        [field]: value
      }
    }));
  };

  const handleDeleteClick = (image: Image) => {
    setDeletingImage(image);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!deletingImage || !deletingImage.id) return;

    try {
      await imageService.deleteImage(deletingImage.id);
      
      // Remove the image from the local state
      setImages(prev => prev.filter(img => img.id !== deletingImage.id));
      
      // Update pagination
      setPagination(prev => ({
        ...prev,
        total: prev.total - 1
      }));
      
      setShowDeleteConfirm(false);
      setDeletingImage(null);
    } catch (err) {
      console.error('Failed to delete image:', err);
      setError('Failed to delete image');
      setShowDeleteConfirm(false);
      setDeletingImage(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setDeletingImage(null);
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };


  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 mb-4">{error}</div>
        <button
          onClick={() => loadImages(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="image-gallery">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <div className="flex justify-between items-center">
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-red-700 hover:text-red-900"
            >
              ×
            </button>
          </div>
        </div>
      )}
      
      {images.length === 0 && !loading ? (
        <div className="text-center py-8 text-gray-500">
          No images found. Upload some images to get started.
        </div>
      ) : (
        <table className="w-full table-fixed border-collapse bg-white rounded-lg shadow-sm">
          <tbody>
            {Array.from({ length: Math.ceil(images.length / 4) }, (_, rowIndex) => (
              <tr key={rowIndex}>
                {Array.from({ length: 4 }, (_, colIndex) => {
                  const imageIndex = rowIndex * 4 + colIndex;
                  const image = images[imageIndex];
                  
                  if (!image) {
                    return <td key={colIndex} className="w-1/4 p-4"></td>;
                  }
                  
                  return (
                    <td key={colIndex} className="w-1/4 p-4 border border-gray-200">
                      <div
                        className={`transition-transform hover:scale-105 ${
                          selectedImages.includes(image.id!) ? 'ring-2 ring-blue-500 rounded' : ''
                        }`}
                      >
                        <div className="relative bg-gray-100 rounded overflow-hidden mx-auto mb-2" style={{width: '96px', height: '96px', maxWidth: '96px', maxHeight: '96px'}}>
                          {image.mime_type.startsWith('video/') ? (
                            <video
                              src={imageService.getImageUrl(image.filename)}
                              className="w-full h-full object-cover"
                              style={{width: '96px', height: '96px', maxWidth: '96px', maxHeight: '96px'}}
                              muted
                              loop
                              onMouseEnter={(e) => (e.target as HTMLVideoElement).play()}
                              onMouseLeave={(e) => (e.target as HTMLVideoElement).pause()}
                            />
                          ) : (
                            <img
                              src={imageService.getImageUrl(image.filename)}
                              alt={image.description || image.original_name}
                              className="w-full h-full object-cover"
                              style={{width: '96px', height: '96px', maxWidth: '96px', maxHeight: '96px'}}
                            />
                          )}
                          
                          <div className="absolute top-1 left-1">
                            <span className={`px-1 py-0.5 text-xs font-semibold rounded ${
                              image.image_type === 'cine' 
                                ? 'bg-purple-100 text-purple-800' 
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {image.image_type === 'cine' ? 'CINE' : 'STILL'}
                            </span>
                          </div>

                          {image.duration_seconds && (
                            <div className="absolute bottom-1 right-1 bg-black bg-opacity-70 text-white px-1 text-xs rounded">
                              {image.duration_seconds}s
                            </div>
                          )}

                          {/* Selection mode buttons - positioned over the image in top-right corner */}
                          {onImageSelect && (
                            <div className="absolute top-2 right-2 flex gap-1" style={{zIndex: 10}}>
                              {!selectedImages.includes(image.id!) ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    handleImageClick(image);
                                  }}
                                  className="bg-green-500 hover:bg-green-600 text-white w-6 h-6 rounded flex items-center justify-center text-xs font-bold shadow-lg"
                                  title="Add to question"
                                >
                                  +
                                </button>
                              ) : (
                                <>
                                  <div className="bg-blue-500 text-white w-6 h-6 rounded flex items-center justify-center text-xs shadow-lg">
                                    ✓
                                  </div>
                                  {onImageRemove && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        onImageRemove(image.id!);
                                      }}
                                      className="bg-red-500 hover:bg-red-600 text-white w-6 h-6 rounded flex items-center justify-center text-xs font-bold shadow-lg"
                                      title="Remove from question"
                                    >
                                      ×
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                        </div>

                        {editingImages[image.id!] ? (
                          // Edit mode
                          <div className="text-xs p-2 bg-gray-50 rounded">
                            <div className="mb-2">
                              <label className="block text-gray-700 font-medium mb-1">Description:</label>
                              <input
                                type="text"
                                value={editForms[image.id!]?.description || ''}
                                onChange={(e) => updateEditForm(image.id!, 'description', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                placeholder="Enter description..."
                              />
                            </div>
                            
                            <div className="mb-2">
                              <label className="block text-gray-700 font-medium mb-1">Tags:</label>
                              <input
                                type="text"
                                value={editForms[image.id!]?.tags || ''}
                                onChange={(e) => updateEditForm(image.id!, 'tags', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                placeholder="tag1, tag2, tag3"
                              />
                            </div>
                            
                            <div className="mb-2">
                              <label className="block text-gray-700 font-medium mb-1">Type:</label>
                              <select
                                value={editForms[image.id!]?.image_type || 'still'}
                                onChange={(e) => updateEditForm(image.id!, 'image_type', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                              >
                                <option value="still">Still</option>
                                <option value="cine">Cine</option>
                              </select>
                            </div>
                            
                            <div className="mb-2">
                              <label className="block text-gray-700 font-medium mb-1">License:</label>
                              <select
                                value={editForms[image.id!]?.license || 'user-contributed'}
                                onChange={(e) => updateEditForm(image.id!, 'license', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                              >
                                {imageService.getLicenseOptions().map(option => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            
                            <div className="flex gap-1 mt-2">
                              <button
                                onClick={() => saveEditing(image.id!)}
                                className="flex-1 bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => cancelEditing(image.id!)}
                                className="flex-1 bg-gray-500 text-white px-2 py-1 rounded text-xs hover:bg-gray-600"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          // View mode
                          <div className="text-center text-xs">
                            <div className="flex justify-between items-start mb-1">
                              <div className="font-medium truncate flex-1" title={image.description || image.original_name}>
                                {image.description || image.original_name}
                              </div>
                              {showQuestionInfo && (
                                <div className="flex gap-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      startEditing(image);
                                    }}
                                    className="bg-blue-500 text-white px-1 py-0.5 rounded hover:bg-blue-600"
                                    title="Edit image details"
                                  >
                                    ✎
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteClick(image);
                                    }}
                                    className="bg-red-500 text-white px-1 py-0.5 rounded hover:bg-red-600"
                                    title="Delete image"
                                  >
                                    ×
                                  </button>
                                </div>
                              )}
                            </div>
                            
                            <div className="text-gray-500 mb-1">
                              {formatFileSize(image.file_size)}
                            </div>

                            {image.tags && image.tags.length > 0 && (
                              <div className="mb-1">
                                <span className="bg-blue-100 text-blue-800 px-1 rounded text-xs">
                                  {image.tags[0]}
                                </span>
                                {image.tags.length > 1 && (
                                  <span className="text-gray-500 ml-1">
                                    +{image.tags.length - 1}
                                  </span>
                                )}
                              </div>
                            )}

                            {showQuestionInfo && (
                              <div className="text-gray-500">
                                <QuestionCount imageId={image.id!} />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin inline-block w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          <p className="mt-2 text-gray-600">Loading images...</p>
        </div>
      )}

      {!loading && pagination.hasMore && (
        <div className="text-center mt-8">
          <button
            onClick={loadMore}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Load More ({pagination.total - images.length} remaining)
          </button>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && deletingImage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Confirm Delete</h3>
            <p className="mb-6">
              Are you sure you want to delete this image?
              {deletingImage.description && (
                <span className="block mt-2 font-medium">"{deletingImage.description}"</span>
              )}
              {!deletingImage.description && (
                <span className="block mt-2 font-medium">"{deletingImage.original_name}"</span>
              )}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const QuestionCount: React.FC<{ imageId: number }> = ({ imageId }) => {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    imageService.getQuestionsForImage(imageId)
      .then(questions => setCount(questions.length))
      .catch(() => setCount(0));
  }, [imageId]);

  if (count === null) return <span>Loading...</span>;
  
  return (
    <span>
      {count === 0 ? 'No questions' : `${count} question${count !== 1 ? 's' : ''}`}
    </span>
  );
};

export default ImageGallery;