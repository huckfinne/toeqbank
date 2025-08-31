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
}

const ImageUpload = forwardRef<any, ImageUploadProps>(({
  onUpload,
  onFileSelected,
  acceptedTypes = "image/*,video/*",
  maxSize = 100,
  className = "",
  initialDescription = "",
  initialUsageType = "question"
}, ref) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [uploadMode, setUploadMode] = useState<'file' | 'url'>('file');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [metadata, setMetadata] = useState({
    description: initialDescription,
    tags: '',
    image_type: 'still' as 'still' | 'cine',
    license: 'user-contributed' as LicenseType,
    license_details: '',
    usage_type: initialUsageType,
    modality: '' as 'transthoracic' | 'transesophageal' | 'non-echo' | '',
    echo_view: ''
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
      setError('Failed to fetch image from URL. Please check the URL and try again.');
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
      setError('Please select a modality (Transthoracic, Transesophageal, or Non-echo Image).');
      return;
    }
    if (metadata.modality !== 'non-echo' && !metadata.echo_view) {
      setError('Please select an echocardiographic view.');
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
    fileInputRef.current?.click();
  };

  return (
    <div className={`image-upload ${className}`}>
      <div className="upload-metadata mb-4">
        {/* Image Description Section */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">📝 Image Description</h3>
          
          <div className="mb-2">
            <label htmlFor="description" className="block text-sm font-medium mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              id="description"
              value={metadata.description}
              onChange={(e) => setMetadata({ ...metadata, description: e.target.value })}
              placeholder="Detailed description of what is shown in this image (e.g., 'Shows severe mitral regurgitation with eccentric jet', 'Demonstrates normal LV function')"
              style={{width: '100%', minHeight: '100px'}}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-vertical"
              rows={4}
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Modality <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="transthoracic"
                  checked={metadata.modality === 'transthoracic'}
                  onChange={(e) => handleModalityChange(e.target.value as 'transthoracic')}
                  className="mr-2"
                />
                Transthoracic Echo (TTE)
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="transesophageal"
                  checked={metadata.modality === 'transesophageal'}
                  onChange={(e) => handleModalityChange(e.target.value as 'transesophageal')}
                  className="mr-2"
                />
                Transesophageal Echo (TEE/TOE)
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="non-echo"
                  checked={metadata.modality === 'non-echo'}
                  onChange={(e) => handleModalityChange(e.target.value as 'non-echo')}
                  className="mr-2"
                />
                Non-echo Image
              </label>
            </div>
          </div>

          {metadata.modality && metadata.modality !== 'non-echo' && (
            <div className="mb-4">
              <label htmlFor="echo_view" className="block text-sm font-medium mb-1">
                Echo View <span className="text-red-500">*</span>
              </label>
              <select
                id="echo_view"
                value={metadata.echo_view}
                onChange={(e) => setMetadata({ ...metadata, echo_view: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
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
              <p className="text-xs text-gray-500 mt-1">
                Select the specific echocardiographic view shown in this image
              </p>
            </div>
          )}

          {metadata.modality === 'non-echo' && (
            <div className="mb-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                <p className="text-sm text-amber-800">
                  <strong>Non-echo Image:</strong> This image is not an echocardiogram (e.g., X-ray, CT, MRI, diagram, etc.)
                </p>
              </div>
            </div>
          )}
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Image Type <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="still"
                  checked={metadata.image_type === 'still'}
                  onChange={(e) => setMetadata({ ...metadata, image_type: e.target.value as 'still' })}
                  className="mr-2"
                />
                Still Image
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="cine"
                  checked={metadata.image_type === 'cine'}
                  onChange={(e) => setMetadata({ ...metadata, image_type: e.target.value as 'cine' })}
                  className="mr-2"
                />
                Cine Loop (Video)
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Choose "Still Image" for static images or "Cine Loop" for video clips
            </p>
          </div>
        </div>

        {/* Technical Metadata Section */}
        <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg"  >
          <h3 className="text-lg font-semibold text-gray-900 mb-3">⚙️ Technical Metadata</h3>

        <div className="mb-2">
          <label htmlFor="license" className="block text-sm font-medium mb-1">
            License <span className="text-red-500">*</span>
          </label>
          <select
            id="license"
            value={metadata.license}
            onChange={(e) => setMetadata({ ...metadata, license: e.target.value as LicenseType })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
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
                    {option.category}: {option.label}
                  </option>
                </React.Fragment>
              );
            })}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Choose the appropriate license for this image/video
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Usage Type</label>
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                value="question"
                checked={metadata.usage_type === 'question'}
                onChange={(e) => setMetadata({ ...metadata, usage_type: e.target.value as 'question' })}
                className="mr-2"
              />
              Question
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="explanation"
                checked={metadata.usage_type === 'explanation'}
                onChange={(e) => setMetadata({ ...metadata, usage_type: e.target.value as 'explanation' })}
                className="mr-2"
              />
              Explanation
            </label>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Choose whether this image will be used in the question or explanation section
          </p>
        </div>
        </div>

      </div>

      {/* Upload Mode Toggle */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Upload Method</label>
        <div className="flex gap-4">
          <label className="flex items-center">
            <input
              type="radio"
              value="file"
              checked={uploadMode === 'file'}
              onChange={(e) => setUploadMode(e.target.value as 'file')}
              className="mr-2"
            />
            Upload File
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value="url"
              checked={uploadMode === 'url'}
              onChange={(e) => setUploadMode(e.target.value as 'url')}
              className="mr-2"
            />
            From URL
          </label>
        </div>
      </div>

      {/* URL Input */}
      {uploadMode === 'url' ? (
        <div className="mb-4">
          <label htmlFor="url-input" className="block text-sm font-medium mb-1">
            Image/Video URL
          </label>
          <div className="flex gap-2">
            <input
              id="url-input"
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={handleUrlSubmit}
              disabled={isUploading || !urlInput.trim()}
              className={`px-4 py-2 rounded text-sm font-medium transition-all duration-200 ${
                isUploading || !urlInput.trim()
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isUploading ? 'Fetching...' : 'Fetch'}
            </button>
          </div>
          {previewUrl && uploadMode === 'url' && (
            <div className="mt-2">
              <img src={previewUrl} alt="Preview" className="max-w-full h-auto max-h-32 rounded" />
            </div>
          )}
        </div>
      ) : (
        <div
          style={{
            width: '200px',
            height: '100px',
            margin: '0 auto'
          }}
          className={`border-2 border-dashed rounded-lg p-2 text-center transition-colors ${
            dragActive
              ? 'border-blue-400 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          } ${isUploading ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`}
        onDragEnter={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleDrag(e);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleDrag(e);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleDrag(e);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleDrop(e);
        }}
        onClick={(e) => {
          e.stopPropagation();
          openFileSelector();
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedTypes}
          onChange={handleInputChange}
          className="hidden"
          disabled={isUploading}
        />
        
        {selectedFile ? (
          <div className="space-y-1">
            <div className="text-green-600">
              <svg className="mx-auto h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-xs text-gray-600">{selectedFile.name}</p>
          </div>
        ) : (
          <div className="space-y-1">
            <div className="text-gray-400">
              <svg className="mx-auto h-4 w-4" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="text-xs text-gray-600">
              Drop files or click
            </p>
          </div>
        )}
      </div>
      )}

      {/* Display selected file/URL info for upload */}
      {(selectedFile || (uploadMode === 'url' && previewUrl)) && (
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={handleUpload}
            disabled={isUploading}
            className={`px-4 py-2 rounded text-sm font-medium transition-all duration-200 ${
              isUploading
                ? 'bg-gray-400 text-white cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isUploading ? 'Uploading...' : 'Upload Image'}
          </button>
        </div>
      )}

      {error && (
        <div className="mt-2 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
          {error}
        </div>
      )}
    </div>
  );
});

ImageUpload.displayName = 'ImageUpload';

export default ImageUpload;