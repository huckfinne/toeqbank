import React, { useState } from 'react';
import { getViewsForModality } from '../services/echoViews';

interface ImageDescription {
  id: string;
  description: string;
  usageType: 'question' | 'explanation';
  examType?: 'TTE' | 'TEE/TOE';
  viewType?: string;
}

interface ImageDescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (imageDescription: ImageDescription) => void;
}

const ImageDescriptionModal: React.FC<ImageDescriptionModalProps> = ({
  isOpen,
  onClose,
  onAdd
}) => {
  const [description, setDescription] = useState('');
  const [usageType, setUsageType] = useState<'question' | 'explanation'>('question');
  const [examType, setExamType] = useState<'TTE' | 'TEE/TOE'>('TEE/TOE');
  const [viewType, setViewType] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('ImageDescriptionModal: handleSubmit called');
    console.log('Description:', description);
    console.log('Usage Type:', usageType);
    
    if (!description.trim()) {
      alert('Please enter an image description');
      return;
    }

    const imageDescription: ImageDescription = {
      id: `placeholder_${Date.now()}`,
      description: description.trim(),
      usageType,
      examType,
      viewType: viewType || undefined
    };

    console.log('ImageDescriptionModal: Created imageDescription:', imageDescription);
    console.log('ImageDescriptionModal: Calling onAdd callback');
    
    onAdd(imageDescription);
    
    // Reset form
    setDescription('');
    setUsageType('question');
    setExamType('TEE/TOE');
    setViewType('');
    onClose();
  };

  const handleCancel = () => {
    setDescription('');
    setUsageType('question');
    setExamType('TEE/TOE');
    setViewType('');
    onClose();
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
          handleCancel();
        }
      }}
    >
      <div 
        className="rounded-2xl shadow-2xl max-w-md w-full mx-4 border-4 border-gray-300 relative"
        style={{backgroundColor: 'white', boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.1)'}}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6 rounded-t-2xl">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-2xl font-bold text-white">🖼️ Add Image Description</h3>
              <p className="text-blue-100 mt-1">Describe an image that will be added later</p>
            </div>
            <button
              type="button"
              onClick={handleCancel}
              className="text-white hover:text-blue-200 bg-blue-500/80 hover:bg-blue-600 rounded-full p-3 transition-all duration-200 shadow-lg hover:shadow-xl"
              title="Close Dialog"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8">
          <div className="mb-6">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Image Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this image will show (e.g., 'Mid-esophageal four-chamber view showing severe mitral regurgitation')"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 resize-none"
              rows={4}
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Usage Type
            </label>
            <div className="flex gap-4">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="usageType"
                  value="question"
                  checked={usageType === 'question'}
                  onChange={(e) => setUsageType(e.target.value as 'question' | 'explanation')}
                  className="text-blue-600 focus:ring-blue-500 focus:border-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Question</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="usageType"
                  value="explanation"
                  checked={usageType === 'explanation'}
                  onChange={(e) => setUsageType(e.target.value as 'question' | 'explanation')}
                  className="text-blue-600 focus:ring-blue-500 focus:border-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Explanation</span>
              </label>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Exam Type
            </label>
            <div className="flex gap-4">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="examType"
                  value="TTE"
                  checked={examType === 'TTE'}
                  onChange={(e) => {
                    setExamType(e.target.value as 'TTE' | 'TEE/TOE');
                    setViewType('');
                  }}
                  className="text-blue-600 focus:ring-blue-500 focus:border-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">TTE</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="examType"
                  value="TEE/TOE"
                  checked={examType === 'TEE/TOE'}
                  onChange={(e) => {
                    setExamType(e.target.value as 'TTE' | 'TEE/TOE');
                    setViewType('');
                  }}
                  className="text-blue-600 focus:ring-blue-500 focus:border-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">TEE/TOE</span>
              </label>
            </div>
          </div>

          <div className="mb-6">
            <label htmlFor="viewType" className="block text-sm font-medium text-gray-700 mb-2">
              View Type (Optional)
            </label>
            <select
              id="viewType"
              value={viewType}
              onChange={(e) => setViewType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select a view...</option>
              {getViewsForModality(examType === 'TTE' ? 'transthoracic' : 'transesophageal').map((view, index) => (
                <option key={index} value={view.name}>
                  {view.name}
                </option>
              ))}
            </select>
          </div>
        </form>
        
        <div className="flex justify-end items-center gap-3 px-8 py-6 border-t border-gray-100" style={{backgroundColor: 'white', borderRadius: '0 0 1rem 1rem'}}>
          <button
            type="button"
            onClick={handleCancel}
            className="px-6 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 font-semibold"
          >
            Add Description
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageDescriptionModal;