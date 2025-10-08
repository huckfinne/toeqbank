import React, { useState, useRef, useEffect } from 'react';
import ImageUpload from './ImageUpload';
import { Image } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface ImageUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (image: Image, usageType: 'question' | 'explanation') => void;
  initialDescription?: string;
  initialUsageType?: 'question' | 'explanation';
  initialModality?: 'transthoracic' | 'transesophageal' | 'non-echo';
  initialEchoView?: string;
  questionNumber?: string;
}

const ImageUploadModal: React.FC<ImageUploadModalProps> = ({
  isOpen,
  onClose,
  onUpload,
  initialDescription,
  initialUsageType,
  initialModality,
  initialEchoView,
  questionNumber
}) => {
  const [canSave, setCanSave] = useState(false);
  const imageUploadRef = useRef<any>(null);
  const { user } = useAuth();
  
  // Hide modality for USMLE users - multiple checks for safety
  const examCategory = user?.exam_category?.toLowerCase() || '';
  const hideModality = examCategory === 'usmle' || examCategory === 'USMLE';
  
  // Debug logging for deployed version
  console.log('ImageUploadModal Debug:', {
    user: user,
    exam_category: user?.exam_category,
    exam_category_lower: examCategory,
    hideModality: hideModality,
    userKeys: user ? Object.keys(user) : [],
    fullUser: JSON.stringify(user)
  });

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
    <>
      <style>
        {`
          .image-modal-scroll::-webkit-scrollbar {
            width: 8px;
          }
          .image-modal-scroll::-webkit-scrollbar-track {
            background: #f1f5f9;
            border-radius: 4px;
          }
          .image-modal-scroll::-webkit-scrollbar-thumb {
            background: #94a3b8;
            border-radius: 4px;
          }
          .image-modal-scroll::-webkit-scrollbar-thumb:hover {
            background: #64748b;
          }
        `}
      </style>
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
        style={{
          backgroundColor: 'white', 
          maxHeight: '95vh', 
          minHeight: '600px', 
          boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.1)',
          height: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-6 rounded-t-2xl flex-shrink-0">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-2xl font-bold text-white">
                Upload New Images {questionNumber && <span className="text-yellow-200">for Question #{questionNumber}</span>}
              </h3>
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
          className="flex-1 overflow-y-auto p-8 image-modal-scroll" 
          style={{
            backgroundColor: 'white',
            maxHeight: 'calc(95vh - 200px)', // Account for header and footer
            minHeight: '400px',
            scrollbarWidth: 'thin', // Firefox
            scrollbarColor: '#94a3b8 #f1f5f9' // Firefox
          }}
        >
          <ImageUpload 
            ref={imageUploadRef}
            onUpload={handleUpload}
            onFileSelected={(hasFile) => setCanSave(hasFile)}
            initialDescription={initialDescription}
            initialUsageType={initialUsageType}
            initialModality={initialModality}
            initialEchoView={initialEchoView}
            hideModality={hideModality}
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
    </>
  );
};

export default ImageUploadModal;