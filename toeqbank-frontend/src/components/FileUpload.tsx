import React, { useState, useRef } from 'react';
import { questionService } from '../services/api';

const FileUpload: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadMode, setUploadMode] = useState<'without-images' | 'with-images' | 'mixed'>('mixed');
  const [description, setDescription] = useState<string>('');
  const [isbn, setIsbn] = useState<string>('');
  const [startingPage, setStartingPage] = useState<string>('');
  const [endingPage, setEndingPage] = useState<string>('');
  const [chapter, setChapter] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.name.toLowerCase().endsWith('.csv')) {
        setError('Please select a CSV file');
        return;
      }
      
      setSelectedFile(file);
      setError(null);
      setUploadResult(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file first');
      return;
    }

    // Validate required fields
    if (!description.trim()) {
      setError('Please provide a description');
      return;
    }

    try {
      setUploading(true);
      setError(null);
      
      // Pass all source information to the service
      const result = await questionService.uploadCSV(
        selectedFile, 
        uploadMode === 'with-images' || uploadMode === 'mixed',
        {
          description: description.trim(),
          isbn: isbn.trim() || undefined,
          startingPage: startingPage.trim() || undefined,
          endingPage: endingPage.trim() || undefined,
          chapter: chapter.trim() || undefined
        }
      );
      setUploadResult(result);
      setSelectedFile(null);
      
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const resetUpload = () => {
    setSelectedFile(null);
    setUploadResult(null);
    setError(null);
    setDescription('');
    setIsbn('');
    setStartingPage('');
    setEndingPage('');
    setChapter('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="file-upload">
      <h2>Upload Questions</h2>
      <p>Upload a CSV file containing questions to add them to the question bank.</p>
      
      {/* Upload Mode Selector */}
      <div className="upload-mode-selector" style={{ 
        marginBottom: '30px', 
        padding: '20px', 
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        border: '1px solid #dee2e6'
      }}>
        <h3 style={{ marginBottom: '15px', color: '#495057' }}>Select Upload Mode:</h3>
        <div style={{ display: 'flex', gap: '20px' }}>
          <label style={{ 
            display: 'flex', 
            alignItems: 'center', 
            cursor: 'pointer',
            padding: '10px 20px',
            borderRadius: '6px',
            border: '2px solid',
            borderColor: uploadMode === 'without-images' ? '#007bff' : '#ced4da',
            backgroundColor: uploadMode === 'without-images' ? '#e7f1ff' : 'white',
            transition: 'all 0.3s ease'
          }}>
            <input
              type="radio"
              value="without-images"
              checked={uploadMode === 'without-images'}
              onChange={(e) => setUploadMode(e.target.value as 'without-images' | 'with-images' | 'mixed')}
              style={{ marginRight: '8px' }}
            />
            <div>
              <strong>Without Images</strong>
              <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '2px' }}>
                Standard CSV upload (current format)
              </div>
            </div>
          </label>
          
          <label style={{ 
            display: 'flex', 
            alignItems: 'center', 
            cursor: 'pointer',
            padding: '10px 20px',
            borderRadius: '6px',
            border: '2px solid',
            borderColor: uploadMode === 'with-images' ? '#007bff' : '#ced4da',
            backgroundColor: uploadMode === 'with-images' ? '#e7f1ff' : 'white',
            transition: 'all 0.3s ease'
          }}>
            <input
              type="radio"
              value="with-images"
              checked={uploadMode === 'with-images'}
              onChange={(e) => setUploadMode(e.target.value as 'without-images' | 'with-images' | 'mixed')}
              style={{ marginRight: '8px' }}
            />
            <div>
              <strong>With Images</strong>
              <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '2px' }}>
                Include image metadata fields
              </div>
            </div>
          </label>
          
          <label style={{ 
            display: 'flex', 
            alignItems: 'center', 
            cursor: 'pointer',
            padding: '10px 20px',
            borderRadius: '6px',
            border: '2px solid',
            borderColor: uploadMode === 'mixed' ? '#007bff' : '#ced4da',
            backgroundColor: uploadMode === 'mixed' ? '#e7f1ff' : 'white',
            transition: 'all 0.3s ease'
          }}>
            <input
              type="radio"
              value="mixed"
              checked={uploadMode === 'mixed'}
              onChange={(e) => setUploadMode(e.target.value as 'without-images' | 'with-images' | 'mixed')}
              style={{ marginRight: '8px' }}
            />
            <div>
              <strong>Mixed (Recommended)</strong>
              <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '2px' }}>
                Some questions need images, others don't
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* Source Information */}
      <div className="upload-source-section" style={{ 
        marginBottom: '30px', 
        padding: '20px', 
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        border: '1px solid #dee2e6'
      }}>
        <h3 style={{ marginBottom: '10px', color: '#495057' }}>Source Information:</h3>
        <p style={{ fontSize: '14px', color: '#6c757d', marginBottom: '20px' }}>
          Please provide details about where these questions came from to help track and cite sources properly.
        </p>

        {/* Description */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px', 
            fontWeight: '500',
            color: '#495057'
          }}>
            Description: <span style={{ color: '#dc3545' }}>*</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g., Questions from 2024 Board Review Course on Valvular Disease"
            style={{
              width: '100%',
              minHeight: '60px',
              padding: '12px',
              border: '2px solid #ced4da',
              borderRadius: '6px',
              fontSize: '14px',
              fontFamily: 'inherit',
              resize: 'vertical'
            }}
            maxLength={500}
            required
          />
          <div style={{ 
            textAlign: 'right', 
            fontSize: '12px', 
            color: '#6c757d', 
            marginTop: '5px' 
          }}>
            {description.length}/500 characters
          </div>
        </div>

        {/* ISBN */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px', 
            fontWeight: '500',
            color: '#495057'
          }}>
            ISBN: <span style={{ fontSize: '12px', fontWeight: 'normal', color: '#6c757d' }}>(optional)</span>
          </label>
          <input
            type="text"
            value={isbn}
            onChange={(e) => setIsbn(e.target.value)}
            placeholder="e.g., 978-0123456789 or 0123456789"
            style={{
              width: '100%',
              padding: '12px',
              border: '2px solid #ced4da',
              borderRadius: '6px',
              fontSize: '14px',
              fontFamily: 'inherit'
            }}
            maxLength={17}
          />
        </div>

        {/* Page Range and Chapter - Grid Layout */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr 1fr', 
          gap: '15px',
          marginBottom: '10px'
        }}>
          {/* Starting Page */}
          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontWeight: '500',
              color: '#495057'
            }}>
              Starting Page: <span style={{ fontSize: '12px', fontWeight: 'normal', color: '#6c757d' }}>(optional)</span>
            </label>
            <input
              type="number"
              value={startingPage}
              onChange={(e) => setStartingPage(e.target.value)}
              placeholder="e.g., 45"
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #ced4da',
                borderRadius: '6px',
                fontSize: '14px',
                fontFamily: 'inherit'
              }}
              min="1"
            />
          </div>

          {/* Ending Page */}
          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontWeight: '500',
              color: '#495057'
            }}>
              Ending Page: <span style={{ fontSize: '12px', fontWeight: 'normal', color: '#6c757d' }}>(optional)</span>
            </label>
            <input
              type="number"
              value={endingPage}
              onChange={(e) => setEndingPage(e.target.value)}
              placeholder="e.g., 52"
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #ced4da',
                borderRadius: '6px',
                fontSize: '14px',
                fontFamily: 'inherit'
              }}
              min="1"
            />
          </div>

          {/* Chapter */}
          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontWeight: '500',
              color: '#495057'
            }}>
              Chapter: <span style={{ fontSize: '12px', fontWeight: 'normal', color: '#6c757d' }}>(optional)</span>
            </label>
            <input
              type="text"
              value={chapter}
              onChange={(e) => setChapter(e.target.value)}
              placeholder="e.g., Chapter 5 or 5"
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #ced4da',
                borderRadius: '6px',
                fontSize: '14px',
                fontFamily: 'inherit'
              }}
              maxLength={50}
            />
          </div>
        </div>

        {/* Note about required fields */}
        <div style={{
          fontSize: '12px',
          color: '#6c757d',
          fontStyle: 'italic',
          marginTop: '10px'
        }}>
          <span style={{ color: '#dc3545' }}>*</span> Required field
        </div>
      </div>
      
      <div className="upload-section">
        <div className="csv-format-info">
          <h3>CSV Format Requirements:</h3>
          <p>Your CSV file should contain the following columns:</p>
          <ul>
            <li><strong>question_number</strong> (optional) - Question identifier</li>
            <li><strong>question</strong> (required) - The question text</li>
            <li><strong>choice_a</strong> (optional) - Option A</li>
            <li><strong>choice_b</strong> (optional) - Option B</li>
            <li><strong>choice_c</strong> (optional) - Option C</li>
            <li><strong>choice_d</strong> (optional) - Option D</li>
            <li><strong>choice_e</strong> (optional) - Option E</li>
            <li><strong>correct_answer</strong> (required) - Must be A, B, C, D, or E</li>
            <li><strong>explanation</strong> (optional) - Explanation of the correct answer</li>
            <li><strong>source_folder</strong> (optional) - Source or category</li>
            
