import React, { useState } from 'react';
import { Question } from '../services/api';
import ClaudeApiService, { GeneratedMetadata } from '../services/claudeApi';

interface MetadataGenerationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: (metadata: GeneratedMetadata) => void;
  question: Question;
}

const MetadataGenerationDialog: React.FC<MetadataGenerationDialogProps> = ({
  isOpen,
  onClose,
  onAccept,
  question
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMetadata, setGeneratedMetadata] = useState<GeneratedMetadata | null>(null);
  const [editableMetadata, setEditableMetadata] = useState<GeneratedMetadata | null>(null);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');

  const generateMetadata = async () => {
    setIsGenerating(true);
    setProgress(10);
    setStatusText('Analyzing question content...');

    try {
      // Step 1: Analyze question text
      setProgress(30);
      setStatusText('Processing question text with AI...');
      
      // Step 2: Analyze images if present
      if (question.images && question.images.length > 0) {
        setProgress(50);
        setStatusText(`Analyzing ${question.images.length} image(s)...`);
      }
      
      // Step 3: Generate metadata
      setProgress(70);
      setStatusText('Generating metadata tags...');
      
      // Call Claude API here
      const metadata = await callClaudeAPI(question);
      
      setProgress(90);
      setStatusText('Finalizing results...');
      
      setGeneratedMetadata(metadata);
      setEditableMetadata({ ...metadata }); // Create editable copy
      setProgress(100);
      setStatusText('Metadata generation complete!');
      
    } catch (error) {
      console.error('Error generating metadata:', error);
      setStatusText('Error generating metadata. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const callClaudeAPI = async (question: Question): Promise<GeneratedMetadata> => {
    return await ClaudeApiService.generateMetadata(question);
  };

  React.useEffect(() => {
    if (isOpen && !generatedMetadata && !isGenerating) {
      generateMetadata();
    }
  }, [isOpen]);

  const handleAccept = () => {
    if (editableMetadata) {
      onAccept(editableMetadata);
      onClose();
    }
  };

  const handleClose = () => {
    setGeneratedMetadata(null);
    setEditableMetadata(null);
    setProgress(0);
    setStatusText('');
    onClose();
  };

  const removeKeyword = (indexToRemove: number) => {
    if (editableMetadata) {
      setEditableMetadata({
        ...editableMetadata,
        keywords: editableMetadata.keywords.filter((_, index) => index !== indexToRemove)
      });
    }
  };

  const removeMajorStructure = (indexToRemove: number) => {
    if (editableMetadata) {
      setEditableMetadata({
        ...editableMetadata,
        majorStructures: editableMetadata.majorStructures.filter((_, index) => index !== indexToRemove)
      });
    }
  };

  const removeMinorStructure = (indexToRemove: number) => {
    if (editableMetadata) {
      setEditableMetadata({
        ...editableMetadata,
        minorStructures: editableMetadata.minorStructures.filter((_, index) => index !== indexToRemove)
      });
    }
  };

  const removeModality = (indexToRemove: number) => {
    if (editableMetadata) {
      setEditableMetadata({
        ...editableMetadata,
        modalities: editableMetadata.modalities.filter((_, index) => index !== indexToRemove)
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center p-4" 
      style={{
        zIndex: 99999, 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div 
        className="rounded-2xl shadow-2xl max-w-2xl w-full mx-4 border-4 border-gray-300 relative"
        style={{backgroundColor: 'white', minHeight: '500px', boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.1)'}}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6 rounded-t-2xl">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-2xl font-bold text-white">🏷️ Generate Metadata</h3>
              <p className="text-blue-100 mt-1">AI-powered question analysis and tagging</p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="text-white hover:text-red-300 bg-red-500/80 hover:bg-red-600 rounded-full p-3 transition-all duration-200 shadow-lg hover:shadow-xl"
              title="Close Dialog"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        <div className="p-8">
          {isGenerating && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">{statusText}</span>
                <span className="text-sm font-medium text-gray-500">{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-indigo-500 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          )}

          {editableMetadata && !isGenerating && (
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-700 mb-2">Difficulty Level</h4>
                  <p className="text-gray-900">{editableMetadata.difficulty}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-700 mb-2">Category</h4>
                  <p className="text-gray-900">{editableMetadata.category}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-700 mb-2">Topic</h4>
                  <p className="text-gray-900">{editableMetadata.topic}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-700 mb-2">Question Type</h4>
                  <p className="text-gray-900">{editableMetadata.questionType}</p>
                </div>
              </div>

              {editableMetadata.view && (
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <h4 className="font-semibold text-gray-700 mb-2">TEE View</h4>
                  <p className="text-gray-900">{editableMetadata.view}</p>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-700 mb-2">Major Structures</h4>
                  <div className="flex flex-wrap gap-2">
                    {editableMetadata.majorStructures.length > 0 ? (
                      editableMetadata.majorStructures.map((structure, index) => (
                        <span key={index} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                          {structure}
                          <button
                            onClick={() => removeMajorStructure(index)}
                            className="ml-1 bg-red-500 text-white hover:bg-red-600 rounded text-xs px-1.5 py-0.5 font-medium transition-colors"
                            title="Remove"
                          >
                            ✕
                          </button>
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-500">None identified</span>
                    )}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-700 mb-2">Minor Structures</h4>
                  <div className="flex flex-wrap gap-2">
                    {editableMetadata.minorStructures.length > 0 ? (
                      editableMetadata.minorStructures.map((structure, index) => (
                        <span key={index} className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                          {structure}
                          <button
                            onClick={() => removeMinorStructure(index)}
                            className="ml-1 bg-red-500 text-white hover:bg-red-600 rounded text-xs px-1.5 py-0.5 font-medium transition-colors"
                            title="Remove"
                          >
                            ✕
                          </button>
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-500">None identified</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-700 mb-2">Modalities</h4>
                  <div className="flex flex-wrap gap-2">
                    {editableMetadata.modalities.map((modality, index) => (
                      <span key={index} className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                        {modality}
                        <button
                          onClick={() => removeModality(index)}
                          className="ml-1 bg-red-500 text-white hover:bg-red-600 rounded text-xs px-1.5 py-0.5 font-medium transition-colors"
                          title="Remove"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-700 mb-2">Keywords</h4>
                  <div className="flex flex-wrap gap-2">
                    {editableMetadata.keywords.map((keyword, index) => (
                      <span key={index} className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                        {keyword}
                        <button
                          onClick={() => removeKeyword(index)}
                          className="ml-1 bg-red-500 text-white hover:bg-red-600 rounded text-xs px-1.5 py-0.5 font-medium transition-colors"
                          title="Remove"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>
        
        <div className="absolute bottom-0 right-0 left-0 flex justify-end items-center gap-3 px-8 py-6 border-t border-gray-100" style={{backgroundColor: 'white', borderRadius: '0 0 1rem 1rem'}}>
          <button
            type="button"
            onClick={handleClose}
            className="px-6 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAccept}
            disabled={!generatedMetadata || isGenerating}
            className={`px-6 py-2 rounded-lg transition-all duration-200 ${
              generatedMetadata && !isGenerating
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Accept Metadata
          </button>
        </div>
      </div>
    </div>
  );
};

export default MetadataGenerationDialog;