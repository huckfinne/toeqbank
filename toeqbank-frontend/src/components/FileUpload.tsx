import React, { useState, useRef } from 'react';
import { questionService } from '../services/api';

const FileUpload: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
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

    try {
      setUploading(true);
      setError(null);
      
      const result = await questionService.uploadCSV(selectedFile);
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
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="file-upload">
      <h2>Upload Questions</h2>
      <p>Upload a CSV file containing questions to add them to the question bank.</p>
      
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
{`question_number,question,choice_a,choice_b,choice_c,choice_d,choice_e,correct_answer,explanation,source_folder
1,"What is 2+2?",3,4,5,6,7,B,"2+2 equals 4",Math
2,"What is the capital of France?",London,Paris,Berlin,Madrid,Rome,B,"Paris is the capital of France",Geography`}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default FileUpload;