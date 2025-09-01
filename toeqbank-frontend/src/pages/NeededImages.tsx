import React, { useState, useEffect } from 'react';
import { imageDescriptionService, imageService, ImageDescription, Image } from '../services/api';
import ImageUploadModal from '../components/ImageUploadModal';

interface ImageDescriptionWithQuestion extends ImageDescription {
  question_number?: string;
  question?: string;
}

const NeededImages: React.FC = () => {
  const [imageDescriptions, setImageDescriptions] = useState<ImageDescriptionWithQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [selectedDescription, setSelectedDescription] = useState<ImageDescriptionWithQuestion | null>(null);

  useEffect(() => {
    loadImageDescriptions();
  }, []);

  const loadImageDescriptions = async () => {
    try {
      setLoading(true);
      
      const descriptions = await imageDescriptionService.getAll();
      console.log('Loaded image descriptions:', descriptions);
      setImageDescriptions(descriptions);
      setError(null);
    } catch (err) {
      setError('Failed to load image descriptions. Please make sure the backend server is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddImage = (description: ImageDescriptionWithQuestion) => {
    console.log('Selected description for image upload:', description);
    setSelectedDescription(description);
    setShowImageUpload(true);
  };

  const handleImageUpload = async (uploadedImage: Image, usageType: 'question' | 'explanation' = 'question') => {
    console.log('Image uploaded:', uploadedImage);
    console.log('For description:', selectedDescription?.description);
    console.log('Selected description object:', selectedDescription);
    console.log('Question ID:', selectedDescription?.question_id);
    
    // Associate the image with the question
    if (selectedDescription?.question_id && uploadedImage.id) {
      try {
        // Call API to associate image with question
        await imageService.associateWithQuestion(uploadedImage.id, selectedDescription.question_id, 1, usageType);
        console.log('Image associated with question:', selectedDescription.question_id);
        
        // Delete the image description since it's now fulfilled
        if (selectedDescription.id) {
          await imageDescriptionService.delete(selectedDescription.id);
          console.log('Deleted fulfilled image description:', selectedDescription.id);
        }
        
        // Reload image descriptions to reflect the change
        await loadImageDescriptions();
      } catch (error) {
        console.error('Failed to associate image with question:', error);
      }
    } else {
      console.warn('Cannot associate image - missing data:', {
        hasDescription: !!selectedDescription,
        questionId: selectedDescription?.question_id,
        imageId: uploadedImage?.id
      });
    }
    
    setShowImageUpload(false);
    setSelectedDescription(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="animate-spin inline-block w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mb-4"></div>
            <p className="text-gray-600">Loading image descriptions...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="text-red-600 mb-4">{error}</div>
            <button
              onClick={loadImageDescriptions}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <ImageUploadModal
        isOpen={showImageUpload}
        onClose={() => {
          setShowImageUpload(false);
          setSelectedDescription(null);
        }}
        onUpload={handleImageUpload}
        initialDescription={selectedDescription?.description || ''}
        initialUsageType={selectedDescription?.usage_type || 'question'}
        questionNumber={selectedDescription?.question_number}
      />
      
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
      <div className="w-full px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🖼️ Image Descriptions
          </h1>
          <p className="text-xl text-gray-600 leading-relaxed">
            All image descriptions that need actual images to be uploaded.
          </p>
        </div>

        {/* Stats */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="text-lg font-semibold text-gray-800">
            {imageDescriptions.length} Image Description{imageDescriptions.length !== 1 ? 's' : ''} Found
          </div>
        </div>

        {/* Image Descriptions Table */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {imageDescriptions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-6">No image descriptions found. Create some questions with image descriptions first.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                      Question
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                      Type
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y-2 divide-gray-200">
                  {imageDescriptions.map((description, index) => (
                    <tr key={description.id || index} className="hover:bg-gray-50 align-top">
                      <td className="px-4 py-6 text-sm text-gray-900">
                        <div className="flex items-start">
                          <svg style={{width: '15px', height: '15px'}} className="text-blue-500 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <div className="flex-1 min-w-0">
                            <div 
                              className="text-sm leading-relaxed line-clamp-3"
                              title={description.description}
                              style={{
                                overflow: 'hidden',
                                display: '-webkit-box',
                                WebkitLineClamp: 3,
                                WebkitBoxOrient: 'vertical',
                                wordBreak: 'break-word'
                              }}
                            >
                              {description.description}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-6 text-sm text-gray-500">
                        {description.question_number && (
                          <span className="text-blue-600 font-medium text-xs">#{description.question_number}</span>
                        )}
                      </td>
                      <td className="px-4 py-6 whitespace-nowrap text-sm text-gray-500">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          description.usage_type === 'question'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-purple-100 text-purple-700'
                        }`}>
                          {description.usage_type}
                        </span>
                      </td>
                      <td className="px-4 py-6 whitespace-nowrap text-sm">
                        <button
                          onClick={() => handleAddImage(description)}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          <svg style={{width: '12px', height: '12px'}} className="mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          Add Image
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {imageDescriptions.length > 0 && (
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <svg style={{width: '15px', height: '15px'}} className="text-blue-400 mt-0.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="text-sm font-medium text-blue-800">About Image Descriptions</h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>These image descriptions specify what images are needed for questions. To fulfill them:</p>
                  <ol className="list-decimal list-inside mt-1 space-y-1">
                    <li>Go to the <strong>Image Library</strong> to upload actual images</li>
                    <li>Use the descriptions above as references for what images to upload</li>
                    <li>Associate uploaded images with questions using the question editor</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
    </>
  );
};

export default NeededImages;