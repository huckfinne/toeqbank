import React, { useState, useRef } from 'react';
import ImageUpload from './ImageUpload';
import { Image } from '../services/api';

interface ImageUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (image: Image, usageType: 'question' | 'explanation') => void;
  initialDescription?: string;
  initialUsageType?: 'question' | 'explanation';
}

const ImageUploadModal: React.FC<ImageUploadModalProps> = ({
  isOpen,
  onClose,
  onUpload,
  initialDescription,
  initialUsageType
}) => {
  const [canSave, setCanSave] = useState(false);
  const imageUploadRef = useRef<any>(null);

  if (!isOpen) return null;

  const handleUpload = (image: Image, usageType: 'question' | 'explanation') => {
    onUpload(image, usageType);
    onClose();
  };

  const handleSaveImage = () => {
    if (imageUploadRef.current && canSave) {
      imageUploadRef.current.triggerUpload();
    }
  };

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
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="rounded-2xl shadow-2xl max-w-6xl w-full mx-4 border-4 border-gray-300 relative flex flex-col"
        style={{backgroundColor: 'white', maxHeight: '95vh', minHeight: '600px', boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.1)'}}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-6 rounded-t-2xl flex-shrink-0">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-2xl font-bold text-white">Upload New Images</h3>
              <p className="text-blue-100 mt-1">Add TOE images and cine clips to your question</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-white hover:text-red-300 bg-red-500/80 hover:bg-red-600 rounded-full p-3 transition-all duration-200 shadow-lg hover:shadow-xl"
              title="Close Modal"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        <div 
          className="flex-1 overflow-y-scroll p-8" 
          style={{
            backgroundColor: 'white',
            maxHeight: '75vh',
            minHeight: '500px'
          }}
        >
          <ImageUpload 
            ref={imageUploadRef}
            onUpload={handleUpload}
            onFileSelected={(hasFile) => setCanSave(hasFile)}
            initialDescription={initialDescription}
            initialUsageType={initialUsageType}
          />
        </div>
        
        <div className="flex-shrink-0 flex justify-end items-center gap-3 px-8 py-6 border-t border-gray-100" style={{backgroundColor: 'white', borderRadius: '0 0 1rem 1rem'}}>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveImage}
            disabled={!canSave}
            className={`px-6 py-2 rounded-lg transition-all duration-200 ${
              canSave
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Save Image
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageUploadModal;