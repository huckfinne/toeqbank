import React, { useState, useRef } from 'react';
import { questionService } from '../services/api';

const FileUpload: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadMode, setUploadMode] = useState<'without-images' | 'with-images' | 'mixed'>('mixed');
  const [inputMethod, setInputMethod] = useState<'file' | 'paste'>('file');
  const [csvData, setCsvData] = useState<string>('');
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
    // Validate input method requirements
    if (inputMethod === 'file' && !selectedFile) {
      setError('Please select a file first');
      return;
    }
    
    if (inputMethod === 'paste' && !csvData.trim()) {
      setError('Please paste CSV data first');
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
      
      let result;
      if (inputMethod === 'file') {
        // Pass all source information to the service
        result = await questionService.uploadCSV(
          selectedFile!, 
          uploadMode === 'with-images' || uploadMode === 'mixed',
          {
            description: description.trim(),
            isbn: isbn.trim() || undefined,
            startingPage: startingPage.trim() || undefined,
            endingPage: endingPage.trim() || undefined,
            chapter: chapter.trim() || undefined
          }
        );
      } else {
        // Convert CSV text to File object for upload
        const csvFile = new File([csvData], 'pasted-data.csv', { type: 'text/csv' });
        result = await questionService.uploadCSV(
          csvFile, 
          uploadMode === 'with-images' || uploadMode === 'mixed',
          {
            description: description.trim(),
            isbn: isbn.trim() || undefined,
            startingPage: startingPage.trim() || undefined,
            endingPage: endingPage.trim() || undefined,
            chapter: chapter.trim() || undefined
          }
        );
      }
      
      setUploadResult(result);
      setSelectedFile(null);
      setCsvData('');
      
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to upload data');
    } finally {
      setUploading(false);
    }
  };

  const resetUpload = () => {
    setSelectedFile(null);
    setCsvData('');
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
    <div className="page-container">
      <div className="page-header">
        <h2>Upload Questions</h2>
        <p>Upload a CSV file containing questions to add them to the question bank.</p>
      </div>
      
      {/* Upload Mode Selector */}
      <div className="content-card" style={{ marginBottom: '30px' }}>
        <div className="card-header">
          <h3 className="mb-0">Select Upload Mode</h3>
          <p className="text-muted mb-0">Choose how you want to handle image-related questions</p>
        </div>
        <div className="card-body">
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
      </div>

      {/* Source Information */}
      <div className="content-card" style={{ marginBottom: '30px' }}>
        <div className="card-header">
          <h3 className="mb-0">Source Information</h3>
          <p className="text-muted mb-0">Provide details about where these questions came from to help track and cite sources properly</p>
        </div>
        <div className="card-body">

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
      </div>
      
      {/* Input Method Selector */}
      <div className="content-card" style={{ marginBottom: '30px' }}>
        <div className="card-header">
          <h3 className="mb-0">Choose Input Method</h3>
          <p className="text-muted mb-0">Select how you want to provide your CSV data</p>
        </div>
        <div className="card-body">
        <div style={{ display: 'flex', gap: '20px' }}>
          <label style={{ 
            display: 'flex', 
            alignItems: 'center', 
            cursor: 'pointer',
            padding: '10px 20px',
            borderRadius: '6px',
            border: '2px solid',
            borderColor: inputMethod === 'file' ? '#007bff' : '#ced4da',
            backgroundColor: inputMethod === 'file' ? '#e7f1ff' : 'white',
            transition: 'all 0.3s ease'
          }}>
            <input
              type="radio"
              value="file"
              checked={inputMethod === 'file'}
              onChange={(e) => setInputMethod(e.target.value as 'file' | 'paste')}
              style={{ marginRight: '8px' }}
            />
            <div>
              <strong>Upload CSV File</strong>
              <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '2px' }}>
                Select a .csv file from your computer
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
            borderColor: inputMethod === 'paste' ? '#007bff' : '#ced4da',
            backgroundColor: inputMethod === 'paste' ? '#e7f1ff' : 'white',
            transition: 'all 0.3s ease'
          }}>
            <input
              type="radio"
              value="paste"
              checked={inputMethod === 'paste'}
              onChange={(e) => setInputMethod(e.target.value as 'file' | 'paste')}
              style={{ marginRight: '8px' }}
            />
            <div>
              <strong>Paste CSV Data</strong>
              <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '2px' }}>
                Copy and paste CSV data directly
              </div>
            </div>
          </label>
        </div>
        </div>
      </div>

      <div className="content-card">
        <div className="card-header">
          <h3 className="mb-0">CSV Format Requirements</h3>
          <p className="text-muted mb-0">Your CSV file should contain the following columns</p>
        </div>
        <div className="card-body">
          <div className="alert alert-info mb-3">
            <strong>📝 Format Options:</strong> You can upload CSV files with OR without headers. The system will automatically detect the format.
          </div>
          <h4>Column Order (if no headers):</h4>
          <ol>
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
          </ol>
            
