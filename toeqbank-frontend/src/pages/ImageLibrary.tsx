import React from 'react';
import ImageManager from '../components/ImageManager';

const ImageLibrary: React.FC = () => {
  return (
    <div className="page-container">
      <div className="page-header">
        <h1>TOE Image Library</h1>
        <p>
          Manage your collection of TOE exam images and cine loops. Upload new content, 
          organize with tags, and associate images with questions.
        </p>
      </div>
      
      <ImageManager mode="standalone" />
    </div>
  );
};

export default ImageLibrary;