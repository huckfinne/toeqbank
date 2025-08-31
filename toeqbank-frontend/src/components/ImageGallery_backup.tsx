import React, { useState, useEffect } from 'react';
import { imageService, Image, LicenseType } from '../services/api';

interface ImageGalleryProps {
  onImageSelect?: (image: Image) => void;
  selectedImages?: number[];
  showQuestionInfo?: boolean;
  filterType?: 'still' | 'cine';
  filterLicense?: LicenseType;
  searchTags?: string;
}

const ImageGallery: React.FC<ImageGalleryProps> = ({
  onImageSelect,
  selectedImages = [],
  showQuestionInfo = false,
  filterType,
  filterLicense,
  searchTags
}) => {
  const [images, setImages] = useState<Image[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
                        className={`cursor-pointer transition-transform hover:scale-105 ${
                          selectedImages.includes(image.id!) ? 'ring-2 ring-blue-500 rounded' : ''
                        }`}
                        onClick={() => handleImageClick(image)}
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
                        </div>

                        <div className="text-center text-xs">
                          <div className="font-medium mb-1 truncate" title={image.description || image.original_name}>
                            {image.description || image.original_name}
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