{(uploadMode === 'with-images' || uploadMode === 'mixed') && (
              <>
                <h4 style={{ marginTop: '20px', color: '#0056b3' }}>Additional Image Columns:</h4>
                <ol start={11}>
                <li><strong>image_description</strong> (REQUIRED) - Description of the image</li>
                <li><strong>image_modality</strong> (REQUIRED) - TTE, TEE/TOE, or non-echo</li>
                <li><strong>image_view</strong> (REQUIRED for echo) - Echo view (e.g., A4C, PLAX, etc.)</li>
                <li><strong>image_usage</strong> (REQUIRED) - "question" or "explanation"</li>
                <li><strong>image_type</strong> (REQUIRED) - "still" or "cine"</li>
                <li><strong>image_url</strong> (optional) - URL to the image file</li>
                </ol>
              </>
            )}
        </div>
      </div>

      <div className="content-card">
        <div className="card-header">
          <h3 className="mb-0">Upload Data</h3>
          <p className="text-muted mb-0">Provide your CSV data using the selected input method</p>
        </div>
        <div className="card-body">
          {inputMethod === 'file' ? (
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
          ) : (
            <div className="w-full" style={{ marginBottom: '20px' }}>
              <label 
                htmlFor="csv-textarea" 
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Paste your CSV data below:
              </label>
              <textarea
                id="csv-textarea"
                value={csvData}
                onChange={(e) => setCsvData(e.target.value)}
                placeholder="Paste your CSV data here (including headers)..."
                className="px-3 py-2 text-base border border-gray-300 rounded focus:outline-none focus:border-blue-500 resize-vertical"
                style={{
                  width: '100%',
                  minHeight: '400px',
                  fontSize: '13px',
                  fontFamily: 'monospace',
                  backgroundColor: '#fafafa'
                }}
              />
              <div className="text-right text-sm text-gray-600 mt-2">
                {csvData.split('\n').length - 1} lines
              </div>
            </div>
          )}

          <div className="action-buttons">
            <button
              onClick={handleUpload}
              disabled={(inputMethod === 'file' && !selectedFile) || (inputMethod === 'paste' && !csvData.trim()) || uploading}
              className="btn btn-primary"
            >
              {uploading ? 'Uploading...' : 'Upload Questions'}
            </button>

            {(selectedFile || csvData.trim()) && (
              <button onClick={resetUpload} className="btn btn-secondary">
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          Error: {error}
        </div>
      )}

      {uploadResult && (
        <div className="alert alert-success">
          <h3>Upload Successful!</h3>
          <p>{uploadResult.message}</p>
          <div className="upload-details">
            <p>Uploaded {uploadResult.questions?.length || 0} questions successfully.</p>
          </div>
          <button onClick={resetUpload} className="btn btn-primary mt-3">
            Upload Another File
          </button>
        </div>
      )}

      <div className="content-card">
        <div className="card-header">
          <h3 className="mb-0">Sample CSV Format</h3>
          <p className="text-muted mb-0">Example data format for your CSV file</p>
        </div>
        <div className="card-body">
          <div className="csv-sample">
            <pre style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '6px', overflow: 'auto' }}>
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
              <li><strong>Modality values (REQUIRED):</strong> Use "TTE" for transthoracic, "TEE" or "TOE" for transesophageal, "non-echo" for other images</li>
              <li><strong>Usage values (REQUIRED):</strong> Use "question" if image appears with question, "explanation" if with answer</li>
              <li><strong>Type values (REQUIRED):</strong> Use "still" for static images, "cine" for video loops</li>
              <li><strong>Image URLs:</strong> Must be publicly accessible direct links to image/video files</li>
              <li><strong>Views (REQUIRED for echo):</strong> Must use exact view names from the list below</li>
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
        
        {/* Echo View Options */}
        {(uploadMode === 'with-images' || uploadMode === 'mixed') && (
          <div style={{ 
            marginTop: '20px', 
            padding: '15px', 
            backgroundColor: '#e7f3ff',
            border: '1px solid #0066cc',
            borderRadius: '6px'
          }}>
            <h4 style={{ color: '#003d7a', marginBottom: '10px' }}>
              🫀 Valid Echo View Options:
            </h4>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              {/* TTE Views */}
              <div>
                <h5 style={{ color: '#0066cc', marginBottom: '8px' }}>Transthoracic Echo (TTE) Views:</h5>
                <div style={{ fontSize: '12px', color: '#003d7a', marginLeft: '10px' }}>
                  <p style={{ fontWeight: 'bold', marginBottom: '5px' }}>Parasternal:</p>
                  <ul style={{ marginLeft: '15px', marginBottom: '8px' }}>
                    <li>Parasternal Long Axis (PLAX)</li>
                    <li>Parasternal Short Axis - Aortic Valve Level</li>
                    <li>Parasternal Short Axis - Mitral Valve Level</li>
                    <li>Parasternal Short Axis - Papillary Muscle Level</li>
                    <li>Parasternal Short Axis - Apical Level</li>
                    <li>Right Ventricular Inflow</li>
                    <li>Right Ventricular Outflow</li>
                  </ul>
                  
                  <p style={{ fontWeight: 'bold', marginBottom: '5px' }}>Apical:</p>
                  <ul style={{ marginLeft: '15px', marginBottom: '8px' }}>
                    <li>Apical 4-Chamber</li>
                    <li>Apical 2-Chamber</li>
                    <li>Apical 3-Chamber (Long Axis)</li>
                    <li>Apical 5-Chamber</li>
                  </ul>
                  
                  <p style={{ fontWeight: 'bold', marginBottom: '5px' }}>Subcostal:</p>
                  <ul style={{ marginLeft: '15px', marginBottom: '8px' }}>
                    <li>Subcostal 4-Chamber</li>
                    <li>Subcostal Short Axis</li>
                    <li>Subcostal IVC</li>
                    <li>Subcostal Aorta</li>
                  </ul>
                  
                  <p style={{ fontWeight: 'bold', marginBottom: '5px' }}>Suprasternal:</p>
                  <ul style={{ marginLeft: '15px' }}>
                    <li>Suprasternal Long Axis</li>
                    <li>Suprasternal Short Axis</li>
                  </ul>
                </div>
              </div>
              
              {/* TEE Views */}
              <div>
                <h5 style={{ color: '#0066cc', marginBottom: '8px' }}>Transesophageal Echo (TEE) Views:</h5>
                <div style={{ fontSize: '12px', color: '#003d7a', marginLeft: '10px' }}>
                  <p style={{ fontWeight: 'bold', marginBottom: '5px' }}>Upper Esophageal:</p>
                  <ul style={{ marginLeft: '15px', marginBottom: '8px' }}>
                    <li>UE Aortic Arch Long Axis</li>
                    <li>UE Aortic Arch Short Axis</li>
                  </ul>
                  
                  <p style={{ fontWeight: 'bold', marginBottom: '5px' }}>Mid-Esophageal:</p>
                  <ul style={{ marginLeft: '15px', marginBottom: '8px' }}>
                    <li>ME 4-Chamber</li>
                    <li>ME 2-Chamber</li>
                    <li>ME Long Axis</li>
                    <li>ME Mitral Commissural</li>
                    <li>ME Aortic Valve Short Axis</li>
                    <li>ME Aortic Valve Long Axis</li>
                    <li>ME Right Ventricular Inflow-Outflow</li>
                    <li>ME Bicaval</li>
                    <li>ME Left Atrial Appendage</li>
                    <li>ME Ascending Aorta Short Axis</li>
                    <li>ME Ascending Aorta Long Axis</li>
                  </ul>
                  
                  <p style={{ fontWeight: 'bold', marginBottom: '5px' }}>Transgastric:</p>
                  <ul style={{ marginLeft: '15px', marginBottom: '8px' }}>
                    <li>TG Mid Short Axis</li>
                    <li>TG 2-Chamber</li>
                    <li>TG Long Axis</li>
                    <li>TG Right Ventricular Inflow</li>
                    <li>Deep TG Long Axis</li>
                  </ul>
                  
                  <p style={{ fontWeight: 'bold', marginBottom: '5px' }}>Descending Aorta:</p>
                  <ul style={{ marginLeft: '15px' }}>
                    <li>Descending Aorta Short Axis</li>
                    <li>Descending Aorta Long Axis</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div style={{ 
              marginTop: '15px', 
              padding: '10px', 
              backgroundColor: '#fff3cd', 
              border: '1px solid #ffc107', 
              borderRadius: '4px' 
            }}>
              <p style={{ color: '#856404', fontSize: '12px', fontWeight: 'bold', margin: 0 }}>
                ⚠️ Important: Use the exact view names as listed above. For non-echo images, leave the image_view field empty.
              </p>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default FileUpload;