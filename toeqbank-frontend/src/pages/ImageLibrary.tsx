import React from 'react';
import ImageManager from '../components/ImageManager';

const ImageLibrary: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">TOE Image Library</h1>
          <p className="text-gray-600">
            Manage your collection of TOE exam images and cine loops. Upload new content, 
            organize with tags, and associate images with questions.
          </p>
        </div>
        
        <ImageManager mode="standalone" />
      </div>
    </div>
  );
};

export default ImageLibrary;