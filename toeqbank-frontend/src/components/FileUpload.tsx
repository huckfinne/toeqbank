import React, { useState, useRef } from 'react';
import { questionService } from '../services/api';

interface ValidationError {
  row: number;
  column?: string;
  message: string;
  severity: 'error' | 'warning';
}

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  rowCount: number;
  hasHeaders: boolean;
}

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
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [showValidation, setShowValidation] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  };

  const validateCSV = (csvContent: string): ValidationResult => {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    const lines = csvContent.split('\n').filter(line => line.trim());

    if (lines.length === 0) {
      errors.push({ row: 0, message: 'CSV file is empty', severity: 'error' });
      return { valid: false, errors, warnings, rowCount: 0, hasHeaders: false };
    }

    // Check if first line is a header
    const firstLine = lines[0].toLowerCase();
    const hasHeaders = firstLine.includes('question') && firstLine.includes('correct_answer');

    const dataLines = hasHeaders ? lines.slice(1) : lines;
    const validAnswers = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

    dataLines.forEach((line, index) => {
      const rowNum = hasHeaders ? index + 2 : index + 1;
      const columns = parseCSVLine(line);

      // Expected structure WITHOUT headers (standard format):
      // 0: question_number, 1: question, 2-6: choices A-E, 7: correct_answer, 8: explanation, 9: source_folder
      // WITH image fields (columns 10-15):
      // 10: image_description, 11: image_modality, 12: image_view, 13: image_usage, 14: image_type, 15: image_url

      // Check minimum columns
      const minCols = (uploadMode === 'with-images') ? 16 : 10;
      const recommendedCols = (uploadMode === 'with-images') ? 16 : (uploadMode === 'mixed') ? 10 : 10;

      if (columns.length < 10) {
        errors.push({
          row: rowNum,
          message: `Insufficient columns: found ${columns.length}, need at least 10. Expected format: question_number, question, choice_a, choice_b, choice_c, choice_d, choice_e, correct_answer, explanation, source_folder${uploadMode !== 'without-images' ? ', [+ image fields]' : ''}`,
          severity: 'error'
        });
        return;
      }

      // Column indices for standard format (no headers)
      const questionIdx = 1;
      const choiceStartIdx = 2;
      const choiceEndIdx = 7;
      const correctAnswerIdx = 7;
      const explanationIdx = 8;
      const sourceIdx = 9;

      // Image field indices (if present)
      const imageDescIdx = 10;
      const imageModalityIdx = 11;
      const imageViewIdx = 12;
      const imageUsageIdx = 13;
      const imageTypeIdx = 14;
      const imageUrlIdx = 15;

      // Validate question text
      const question = columns[questionIdx];
      if (!question || question.trim().length === 0) {
        errors.push({
          row: rowNum,
          column: `Column ${questionIdx + 1} (question)`,
          message: `Question text is empty. This should be column ${questionIdx + 1} (after question_number).`,
          severity: 'error'
        });
      }

      // Validate correct answer
      const correctAnswer = columns[correctAnswerIdx];
      if (!correctAnswer || correctAnswer.trim().length === 0) {
        errors.push({
          row: rowNum,
          column: `Column ${correctAnswerIdx + 1} (correct_answer)`,
          message: `Correct answer is empty. This should be column ${correctAnswerIdx + 1}. Found: "${correctAnswer}". Must be A, B, C, D, E, F, or G.`,
          severity: 'error'
        });
      } else if (!validAnswers.includes(correctAnswer.toUpperCase().trim())) {
        errors.push({
          row: rowNum,
          column: `Column ${correctAnswerIdx + 1} (correct_answer)`,
          message: `Invalid correct answer in column ${correctAnswerIdx + 1}: "${correctAnswer}". Must be exactly one of: A, B, C, D, E, F, or G (case-insensitive, single letter only).`,
          severity: 'error'
        });
      }

      // Check for image fields if in with-images or mixed mode
      if (uploadMode === 'with-images' || uploadMode === 'mixed') {
        const hasImageDescription = columns.length > imageDescIdx && columns[imageDescIdx] && columns[imageDescIdx].trim();
        const hasImageModality = columns.length > imageModalityIdx && columns[imageModalityIdx] && columns[imageModalityIdx].trim();
        const hasImageView = columns.length > imageViewIdx && columns[imageViewIdx] && columns[imageViewIdx].trim();
        const hasImageUsage = columns.length > imageUsageIdx && columns[imageUsageIdx] && columns[imageUsageIdx].trim();
        const hasImageType = columns.length > imageTypeIdx && columns[imageTypeIdx] && columns[imageTypeIdx].trim();

        const hasAnyImageField = hasImageDescription || hasImageModality || hasImageView || hasImageUsage || hasImageType;

        if (uploadMode === 'with-images' && !hasAnyImageField) {
          errors.push({
            row: rowNum,
            message: `Image fields are required in "With Images" mode. Columns ${imageDescIdx + 1}-${imageTypeIdx + 1} (image_description through image_type) are missing or empty.`,
            severity: 'error'
          });
        }

        // If any image field is present, validate them
        if (hasAnyImageField) {
          // Validate image description
          if (!hasImageDescription) {
            errors.push({
              row: rowNum,
              column: `Column ${imageDescIdx + 1} (image_description)`,
              message: `Image description is required when image fields are present. This should be column ${imageDescIdx + 1}.`,
              severity: 'error'
            });
          }

          // Validate image modality
          if (!hasImageModality) {
            errors.push({
              row: rowNum,
              column: `Column ${imageModalityIdx + 1} (image_modality)`,
              message: `Image modality is required. This should be column ${imageModalityIdx + 1}. Must be one of: TTE, TEE, or non-echo.`,
              severity: 'error'
            });
          } else {
            const modality = columns[imageModalityIdx].toLowerCase().trim();
            if (!['tte', 'tee', 'toe', 'non-echo'].includes(modality)) {
              errors.push({
                row: rowNum,
                column: `Column ${imageModalityIdx + 1} (image_modality)`,
                message: `Invalid modality in column ${imageModalityIdx + 1}: "${columns[imageModalityIdx]}". Must be exactly one of: "TTE", "TEE", or "non-echo" (case-insensitive). Found text appears to be: "${columns[imageModalityIdx].substring(0, 50)}${columns[imageModalityIdx].length > 50 ? '...' : ''}"`,
                severity: 'error'
              });
            }
          }

          // Validate image usage
          if (!hasImageUsage) {
            errors.push({
              row: rowNum,
              column: `Column ${imageUsageIdx + 1} (image_usage)`,
              message: `Image usage is required. This should be column ${imageUsageIdx + 1}. Must be either "question" or "explanation".`,
              severity: 'error'
            });
          } else {
            const usage = columns[imageUsageIdx].toLowerCase().trim();
            if (!['question', 'explanation'].includes(usage)) {
              errors.push({
                row: rowNum,
                column: `Column ${imageUsageIdx + 1} (image_usage)`,
                message: `Invalid usage in column ${imageUsageIdx + 1}: "${columns[imageUsageIdx]}". Must be exactly either "question" or "explanation" (case-insensitive). Found: "${columns[imageUsageIdx]}"`,
                severity: 'error'
              });
            }
          }

          // Validate image type
          if (!hasImageType) {
            errors.push({
              row: rowNum,
              column: `Column ${imageTypeIdx + 1} (image_type)`,
              message: `Image type is required. This should be column ${imageTypeIdx + 1}. Must be either "still" or "cine".`,
              severity: 'error'
            });
          } else {
            const type = columns[imageTypeIdx].toLowerCase().trim();
            if (!['still', 'cine'].includes(type)) {
              errors.push({
                row: rowNum,
                column: `Column ${imageTypeIdx + 1} (image_type)`,
                message: `Invalid type in column ${imageTypeIdx + 1}: "${columns[imageTypeIdx]}". Must be exactly either "still" or "cine" (case-insensitive). Found: "${columns[imageTypeIdx]}"`,
                severity: 'error'
              });
            }
          }
        }
      }

      // Warnings for empty choices
      let emptyChoices = 0;
      let filledChoices = [];
      for (let i = choiceStartIdx; i < choiceEndIdx; i++) {
        if (!columns[i] || columns[i].trim().length === 0) {
          emptyChoices++;
        } else {
          filledChoices.push(String.fromCharCode(65 + (i - choiceStartIdx))); // A, B, C, etc.
        }
      }

      if (emptyChoices > 2) {
        warnings.push({
          row: rowNum,
          message: `Only ${5 - emptyChoices} answer choices provided (${filledChoices.join(', ')}). Consider adding more options for columns ${choiceStartIdx + 1}-${choiceEndIdx}.`,
          severity: 'warning'
        });
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      rowCount: dataLines.length,
      hasHeaders
    };
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
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

      // Read and validate the file
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        const result = validateCSV(content);
        setValidationResult(result);
        setShowValidation(true);
      };
      reader.readAsText(file);
    }
  };

  const handleCSVDataChange = (value: string) => {
    setCsvData(value);
    if (value.trim()) {
      const result = validateCSV(value);
      setValidationResult(result);
      setShowValidation(true);
    } else {
      setValidationResult(null);
      setShowValidation(false);
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

    // Check validation results
    if (validationResult && !validationResult.valid) {
      setError(`Cannot upload: CSV has ${validationResult.errors.length} error(s). Please fix the errors shown below.`);
      setShowValidation(true);
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
    setValidationResult(null);
    setShowValidation(false);
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
                onChange={(e) => handleCSVDataChange(e.target.value)}
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

          {/* Validation Results Display */}
          {showValidation && validationResult && (
            <div style={{ marginTop: '20px', marginBottom: '20px' }}>
              {/* Summary Box */}
              <div style={{
                padding: '15px',
                borderRadius: '8px',
                border: '2px solid',
                borderColor: validationResult.valid ? '#28a745' : '#dc3545',
                backgroundColor: validationResult.valid ? '#d4edda' : '#f8d7da',
                marginBottom: '15px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '24px' }}>
                    {validationResult.valid ? '✓' : '✗'}
                  </span>
                  <div>
                    <h4 style={{
                      margin: 0,
                      color: validationResult.valid ? '#155724' : '#721c24',
                      fontSize: '16px',
                      fontWeight: 'bold'
                    }}>
                      {validationResult.valid
                        ? 'CSV Validation Passed'
                        : `CSV Validation Failed: ${validationResult.errors.length} Error${validationResult.errors.length !== 1 ? 's' : ''} Found`
                      }
                    </h4>
                    <p style={{
                      margin: '5px 0 0 0',
                      color: validationResult.valid ? '#155724' : '#721c24',
                      fontSize: '14px'
                    }}>
                      {validationResult.rowCount} data row{validationResult.rowCount !== 1 ? 's' : ''} found
                      {validationResult.hasHeaders && ' (with headers)'}
                      {validationResult.warnings.length > 0 &&
                        ` | ${validationResult.warnings.length} warning${validationResult.warnings.length !== 1 ? 's' : ''}`
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* Errors List */}
              {validationResult.errors.length > 0 && (
                <div style={{
                  padding: '15px',
                  borderRadius: '8px',
                  border: '1px solid #dc3545',
                  backgroundColor: '#fff5f5',
                  marginBottom: '15px'
                }}>
                  <h5 style={{
                    margin: '0 0 10px 0',
                    color: '#721c24',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span style={{ fontSize: '18px' }}>❌</span>
                    Errors (must be fixed before upload):
                  </h5>
                  <ul style={{
                    margin: '0',
                    paddingLeft: '20px',
                    fontSize: '13px',
                    color: '#721c24'
                  }}>
                    {validationResult.errors.map((error, index) => (
                      <li key={index} style={{ marginBottom: '5px' }}>
                        <strong>Row {error.row}</strong>
                        {error.column && <span> (Column: {error.column})</span>}: {error.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Warnings List */}
              {validationResult.warnings.length > 0 && (
                <div style={{
                  padding: '15px',
                  borderRadius: '8px',
                  border: '1px solid #ffc107',
                  backgroundColor: '#fff3cd',
                  marginBottom: '15px'
                }}>
                  <h5 style={{
                    margin: '0 0 10px 0',
                    color: '#856404',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span style={{ fontSize: '18px' }}>⚠️</span>
                    Warnings (can still upload, but review recommended):
                  </h5>
                  <ul style={{
                    margin: '0',
                    paddingLeft: '20px',
                    fontSize: '13px',
                    color: '#856404'
                  }}>
                    {validationResult.warnings.map((warning, index) => (
                      <li key={index} style={{ marginBottom: '5px' }}>
                        <strong>Row {warning.row}</strong>
                        {warning.column && <span> (Column: {warning.column})</span>}: {warning.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
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