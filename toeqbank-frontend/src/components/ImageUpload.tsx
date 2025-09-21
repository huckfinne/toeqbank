import React, { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import { imageService, Image, LicenseType } from '../services/api';
import { getViewsForModality } from '../services/echoViews';

interface ImageUploadProps {
  onUpload: (image: Image, usageType: 'question' | 'explanation') => void;
  onFileSelected?: (hasFile: boolean) => void;
  acceptedTypes?: string;
  maxSize?: number; // in MB
  className?: string;
  initialDescription?: string;
  initialUsageType?: 'question' | 'explanation';
  initialModality?: 'transthoracic' | 'transesophageal' | 'non-echo';
  initialEchoView?: string;
}

const ImageUpload = forwardRef<any, ImageUploadProps>(({
  onUpload,
  onFileSelected,
  acceptedTypes = "image/*,video/*",
  maxSize = 100,
  className = "",
  initialDescription = "",
  initialUsageType = "question",
  initialModality,
  initialEchoView
}, ref) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [uploadMode, setUploadMode] = useState<'file' | 'url'>('file');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastOpenTime = useRef(0);

  const [metadata, setMetadata] = useState({
    description: initialDescription,
    tags: '',
    image_type: 'still' as 'still' | 'cine',
    license: 'user-contributed' as LicenseType,
    license_details: '',
    usage_type: initialUsageType,
    modality: (initialModality || '') as 'transthoracic' | 'transesophageal' | 'non-echo' | '',
    echo_view: initialEchoView || ''
  });

  useImperativeHandle(ref, () => ({
    triggerUpload: handleUpload
  }));

  // Get available views based on selected modality
  const availableViews = metadata.modality ? getViewsForModality(metadata.modality) : [];

  // Reset view when modality changes
  const handleModalityChange = (newModality: 'transthoracic' | 'transesophageal' | 'non-echo') => {
    setMetadata(prev => ({
      ...prev,
      modality: newModality,
      echo_view: '' // Reset view selection
    }));
  };

  const handleFileSelect = (file: File) => {
    setError(null);
    
    // Validate file size
    if (file.size > maxSize * 1024 * 1024) {
      setError(`File size must be less than ${maxSize}MB`);
      onFileSelected?.(false);
      return;
    }

    // Validate file type
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    
    if (!isImage && !isVideo) {
      setError('Please select an image or video file');
      onFileSelected?.(false);
      return;
    }

    // Set the selected file and auto-detect type
    setSelectedFile(file);
    setMetadata(prev => ({
      ...prev,
      image_type: isVideo ? 'cine' : 'still'
    }));

    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    
    // Notify parent that file is selected
    onFileSelected?.(true);
  };

  const fetchImageFromUrl = async (url: string): Promise<File> => {
    try {
      // Use our proxy endpoint to avoid CORS issues
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
      const proxyUrl = `${API_BASE_URL}/images/proxy?url=${encodeURIComponent(url)}`;
      
      const response = await fetch(proxyUrl);
      
      if (!response.ok) {
        // Provide specific error messages based on status code
        if (response.status === 403) {
          throw new Error('Access denied: The website is blocking automated requests. Try saving the image locally first.');
        } else if (response.status === 404) {
          throw new Error('Image not found: The URL does not exist or has been moved.');
        } else if (response.status >= 500) {
          throw new Error('Server error: The website is temporarily unavailable.');
        } else {
          throw new Error(`Failed to fetch image (${response.status}): ${response.statusText}`);
        }
      }
      
      const blob = await response.blob();
      const fileName = url.split('/').pop() || 'image';
      const file = new File([blob], fileName, { type: blob.type });
      return file;
    } catch (err) {
      if (err instanceof Error) {
        throw err; // Re-throw our custom error messages
      }
      throw new Error('Failed to fetch image from URL. Please check the URL and try again.');
    }
  };

  const handleUrlSubmit = async () => {
    if (!urlInput.trim()) {
      setError('Please enter a valid URL');
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      // Try to fetch the image from the URL
      const file = await fetchImageFromUrl(urlInput);
      
      // Validate file type
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      
      if (!isImage && !isVideo) {
        setError('URL must point to an image or video file');
        setIsUploading(false);
        return;
      }

      // Set the file and preview
      setSelectedFile(file);
      setPreviewUrl(urlInput);
      setMetadata(prev => ({
        ...prev,
        image_type: isVideo ? 'cine' : 'still'
      }));
      onFileSelected?.(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch image from URL. Please check the URL and try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile && uploadMode === 'file') return;
    if (!urlInput.trim() && uploadMode === 'url') return;

    // Validate required fields
    if (!metadata.description.trim()) {
      setError('Please provide a description of the image.');
      return;
    }
    if (!metadata.modality) {
      setError('Please select a modality.');
      return;
    }
    if (metadata.modality !== 'non-echo' && !metadata.echo_view) {
      setError('Please select an echo view.');
      return;
    }

    try {
      setIsUploading(true);
      
      const uploadMetadata = {
        ...metadata,
        tags: [
          ...metadata.tags.split(',').map(t => t.trim()).filter(t => t.length > 0),
          metadata.modality,
          ...(metadata.echo_view ? [metadata.echo_view] : [])
        ]
      };

      // If using URL mode, pass the URL in metadata and null file
      const finalMetadata = uploadMode === 'url' 
        ? { ...uploadMetadata, source_url: urlInput }
        : uploadMetadata;

      const uploadedImage = await imageService.uploadImage(
        uploadMode === 'url' ? null : selectedFile, 
        finalMetadata
      );
      onUpload(uploadedImage, metadata.usage_type);
      
      // Reset form
      setSelectedFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      setMetadata({ description: '', tags: '', image_type: 'still', license: 'user-contributed', license_details: '', usage_type: 'question', modality: '', echo_view: '' });
      setUrlInput('');
      setUploadMode('file');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      setError('Failed to upload file. Please try again.');
      console.error('Upload error:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
      // Defer the reset to avoid triggering events
      setTimeout(() => {
        if (event.target) {
          event.target.value = '';
        }
      }, 100);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const openFileSelector = () => {
    const now = Date.now();
    const timeSinceLastOpen = now - lastOpenTime.current;
    
    // Prevent double-clicking due to React StrictMode
    if (timeSinceLastOpen < 200) {
      return;
    }
    
    lastOpenTime.current = now;
    
    // Open the file selector
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="space-y-6 p-2">
      {/* Image Description */}
      <div>
        <label className="block text-sm font-semibold text-gray-800 mb-2">
          Description *
        </label>
        <textarea
          value={metadata.description}
          onChange={(e) => setMetadata({ ...metadata, description: e.target.value })}
          placeholder="Describe what is shown in this image..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          rows={3}
        />
      </div>

      {/* Modality */}
      <div>
        <label className="block text-sm font-semibold text-gray-800 mb-3">
          Modality *
        </label>
        <div className="space-y-2">
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              value="transthoracic"
              checked={metadata.modality === 'transthoracic'}
              onChange={(e) => handleModalityChange(e.target.value as 'transthoracic')}
              className="w-4 h-4 text-blue-600 mr-3"
            />
            <span className="text-sm text-gray-700">Transthoracic Echo (TTE)</span>
          </label>
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              value="transesophageal"
              checked={metadata.modality === 'transesophageal'}
              onChange={(e) => handleModalityChange(e.target.value as 'transesophageal')}
              className="w-4 h-4 text-blue-600 mr-3"
            />
            <span className="text-sm text-gray-700">Transesophageal Echo (TEE/TOE)</span>
          </label>
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              value="non-echo"
              checked={metadata.modality === 'non-echo'}
              onChange={(e) => handleModalityChange(e.target.value as 'non-echo')}
              className="w-4 h-4 text-blue-600 mr-3"
            />
            <span className="text-sm text-gray-700">Non-echo Image</span>
          </label>
        </div>
      </div>

      {/* Echo View */}
      {metadata.modality && metadata.modality !== 'non-echo' && (
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-2">
            Echo View *
          </label>
          <select
            value={metadata.echo_view}
            onChange={(e) => setMetadata({ ...metadata, echo_view: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          >
            <option value="">Select a view...</option>
            {availableViews.map((view, index) => {
              const showCategoryHeader = index === 0 || availableViews[index - 1].category !== view.category;
              return (
                <React.Fragment key={view.name}>
                  {showCategoryHeader && (
                    <option disabled>──── {view.category} ────</option>
                  )}
                  <option value={view.name}>{view.name}</option>
                </React.Fragment>
              );
            })}
          </select>
        </div>
      )}

      {/* Image Type and Usage Type - Side by Side */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-3">
            Image Type *
          </label>
          <div className="space-y-2">
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                value="still"
                checked={metadata.image_type === 'still'}
                onChange={(e) => setMetadata({ ...metadata, image_type: e.target.value as 'still' })}
                className="w-4 h-4 text-blue-600 mr-3"
              />
              <span className="text-sm text-gray-700">Still Image</span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                value="cine"
                checked={metadata.image_type === 'cine'}
                onChange={(e) => setMetadata({ ...metadata, image_type: e.target.value as 'cine' })}
                className="w-4 h-4 text-blue-600 mr-3"
              />
              <span className="text-sm text-gray-700">Video/Cine</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-3">
            Usage Type
          </label>
          <div className="space-y-2">
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                value="question"
                checked={metadata.usage_type === 'question'}
                onChange={(e) => setMetadata({ ...metadata, usage_type: e.target.value as 'question' })}
                className="w-4 h-4 text-blue-600 mr-3"
              />
              <span className="text-sm text-gray-700">Question</span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                value="explanation"
                checked={metadata.usage_type === 'explanation'}
                onChange={(e) => setMetadata({ ...metadata, usage_type: e.target.value as 'explanation' })}
                className="w-4 h-4 text-blue-600 mr-3"
              />
              <span className="text-sm text-gray-700">Explanation</span>
            </label>
          </div>
        </div>
      </div>

      {/* License */}
      <div>
        <label className="block text-sm font-semibold text-gray-800 mb-2">
          License *
        </label>
        <select
          value={metadata.license}
          onChange={(e) => setMetadata({ ...metadata, license: e.target.value as LicenseType })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
        >
          {imageService.getLicenseOptions().map((option, index, arr) => {
            const prevCategory = index > 0 ? arr[index - 1].category : null;
            const showSeparator = prevCategory !== option.category;
            
            return (
              <React.Fragment key={option.value}>
                {showSeparator && index > 0 && (
                  <option disabled>──────────</option>
                )}
                <option value={option.value}>
                  {option.label}
                </option>
              </React.Fragment>
            );
          })}
        </select>
      </div>

      {/* Upload Method */}
      <div>
        <label className="block text-sm font-semibold text-gray-800 mb-3">Upload Method</label>
        <div className="flex gap-6">
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              value="file"
              checked={uploadMode === 'file'}
              onChange={(e) => setUploadMode(e.target.value as 'file')}
              className="w-4 h-4 text-blue-600 mr-3"
            />
            <span className="text-sm text-gray-700">Upload File</span>
          </label>
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              value="url"
              checked={uploadMode === 'url'}
              onChange={(e) => setUploadMode(e.target.value as 'url')}
              className="w-4 h-4 text-blue-600 mr-3"
            />
            <span className="text-sm text-gray-700">From URL</span>
          </label>
        </div>
      </div>

      {/* File Upload or URL Input */}
      {uploadMode === 'url' ? (
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-2">
            Image/Video URL
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
            <button
              type="button"
              onClick={handleUrlSubmit}
              disabled={isUploading || !urlInput.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-medium"
            >
              {isUploading ? 'Fetching...' : 'Fetch'}
            </button>
          </div>
        </div>
      ) : (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedTypes}
            onChange={handleInputChange}
            style={{ display: 'none' }}
            disabled={isUploading}
          />
          
          <div
            className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer ${
              dragActive
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={openFileSelector}
          >
            {selectedFile ? (
              <div className="space-y-3">
                {previewUrl && (
                  <div className="flex justify-center">
                    {selectedFile.type.startsWith('video/') ? (
                      <video 
                        src={previewUrl} 
                        className="rounded border"
                        style={{width: '250px', height: '250px', objectFit: 'cover'}}
                        controls
                      />
                    ) : (
                      <img 
                        src={previewUrl} 
                        alt="Preview" 
                        className="rounded border"
                        style={{width: '250px', height: '250px', objectFit: 'cover'}}
                      />
                    )}
                  </div>
                )}
                <p className="text-sm text-gray-600 font-medium">{selectedFile.name}</p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openFileSelector();
                  }}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 font-medium"
                >
                  Change File
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-3">
                <svg 
                  width="120" 
                  height="120" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24" 
                  className="text-gray-400"
                  style={{width: '120px', height: '120px'}}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-900">Choose file to upload</p>
                  <p className="text-xs text-gray-500 mb-2">Drag and drop or click to select</p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openFileSelector();
                    }}
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 font-medium"
                  >
                    Browse Files
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
    </div>
  );
});

ImageUpload.displayName = 'ImageUpload';

export default ImageUpload;