{(uploadMode === 'with-images' || uploadMode === 'mixed') && (
              <>
                <li style={{ marginTop: '10px', color: '#0056b3' }}><strong>Image-specific columns:</strong></li>
                <li><strong>image_description</strong> (optional) - Description of the image</li>
                <li><strong>image_modality</strong> (optional) - TTE, TEE/TOE, or non-echo</li>
                <li><strong>image_view</strong> (optional) - Echo view (e.g., A4C, PLAX, etc.)</li>
                <li><strong>image_usage</strong> (optional) - "question" or "explanation"</li>
                <li><strong>image_type</strong> (optional) - "still" or "cine"</li>
                <li><strong>image_url</strong> (optional) - URL to the image file</li>
              </>
            )}
          </ul>
        </div>

        <div className="upload-controls">
          <div className="file-input-section">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="file-input"
              id="csv-file-input"
            />
            <label htmlFor="csv-file-input" className="file-input-label">
              {selectedFile ? selectedFile.name : 'Choose CSV File'}
            </label>
          </div>

          <button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="upload-button"
          >
            {uploading ? 'Uploading...' : 'Upload Questions'}
          </button>

          {selectedFile && (
            <button onClick={resetUpload} className="reset-button">
              Clear
            </button>
          )}
        </div>

        {error && (
          <div className="error-message">
            <p>Error: {error}</p>
          </div>
        )}

        {uploadResult && (
          <div className="success-message">
            <h3>Upload Successful!</h3>
            <p>{uploadResult.message}</p>
            <div className="upload-details">
              <p>Uploaded {uploadResult.questions?.length || 0} questions successfully.</p>
            </div>
            <button onClick={resetUpload} className="reset-button">
              Upload Another File
            </button>
          </div>
        )}
      </div>

      <div className="existing-questions-info">
        <h3>Sample CSV Format:</h3>
        <div className="csv-sample">
          <pre>
{uploadMode === 'without-images' 
  ? `question_number,question,choice_a,choice_b,choice_c,choice_d,choice_e,correct_answer,explanation,source_folder
1,"What is 2+2?",3,4,5,6,7,B,"2+2 equals 4",Math
2,"What is the capital of France?",London,Paris,Berlin,Madrid,Rome,B,"Paris is the capital of France",Geography`
  : uploadMode === 'with-images'
  ? `question_number,question,choice_a,choice_b,choice_c,choice_d,choice_e,correct_answer,explanation,source_folder,image_description,image_modality,image_view,image_usage,image_type,image_url
1,"Identify the cardiac structure shown in this echocardiogram",Mitral valve,Aortic valve,Tricuspid valve,Pulmonary valve,,A,"The image shows the mitral valve in apical 4-chamber view",Cardiology,"Apical 4-chamber view showing mitral valve",TTE,A4C,question,still,https://example.com/image1.jpg
2,"What abnormality is seen in this TEE image?","Mitral regurgitation","Aortic stenosis","Atrial septal defect","Ventricular septal defect",,C,"The TEE shows an atrial septal defect with color flow",Cardiology,"Mid-esophageal view showing ASD",TEE,"ME 4 Chamber",question,cine,https://example.com/video1.mp4`
  : `question_number,question,choice_a,choice_b,choice_c,choice_d,choice_e,correct_answer,explanation,source_folder,image_description,image_modality,image_view,image_usage,image_type,image_url
1,"What is 2+2?",3,4,5,6,7,B,"2+2 equals 4",Math,,,,,,
2,"Identify the cardiac structure shown in this echocardiogram",Mitral valve,Aortic valve,Tricuspid valve,Pulmonary valve,,A,"The image shows the mitral valve in apical 4-chamber view",Cardiology,"Apical 4-chamber view showing mitral valve",TTE,A4C,question,still,https://example.com/image1.jpg
3,"What is the capital of France?",London,Paris,Berlin,Madrid,Rome,B,"Paris is the capital of France",Geography,,,,,`}
          </pre>
        </div>
        
