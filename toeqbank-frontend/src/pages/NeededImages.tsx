import React, { useState, useEffect } from 'react';
import { imageDescriptionService, imageService, batchService, questionService, ImageDescription, Image } from '../services/api';
import ImageUploadModal from '../components/ImageUploadModal';
import { useAuth } from '../contexts/AuthContext';

interface ImageDescriptionWithQuestion extends ImageDescription {
  question_number?: string;
  question?: string;
}

const NeededImages: React.FC = () => {
  const { isAdmin } = useAuth();
  const [imageDescriptions, setImageDescriptions] = useState<ImageDescriptionWithQuestion[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [echoViews, setEchoViews] = useState<string[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);
  const [selectedEchoView, setSelectedEchoView] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [selectedDescription, setSelectedDescription] = useState<ImageDescriptionWithQuestion | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; questionId: number | null; questionNumber: string }>({ 
    isOpen: false, 
    questionId: null, 
    questionNumber: '' 
  });

  useEffect(() => {
    loadImageDescriptions();
    loadEchoViews();
    if (isAdmin) {
      loadBatches();
    }
  }, [isAdmin]);

  useEffect(() => {
    loadImageDescriptions();
  }, [selectedBatchId, selectedEchoView]);

  const loadBatches = async () => {
    try {
      const batchData = await batchService.getAllBatches();
      // Filter to only show batches that have image descriptions
      const batchesWithImages = batchData.filter((batch: any) => 
        batch.image_description_count && batch.image_description_count > 0
      );
      setBatches(batchesWithImages);
    } catch (err) {
      console.error('Failed to load batches:', err);
    }
  };

  const loadEchoViews = async () => {
    try {
      const views = await imageDescriptionService.getEchoViews();
      setEchoViews(views);
    } catch (err) {
      console.error('Failed to load echo views:', err);
    }
  };

  const loadImageDescriptions = async () => {
    try {
      setLoading(true);
      
      // Fetch image descriptions with filters
      let descriptions;
      if (selectedBatchId || selectedEchoView) {
        // Use filters - batch is admin only, echo view is for all users
        const filters: { batchId?: number; echoView?: string } = {};
        if (selectedBatchId && isAdmin) {
          filters.batchId = selectedBatchId;
        }
        if (selectedEchoView) {
          filters.echoView = selectedEchoView;
        }
        descriptions = await imageDescriptionService.getAllWithFilters(filters);
        console.log(`Loaded image descriptions with filters:`, filters, descriptions);
      } else {
        // Fetch all image descriptions
        descriptions = await imageDescriptionService.getAll();
        console.log('Loaded all image descriptions:', descriptions);
      }
      
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
        imageId: uploadedImage?.id,
        fullDescription: selectedDescription
      });
      alert(`Cannot associate image with question. Missing question_id: ${selectedDescription?.question_id}`);
    }
    
    setShowImageUpload(false);
    setSelectedDescription(null);
  };

  const handleDeleteClick = (questionId: number, questionNumber: string) => {
    setDeleteConfirmation({
      isOpen: true,
      questionId,
      questionNumber
    });
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirmation.questionId) {
      try {
        await questionService.deleteQuestionWithImages(deleteConfirmation.questionId);
        // Reload image descriptions to reflect the change
        await loadImageDescriptions();
        setDeleteConfirmation({ isOpen: false, questionId: null, questionNumber: '' });
      } catch (error) {
        console.error('Error deleting question:', error);
        alert('Failed to delete question. Please try again.');
      }
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmation({ isOpen: false, questionId: null, questionNumber: '' });
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
        initialModality={selectedDescription?.modality}
        initialEchoView={selectedDescription?.echo_view}
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

        {/* Filter Selectors */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Echo View Selector - Available to All Users */}
            <div className="flex items-center space-x-4">
              <label htmlFor="view-selector" className="text-sm font-medium text-gray-700 whitespace-nowrap">
                Filter by View:
              </label>
              <select
                id="view-selector"
                value={selectedEchoView}
                onChange={(e) => setSelectedEchoView(e.target.value)}
                className="min-w-0 flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Echo Views</option>
                {echoViews.map((view) => (
                  <option key={view} value={view}>
                    {view}
                  </option>
                ))}
              </select>
            </div>

            {/* Admin Batch Selector */}
            {isAdmin && (
              <div className="flex items-center space-x-4">
                <label htmlFor="batch-selector" className="text-sm font-medium text-gray-700 whitespace-nowrap">
                  Filter by Batch:
                </label>
                <select
                  id="batch-selector"
                  value={selectedBatchId || ''}
                  onChange={(e) => setSelectedBatchId(e.target.value ? parseInt(e.target.value) : null)}
                  className="min-w-0 flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Batches with Images</option>
                  {batches.map((batch) => (
                    <option key={batch.id} value={batch.id}>
                      Batch #{batch.id} - {batch.file_name} ({batch.image_description_count} image{batch.image_description_count !== 1 ? 's' : ''})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
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
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-36">
                      Modality/View
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
                      <td className="px-4 py-6 text-sm text-gray-500">
                        {(description.modality || description.echo_view) && (
                          <div className="space-y-1">
                            {description.modality && (
                              <div className="text-xs font-medium text-blue-600">
                                {description.modality === 'transthoracic' ? 'TTE' :
                                 description.modality === 'transesophageal' ? 'TEE' : 'Non-echo'}
                              </div>
                            )}
                            {description.echo_view && (
                              <div className="text-xs text-gray-500 truncate" title={description.echo_view}>
                                {description.echo_view}
                              </div>
                            )}
                            {!description.modality && description.echo_view && (
                              <div className="text-xs font-medium text-blue-600">
                                {description.echo_view.includes('TG') || description.echo_view.includes('Transgastric') ? 'TEE' :
                                 description.echo_view.includes('ME') || description.echo_view.includes('Mid-oesophageal') ? 'TEE' :
                                 description.echo_view.includes('UE') || description.echo_view.includes('Upper') ? 'TEE' :
                                 description.echo_view.includes('Descending') ? 'TEE' : 
                                 'Echo'}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-6 whitespace-nowrap text-sm">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleAddImage(description)}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            <svg style={{width: '12px', height: '12px'}} className="mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            Add Image
                          </button>
                          {isAdmin && description.question_id && (
                            <button
                              onClick={() => handleDeleteClick(description.question_id, description.question_number || 'Unknown')}
                              className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                            >
                              <svg style={{width: '12px', height: '12px'}} className="mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Delete
                            </button>
                          )}
                        </div>
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

      {/* Delete Confirmation Dialog */}
      {deleteConfirmation.isOpen && (
        <div 
          className="fixed inset-0 flex items-center justify-center p-4" 
          style={{
            zIndex: 99999,
            backgroundColor: 'rgba(0, 0, 0, 0.5)'
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 transform transition-all">
            <div className="p-8">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                  <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Delete Question and Image Description
                </h3>
                <p className="text-gray-600 mb-6">
                  Are you sure you want to delete question <strong>{deleteConfirmation.questionNumber}</strong> and its associated image description? This action cannot be undone.
                </p>
              </div>
              <div className="flex justify-center space-x-4">
                <button
                  onClick={handleDeleteCancel}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-all duration-200 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-200 font-semibold"
                >
                  Delete Question
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default NeededImages;