{(uploadMode === 'with-images' || uploadMode === 'mixed') && (
          <div style={{ 
            marginTop: '20px', 
            padding: '15px', 
            backgroundColor: '#fff3cd',
            border: '1px solid #ffc107',
            borderRadius: '6px'
          }}>
            <h4 style={{ color: '#856404', marginBottom: '10px' }}>
              📝 {uploadMode === 'mixed' ? 'Mixed Upload Notes:' : 'Image Upload Notes:'}
            </h4>
            <ul style={{ color: '#856404', fontSize: '14px', marginLeft: '20px' }}>
              <li><strong>Modality values:</strong> Use "TTE" for transthoracic, "TEE" or "TOE" for transesophageal, "non-echo" for other images</li>
              <li><strong>Usage values:</strong> Use "question" if image appears with question, "explanation" if with answer</li>
              <li><strong>Type values:</strong> Use "still" for static images, "cine" for video loops</li>
              <li><strong>Image URLs:</strong> Must be publicly accessible direct links to image/video files</li>
              <li><strong>Views:</strong> Use standard echo view abbreviations (A4C, A2C, PLAX, PSAX, etc.)</li>
              {uploadMode === 'mixed' && (
                <>
                  <li style={{ marginTop: '8px' }}><strong>Mixed Mode:</strong> Leave image fields blank for questions without images</li>
                  <li><strong>Questions needing images:</strong> Will be marked for image upload and sent to review after images are added</li>
                  <li><strong>Questions without images:</strong> Will go directly to reviewer queue</li>
                </>
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUpload;