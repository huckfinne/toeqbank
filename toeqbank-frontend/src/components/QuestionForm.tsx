import React, { useState, useEffect } from 'react';
import { questionService, imageService, Question, Image, imageDescriptionService, ImageDescription, questionMetadataService, examService } from '../services/api';
import ImageManager from './ImageManager';
import ImageUploadModal from './ImageUploadModal';
import ImageDescriptionModal from './ImageDescriptionModal';
import MetadataGenerationDialog from './MetadataGenerationDialog';
import ApplicableExamsDialog from './ApplicableExamsDialog';

interface QuestionFormProps {
  onSuccess?: (question: Question) => void;
  initialData?: Partial<Question>;
  mode?: 'create' | 'edit';
}

const QuestionForm: React.FC<QuestionFormProps> = ({
  onSuccess,
  initialData = {},
  mode = 'create'
}) => {
  const [formData, setFormData] = useState({
    question_number: initialData.question_number || '',
    question: initialData.question || '',
    choice_a: initialData.choice_a || '',
    choice_b: initialData.choice_b || '',
    choice_c: initialData.choice_c || '',
    choice_d: initialData.choice_d || '',
    choice_e: initialData.choice_e || '',
    choice_f: initialData.choice_f || '',
    choice_g: initialData.choice_g || '',
    correct_answer: initialData.correct_answer || '',
    explanation: initialData.explanation || '',
    source_folder: initialData.source_folder || ''
  });

  const [selectedImages, setSelectedImages] = useState<{image: Image, usageType: 'question' | 'explanation'}[]>(
    (initialData.images || []).map(img => ({ 
      image: img, 
      usageType: (img as any).usage_type || 'question' as 'question' | 'explanation'
    }))
  );
  const [showImageManager, setShowImageManager] = useState(false);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [showImageDescriptionModal, setShowImageDescriptionModal] = useState(false);
  const [imageDescriptions, setImageDescriptions] = useState<ImageDescription[]>([]);
  const [generatedMetadata, setGeneratedMetadata] = useState<{id: string, data: any}[]>([]);
  const [generatedExams, setGeneratedExams] = useState<{id: string, data: any}[]>([]);
  const [showMetadataDialog, setShowMetadataDialog] = useState(false);
  const [showApplicableExamsDialog, setShowApplicableExamsDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingMetadata, setEditingMetadata] = useState<{[key: string]: boolean}>({});
  const [editingExams, setEditingExams] = useState<{[key: string]: boolean}>({});

  // Load existing image descriptions and metadata from database in edit mode
  useEffect(() => {
    const loadImageDescriptions = async () => {
      if (mode === 'edit' && initialData.id && imageDescriptions.length === 0) {
        try {
          console.log('QuestionForm: Loading image descriptions for question', initialData.id);
          const descriptions = await imageDescriptionService.getByQuestionId(initialData.id);
          console.log('QuestionForm: Loaded image descriptions:', descriptions);
          setImageDescriptions(descriptions);
        } catch (error) {
          console.error('QuestionForm: Failed to load image descriptions:', error);
        }
      }
    };
    
    loadImageDescriptions();
  }, [mode, initialData.id, imageDescriptions.length]);

  // Separate useEffect for metadata and exam loading to avoid dependency issues
  useEffect(() => {
    const loadMetadata = async () => {
      if (mode === 'edit' && initialData.id) {
        try {
          console.log('QuestionForm: Loading metadata for question', initialData.id);
          const metadata = await questionMetadataService.getByQuestionId(initialData.id);
          console.log('QuestionForm: Loaded metadata:', metadata);
          setGeneratedMetadata([{ id: '1', data: metadata }]);
        } catch (error: any) {
          console.error('QuestionForm: Failed to load metadata:', error);
          if (error.response?.status === 404) {
            console.log('QuestionForm: No metadata exists for this question yet');
          }
        }
      }
    };

    const loadExams = async () => {
      if (mode === 'edit' && initialData.id) {
        try {
          console.log('QuestionForm: Loading exam assignments for question', initialData.id);
          const exams = await examService.getExamAssignments(initialData.id);
          console.log('QuestionForm: Loaded exam assignments:', exams);
          if (exams.length > 0) {
            setGeneratedExams([{ id: '1', data: exams }]);
          }
        } catch (error: any) {
          console.error('QuestionForm: Failed to load exam assignments:', error);
          if (error.response?.status === 404) {
            console.log('QuestionForm: No exam assignments exist for this question yet');
          }
        }
      }
    };
    
    loadMetadata();
    loadExams();
  }, [mode, initialData.id]);

  // Debug: Monitor state changes
  useEffect(() => {
    console.log('QuestionForm: imageDescriptions state changed:', imageDescriptions);
  }, [imageDescriptions]);

  useEffect(() => {
    console.log('QuestionForm: generatedMetadata state changed:', generatedMetadata);
  }, [generatedMetadata]);

  useEffect(() => {
    console.log('QuestionForm: generatedExams state changed:', generatedExams);
  }, [generatedExams]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  const handleImageSelect = (image: Image) => {
    if (!selectedImages.find(item => item.image.id === image.id)) {
      setSelectedImages(prev => [...prev, { image, usageType: 'question' }]);
    }
  };

  const handleImageRemove = (imageId: number) => {
    setSelectedImages(prev => prev.filter(item => item.image.id !== imageId));
  };

  const handleImageMove = async (imageId: number, newUsageType: 'question' | 'explanation') => {
    // Update local state immediately for better UX
    setSelectedImages(prev => prev.map(item => 
      item.image.id === imageId 
        ? { ...item, usageType: newUsageType }
        : item
    ));

    // If this is an existing question (has an ID), persist the change to the database
    if (initialData.id) {
      try {
        await imageService.updateImageUsage(imageId, initialData.id, newUsageType);
      } catch (error) {
        console.error('Failed to update image usage:', error);
        setError('Failed to update image placement. Changes will be saved when you submit the question.');
        
        // Optionally, you could revert the local state change here if desired
        // setSelectedImages(prev => prev.map(item => 
        //   item.image.id === imageId 
        //     ? { ...item, usageType: newUsageType === 'question' ? 'explanation' : 'question' }
        //     : item
        // ));
      }
    }
  };

  const handleImageUpload = (uploadedImage: Image, usageType: 'question' | 'explanation' = 'question') => {
    setSelectedImages(prev => [...prev, { image: uploadedImage, usageType }]);
  };


  const handleImageDescriptionAdd = async (imageDescription: {description: string, usageType: 'question' | 'explanation'}) => {
    console.log('QuestionForm: handleImageDescriptionAdd called with:', imageDescription);
    
    // For new questions, store in state temporarily until question is created
    if (mode === 'create' || !initialData.id) {
      const tempDescription: ImageDescription = {
        id: Date.now(), // Temporary ID
        question_id: 0, // Will be set after question creation
        description: imageDescription.description,
        usage_type: imageDescription.usageType,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      setImageDescriptions(prev => {
        const newDescriptions = [...prev, tempDescription];
        console.log('QuestionForm: Updated imageDescriptions state (temp):', newDescriptions);
        return newDescriptions;
      });
      return;
    }
    
    // For existing questions, save to database immediately
    try {
      const savedDescription = await imageDescriptionService.create({
        question_id: initialData.id!,
        description: imageDescription.description,
        usage_type: imageDescription.usageType
      });
      
      setImageDescriptions(prev => {
        const newDescriptions = [...prev, savedDescription];
        console.log('QuestionForm: Updated imageDescriptions state (saved):', newDescriptions);
        return newDescriptions;
      });
    } catch (error) {
      console.error('QuestionForm: Failed to save image description:', error);
      setError('Failed to save image description');
    }
  };

  const handleImageDescriptionChange = async (id: number, description: string) => {
    console.log('QuestionForm: handleImageDescriptionChange called with:', { id, description });
    
    // Find the description being updated
    const descToUpdate = imageDescriptions.find(desc => desc.id === id);
    if (!descToUpdate) return;
    
    // If it's a temporary description (no real ID yet), just update in state
    if (typeof descToUpdate.id === 'number' && descToUpdate.id! > 1000000000) {
      setImageDescriptions(prev => prev.map(desc => 
        desc.id === id 
          ? { ...desc, description }
          : desc
      ));
      return;
    }
    
    // For saved descriptions, update in database
    try {
      const updatedDescription = await imageDescriptionService.update(id, {
        description,
        usage_type: descToUpdate.usage_type
      });
      
      setImageDescriptions(prev => prev.map(desc => 
        desc.id === id ? updatedDescription : desc
      ));
      console.log('QuestionForm: Successfully updated image description in database');
    } catch (error) {
      console.error('QuestionForm: Failed to update image description:', error);
      setError('Failed to update image description');
    }
  };

  const handleImageDescriptionUsageTypeChange = async (id: number, usageType: 'question' | 'explanation') => {
    console.log('QuestionForm: handleImageDescriptionUsageTypeChange called with:', { id, usageType });
    
    // Find the description being updated
    const descToUpdate = imageDescriptions.find(desc => desc.id === id);
    if (!descToUpdate) return;
    
    // If it's a temporary description (no real ID yet), just update in state
    if (typeof descToUpdate.id === 'number' && descToUpdate.id! > 1000000000) {
      setImageDescriptions(prev => prev.map(desc => 
        desc.id === id 
          ? { ...desc, usage_type: usageType }
          : desc
      ));
      return;
    }
    
    // For saved descriptions, update in database
    try {
      const updatedDescription = await imageDescriptionService.update(id, {
        description: descToUpdate.description,
        usage_type: usageType
      });
      
      setImageDescriptions(prev => prev.map(desc => 
        desc.id === id ? updatedDescription : desc
      ));
      console.log('QuestionForm: Successfully updated image description usage type in database');
    } catch (error) {
      console.error('QuestionForm: Failed to update image description usage type:', error);
      setError('Failed to update image description usage type');
    }
  };

  const handleImageDescriptionRemove = async (id: number) => {
    console.log('QuestionForm: handleImageDescriptionRemove called for id:', id);
    
    const descToRemove = imageDescriptions.find(desc => desc.id === id);
    if (!descToRemove) return;
    
    // If it's a temporary description (no real ID yet), just remove from state
    if (typeof descToRemove.id === 'number' && descToRemove.id! > 1000000000) {
      setImageDescriptions(prev => prev.filter(desc => desc.id !== id));
      return;
    }
    
    // For saved descriptions, delete from database
    try {
      await imageDescriptionService.delete(id);
      setImageDescriptions(prev => prev.filter(desc => desc.id !== id));
      console.log('QuestionForm: Successfully removed image description from database');
    } catch (error) {
      console.error('QuestionForm: Failed to remove image description:', error);
      setError('Failed to remove image description');
    }
  };

  const handleMetadataRemove = (id: string) => {
    console.log('QuestionForm: handleMetadataRemove called for id:', id);
    setGeneratedMetadata(prev => prev.filter(item => item.id !== id));
  };

  const handleMetadataFieldChange = (id: string, field: string, value: any) => {
    console.log('QuestionForm: handleMetadataFieldChange called:', { id, field, value });
    setGeneratedMetadata(prev => prev.map(item => {
      if (item.id === id) {
        return {
          ...item,
          data: {
            ...item.data,
            [field]: value
          }
        };
      }
      return item;
    }));
  };

  const handleExamRemove = (id: string) => {
    console.log('QuestionForm: handleExamRemove called for id:', id);
    setGeneratedExams(prev => prev.filter(item => item.id !== id));
  };

  const handleExamFieldChange = (id: string, examIndex: number, field: string, value: any) => {
    console.log('QuestionForm: handleExamFieldChange called:', { id, examIndex, field, value });
    setGeneratedExams(prev => prev.map(item => {
      if (item.id === id && Array.isArray(item.data)) {
        const newData = [...item.data];
        newData[examIndex] = {
          ...newData[examIndex],
          [field]: value
        };
        return {
          ...item,
          data: newData
        };
      }
      return item;
    }));
  };

  const handleExamEntryRemove = (id: string, examIndex: number) => {
    console.log('QuestionForm: handleExamEntryRemove called:', { id, examIndex });
    setGeneratedExams(prev => prev.map(item => {
      if (item.id === id && Array.isArray(item.data)) {
        const newData = item.data.filter((_, index) => index !== examIndex);
        return {
          ...item,
          data: newData
        };
      }
      return item;
    }));
  };

  const handleExamEntryAdd = (id: string) => {
    console.log('QuestionForm: handleExamEntryAdd called for id:', id);
    setGeneratedExams(prev => prev.map(item => {
      if (item.id === id && Array.isArray(item.data)) {
        const newExam = {
          examName: '',
          subtopics: [],
          reasoning: ''
        };
        return {
          ...item,
          data: [...item.data, newExam]
        };
      }
      return item;
    }));
  };

  const handleAddMetadata = () => {
    console.log('QuestionForm: handleAddMetadata called');
    const timestamp = Date.now();
    const newMetadataId = `metadata_${timestamp}`;
    const newMetadata = {
      id: newMetadataId,
      data: {
        difficulty: '',
        category: '',
        topic: '',
        keywords: [],
        question_type: '',
        view_type: '',
        major_structures: [],
        minor_structures: [],
        modalities: []
      }
    };
    setGeneratedMetadata(prev => [...prev, newMetadata]);
    // Automatically set new items to edit mode
    setEditingMetadata(prev => ({ ...prev, [newMetadataId]: true }));
  };

  const handleAddExams = () => {
    console.log('QuestionForm: handleAddExams called');
    const timestamp = Date.now();
    const newExamId = `exams_${timestamp}`;
    const newExams = {
      id: newExamId,
      data: [{
        examName: '',
        subtopics: [],
        reasoning: ''
      }]
    };
    setGeneratedExams(prev => [...prev, newExams]);
    // Automatically set new items to edit mode
    setEditingExams(prev => ({ ...prev, [newExamId]: true }));
  };

  const toggleMetadataEdit = (id: string) => {
    setEditingMetadata(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleExamEdit = (id: string) => {
    setEditingExams(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleMetadataGenerated = (metadata: any) => {
    console.log('QuestionForm: handleMetadataGenerated called with:', metadata);
    const metadataEntry = {
      id: `metadata_${Date.now()}`,
      data: metadata
    };
    setGeneratedMetadata(prev => {
      const newMetadata = [...prev, metadataEntry];
      console.log('QuestionForm: Updated generatedMetadata state:', newMetadata);
      return newMetadata;
    });
    setShowMetadataDialog(false);
  };

  const handleApplicableExamsGenerated = (exams: any) => {
    console.log('QuestionForm: handleApplicableExamsGenerated called with:', exams);
    const examEntry = {
      id: `exams_${Date.now()}`,
      data: exams
    };
    setGeneratedExams(prev => {
      const newExams = [...prev, examEntry];
      console.log('QuestionForm: Updated generatedExams state:', newExams);
      return newExams;
    });
    setShowApplicableExamsDialog(false);
  };

  const validateForm = () => {
    if (!formData.question.trim()) {
      setError('Question text is required');
      return false;
    }
    if (!formData.correct_answer) {
      setError('Please select which answer choice is correct by clicking a radio button');
      return false;
    }
    if (!['A', 'B', 'C', 'D', 'E', 'F', 'G'].includes(formData.correct_answer)) {
      setError('Correct answer must be A, B, C, D, E, F, or G');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('QuestionForm: handleSubmit called');
    console.log('QuestionForm: Current imageDescriptions:', imageDescriptions);
    console.log('QuestionForm: Current generatedMetadata:', generatedMetadata);
    console.log('QuestionForm: Current generatedExams:', generatedExams);
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    setError(null);
    
    try {
      // Create or update the question (no need to embed descriptions in text)
      let question: Question;
      if (mode === 'edit' && initialData.id) {
        console.log('QuestionForm: Updating existing question ID:', initialData.id);
        question = await questionService.updateQuestion(initialData.id, formData);
      } else {
        // Remove question_number from formData when creating (backend will auto-generate)
        const { question_number, ...createData } = formData;
        console.log('QuestionForm: Creating new question');
        question = await questionService.createQuestion(createData);
        console.log('QuestionForm: Created question with ID:', question.id);
        
        // For new questions, save any temporary image descriptions to the database
        if (imageDescriptions.length > 0 && question.id) {
          console.log('QuestionForm: Saving temporary image descriptions to database for new question ID:', question.id);
          for (const tempDesc of imageDescriptions) {
            try {
              await imageDescriptionService.create({
                question_id: question.id,
                description: tempDesc.description,
                usage_type: tempDesc.usage_type
              });
            } catch (error) {
              console.error('QuestionForm: Failed to save image description:', error);
            }
          }
        }
      }

      // Associate selected images with the question
      if (selectedImages.length > 0 && question.id) {
        for (let i = 0; i < selectedImages.length; i++) {
          const item = selectedImages[i];
          if (item.image.id) {
            await imageService.associateWithQuestion(item.image.id, question.id, i + 1, item.usageType);
          }
        }
        
        // Fetch the updated question with images
        question = await questionService.getQuestion(question.id);
      }

      // Save generated metadata to database if it exists
      if (generatedMetadata.length > 0 && question.id) {
        console.log('QuestionForm: Saving metadata to database for question ID:', question.id);
        for (const metadataItem of generatedMetadata) {
          try {
            const savedMetadata = await questionMetadataService.createOrUpdate(question.id, metadataItem.data);
            console.log('QuestionForm: Successfully saved metadata:', savedMetadata);
          } catch (error: any) {
            console.error('QuestionForm: Failed to save metadata:', error);
            console.error('QuestionForm: Error details:', error.response?.data);
            // Show error to user but don't stop the save process
            setError(`Warning: Failed to save metadata - ${error.response?.data?.error || error.message}`);
          }
        }
      } else if (generatedMetadata.length > 0) {
        console.warn('QuestionForm: Cannot save metadata - question.id is undefined');
      }

      // Save generated exam assignments to database if they exist
      if (generatedExams.length > 0 && question.id) {
        console.log('QuestionForm: Saving exam assignments to database for question ID:', question.id);
        for (const examItem of generatedExams) {
          try {
            await examService.saveExamAssignments(question.id, examItem.data);
            console.log('QuestionForm: Successfully saved exam assignments:', examItem.data);
          } catch (error: any) {
            console.error('QuestionForm: Failed to save exam assignments:', error);
            console.error('QuestionForm: Error details:', error.response?.data);
            // Show error to user but don't stop the save process
            setError(`Warning: Failed to save exam assignments - ${error.response?.data?.error || error.message}`);
          }
        }
      } else if (generatedExams.length > 0) {
        console.warn('QuestionForm: Cannot save exam assignments - question.id is undefined');
      }

      setSuccess(`Question ${mode === 'edit' ? 'updated' : 'created'} successfully!`);
      
      // Keep metadata and exams after successful save so they persist on edit page
      // Do not clear these as they should remain visible
      console.log('QuestionForm: Final state - metadata:', generatedMetadata);
      console.log('QuestionForm: Final state - exams:', generatedExams);
      
      if (onSuccess) {
        onSuccess(question);
      } else if (mode === 'create') {
        // Reset form for new question
        setFormData({
          question_number: '',
          question: '',
          choice_a: '',
          choice_b: '',
          choice_c: '',
          choice_d: '',
          choice_e: '',
          choice_f: '',
          choice_g: '',
          correct_answer: '',
          explanation: '',
          source_folder: ''
        });
        setSelectedImages([]);
        setImageDescriptions([]);
        // Also reset metadata and exams for a new question
        setGeneratedMetadata([]);
        setGeneratedExams([]);
      }
    } catch (err) {
      setError(`Failed to ${mode} question. Please try again.`);
      console.error('Question submission error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset the form? All unsaved changes will be lost.')) {
      if (mode === 'edit') {
        setFormData({
          question_number: initialData.question_number || '',
          question: initialData.question || '',
          choice_a: initialData.choice_a || '',
          choice_b: initialData.choice_b || '',
          choice_c: initialData.choice_c || '',
          choice_d: initialData.choice_d || '',
          choice_e: initialData.choice_e || '',
          choice_f: initialData.choice_f || '',
          choice_g: initialData.choice_g || '',
          correct_answer: initialData.correct_answer || '',
          explanation: initialData.explanation || '',
          source_folder: initialData.source_folder || ''
        });
        setSelectedImages((initialData.images || []).map(img => ({ image: img, usageType: 'question' as const })));
      } else {
        setFormData({
          question_number: '',
          question: '',
          choice_a: '',
          choice_b: '',
          choice_c: '',
          choice_d: '',
          choice_e: '',
          choice_f: '',
          choice_g: '',
          correct_answer: '',
          explanation: '',
          source_folder: ''
        });
        setSelectedImages([]);
      }
      setError(null);
      setSuccess(null);
    }
  };

  return (
    <>
      <ImageUploadModal
        isOpen={showImageUpload}
        onClose={() => setShowImageUpload(false)}
        onUpload={handleImageUpload}
      />

      <ImageDescriptionModal
        isOpen={showImageDescriptionModal}
        onClose={() => {
          console.log('QuestionForm: ImageDescriptionModal onClose called');
          setShowImageDescriptionModal(false);
        }}
        onAdd={handleImageDescriptionAdd}
      />


      <MetadataGenerationDialog
        isOpen={showMetadataDialog}
        onClose={() => setShowMetadataDialog(false)}
        onAccept={handleMetadataGenerated}
        question={formData as Question}
      />

      <ApplicableExamsDialog
        isOpen={showApplicableExamsDialog}
        onClose={() => setShowApplicableExamsDialog(false)}
        onAccept={handleApplicableExamsGenerated}
        question={formData as Question}
      />

      <div className="w-full">
        <div className="w-full">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 mb-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  {mode === 'edit' ? 'Edit Question' : 'Create New Question'}
                </h2>
              </div>
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 bg-white/20 text-white rounded hover:bg-white/30 transition-all duration-200"
              >
                Reset
              </button>
            </div>
          </div>
          
          <div className="w-full">

          {error && (
            <div className="mb-8 p-6 bg-red-50 border-l-4 border-red-500 rounded-r-xl">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-red-800 font-medium">{error}</p>
                </div>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-8 p-6 bg-green-50 border-l-4 border-green-500 rounded-r-xl">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-green-800 font-medium">{success}</p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="w-full space-y-4">
            {/* Question Number - only show for edit mode (after question is created) */}
            {mode === 'edit' && formData.question_number && (
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Question Number
                </label>
                <div className="w-full px-3 py-2 text-base bg-gray-50 border border-gray-300 rounded text-gray-600">
                  {formData.question_number}
                </div>
              </div>
            )}

            {/* Question Text */}
            <div className="w-full">
              <label htmlFor="question" className="block text-sm font-medium text-gray-700 mb-1">
                Question Text *
              </label>
              <textarea
                id="question"
                value={formData.question}
                onChange={(e) => handleInputChange('question', e.target.value)}
                placeholder="Enter the complete question text here..."
                style={{width: '100%', minHeight: '120px'}}
                className="px-3 py-2 text-base border border-gray-300 rounded focus:outline-none focus:border-blue-500 resize-vertical"
                rows={5}
                required
              />
              
              {/* Question Images */}
              {selectedImages.filter(item => item.usageType === 'question').length > 0 && (
                <div className="mt-4">
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Question Images:</h5>
                  <div style={{width: '60vw', maxWidth: '60vw'}}>
                    {selectedImages.filter(item => item.usageType === 'question').map((item, index) => (
                      <div key={item.image.id} className="mb-4">
                        <div className="relative bg-white rounded border border-gray-200 overflow-hidden">
                          <div style={{width: '100%', overflow: 'hidden', backgroundColor: '#f3f4f6'}}>
                            {item.image.mime_type.startsWith('video/') ? (
                              <video
                                src={imageService.getImageUrl(item.image.filename)}
                                style={{width: '100%', height: 'auto', objectFit: 'contain'}}
                                controls
                                muted
                              />
                            ) : (
                              <img
                                src={imageService.getImageUrl(item.image.filename)}
                                alt={`Question visual ${index + 1}`}
                                style={{width: '100%', height: 'auto', objectFit: 'contain'}}
                              />
                            )}
                          </div>
                          
                          {/* Move to Explanation button */}
                          <button
                            type="button"
                            onClick={() => handleImageMove(item.image.id!, 'explanation')}
                            className="absolute bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-all duration-200 shadow"
                            style={{top: '8px', right: '40px', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}
                            title="Move to explanation"
                          >
                            <svg style={{width: '12px', height: '12px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                          </button>

                          {/* Remove button */}
                          <button
                            type="button"
                            onClick={() => handleImageRemove(item.image.id!)}
                            className="absolute bg-red-500 text-white rounded-full hover:bg-red-600 transition-all duration-200 shadow"
                            style={{top: '8px', right: '8px', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}
                            title="Remove image"
                          >
                            <svg style={{width: '12px', height: '12px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Answer Choices */}
            <div className="w-full">
              <h3 className="text-lg font-medium text-gray-700 mb-3">Answer Choices</h3>
              <p className="text-sm text-gray-600 mb-4">Enter your answer choices below and select which one is correct using the radio button.</p>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label htmlFor="choice_a" className="block text-sm font-medium text-gray-700 mb-1">
                      Answer Choice 1 *
                    </label>
                    <div className="flex gap-3">
                      <input
                        type="radio"
                        id="correct_a"
                        name="correct_answer"
                        value="A"
                        checked={formData.correct_answer === 'A'}
                        onChange={(e) => handleInputChange('correct_answer', e.target.value)}
                        className="mt-2 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                      />
                      <textarea
                        id="choice_a"
                        value={formData.choice_a}
                        onChange={(e) => handleInputChange('choice_a', e.target.value)}
                        placeholder="Enter first answer choice..."
                        style={{width: '100%', minHeight: '60px'}}
                        className="px-3 py-2 text-base border border-gray-300 rounded focus:outline-none focus:border-blue-500 resize-vertical"
                        rows={2}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-1">
                    <label htmlFor="choice_b" className="block text-sm font-medium text-gray-700 mb-1">
                      Answer Choice 2 *
                    </label>
                    <div className="flex gap-3">
                      <input
                        type="radio"
                        id="correct_b"
                        name="correct_answer"
                        value="B"
                        checked={formData.correct_answer === 'B'}
                        onChange={(e) => handleInputChange('correct_answer', e.target.value)}
                        className="mt-2 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                      />
                      <textarea
                        id="choice_b"
                        value={formData.choice_b}
                        onChange={(e) => handleInputChange('choice_b', e.target.value)}
                        placeholder="Enter second answer choice..."
                        style={{width: '100%', minHeight: '60px'}}
                        className="px-3 py-2 text-base border border-gray-300 rounded focus:outline-none focus:border-blue-500 resize-vertical"
                        rows={2}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-1">
                    <label htmlFor="choice_c" className="block text-sm font-medium text-gray-700 mb-1">
                      Answer Choice 3 *
                    </label>
                    <div className="flex gap-3">
                      <input
                        type="radio"
                        id="correct_c"
                        name="correct_answer"
                        value="C"
                        checked={formData.correct_answer === 'C'}
                        onChange={(e) => handleInputChange('correct_answer', e.target.value)}
                        className="mt-2 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                      />
                      <textarea
                        id="choice_c"
                        value={formData.choice_c}
                        onChange={(e) => handleInputChange('choice_c', e.target.value)}
                        placeholder="Enter third answer choice..."
                        style={{width: '100%', minHeight: '60px'}}
                        className="px-3 py-2 text-base border border-gray-300 rounded focus:outline-none focus:border-blue-500 resize-vertical"
                        rows={2}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-1">
                    <label htmlFor="choice_d" className="block text-sm font-medium text-gray-700 mb-1">
                      Answer Choice 4 *
                    </label>
                    <div className="flex gap-3">
                      <input
                        type="radio"
                        id="correct_d"
                        name="correct_answer"
                        value="D"
                        checked={formData.correct_answer === 'D'}
                        onChange={(e) => handleInputChange('correct_answer', e.target.value)}
                        className="mt-2 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                      />
                      <textarea
                        id="choice_d"
                        value={formData.choice_d}
                        onChange={(e) => handleInputChange('choice_d', e.target.value)}
                        placeholder="Enter fourth answer choice..."
                        style={{width: '100%', minHeight: '60px'}}
                        className="px-3 py-2 text-base border border-gray-300 rounded focus:outline-none focus:border-blue-500 resize-vertical"
                        rows={2}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-1">
                    <label htmlFor="choice_e" className="block text-sm font-medium text-gray-700 mb-1">
                      Answer Choice 5 (Optional)
                    </label>
                    <div className="flex gap-3">
                      <input
                        type="radio"
                        id="correct_e"
                        name="correct_answer"
                        value="E"
                        checked={formData.correct_answer === 'E'}
                        onChange={(e) => handleInputChange('correct_answer', e.target.value)}
                        className="mt-2 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                      />
                      <textarea
                        id="choice_e"
                        value={formData.choice_e}
                        onChange={(e) => handleInputChange('choice_e', e.target.value)}
                        placeholder="Enter fifth answer choice (if applicable)..."
                        style={{width: '100%', minHeight: '60px'}}
                        className="px-3 py-2 text-base border border-gray-300 rounded focus:outline-none focus:border-blue-500 resize-vertical"
                        rows={2}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-1">
                    <label htmlFor="choice_f" className="block text-sm font-medium text-gray-700 mb-1">
                      Answer Choice 6 (Optional)
                    </label>
                    <div className="flex gap-3">
                      <input
                        type="radio"
                        id="correct_f"
                        name="correct_answer"
                        value="F"
                        checked={formData.correct_answer === 'F'}
                        onChange={(e) => handleInputChange('correct_answer', e.target.value)}
                        className="mt-2 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                      />
                      <textarea
                        id="choice_f"
                        value={formData.choice_f}
                        onChange={(e) => handleInputChange('choice_f', e.target.value)}
                        placeholder="Enter sixth answer choice (if applicable)..."
                        style={{width: '100%', minHeight: '60px'}}
                        className="px-3 py-2 text-base border border-gray-300 rounded focus:outline-none focus:border-blue-500 resize-vertical"
                        rows={2}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-1">
                    <label htmlFor="choice_g" className="block text-sm font-medium text-gray-700 mb-1">
                      Answer Choice 7 (Optional)
                    </label>
                    <div className="flex gap-3">
                      <input
                        type="radio"
                        id="correct_g"
                        name="correct_answer"
                        value="G"
                        checked={formData.correct_answer === 'G'}
                        onChange={(e) => handleInputChange('correct_answer', e.target.value)}
                        className="mt-2 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                      />
                      <textarea
                        id="choice_g"
                        value={formData.choice_g}
                        onChange={(e) => handleInputChange('choice_g', e.target.value)}
                        placeholder="Enter seventh answer choice (if applicable)..."
                        style={{width: '100%', minHeight: '60px'}}
                        className="px-3 py-2 text-base border border-gray-300 rounded focus:outline-none focus:border-blue-500 resize-vertical"
                        rows={2}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Explanation */}
            <div className="w-full">
              <label htmlFor="explanation" className="block text-sm font-medium text-gray-700 mb-1">
                Explanation
              </label>
              <textarea
                id="explanation"
                value={formData.explanation}
                onChange={(e) => handleInputChange('explanation', e.target.value)}
                placeholder="Provide a comprehensive explanation..."
                style={{width: '100%', minHeight: '168px'}}
                className="px-3 py-2 text-base border border-gray-300 rounded focus:outline-none focus:border-blue-500 resize-vertical"
                rows={7}
              />
              
              {/* Explanation Images */}
              {selectedImages.filter(item => item.usageType === 'explanation').length > 0 && (
                <div className="mt-4">
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Explanation Images:</h5>
                  <div style={{width: '60vw', maxWidth: '60vw'}}>
                    {selectedImages.filter(item => item.usageType === 'explanation').map((item, index) => (
                      <div key={item.image.id} className="mb-4">
                        <div className="relative bg-white rounded border border-gray-200 overflow-hidden">
                          <div style={{width: '100%', overflow: 'hidden', backgroundColor: '#f3f4f6'}}>
                            {item.image.mime_type.startsWith('video/') ? (
                              <video
                                src={imageService.getImageUrl(item.image.filename)}
                                style={{width: '100%', height: 'auto', objectFit: 'contain'}}
                                controls
                                muted
                              />
                            ) : (
                              <img
                                src={imageService.getImageUrl(item.image.filename)}
                                alt={`Explanation visual ${index + 1}`}
                                style={{width: '100%', height: 'auto', objectFit: 'contain'}}
                              />
                            )}
                          </div>
                          
                          {/* Move to Question button */}
                          <button
                            type="button"
                            onClick={() => handleImageMove(item.image.id!, 'question')}
                            className="absolute bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-all duration-200 shadow"
                            style={{top: '8px', right: '40px', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}
                            title="Move to question"
                          >
                            <svg style={{width: '12px', height: '12px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                            </svg>
                          </button>

                          {/* Remove button */}
                          <button
                            type="button"
                            onClick={() => handleImageRemove(item.image.id!)}
                            className="absolute bg-red-500 text-white rounded-full hover:bg-red-600 transition-all duration-200 shadow"
                            style={{top: '8px', right: '8px', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}
                            title="Remove image"
                          >
                            <svg style={{width: '12px', height: '12px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>


            {/* Associated Images */}
            <div className="bg-indigo-50 rounded-xl p-6 border-l-4 border-indigo-500">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-800">
                    Associated Images
                    <span className="ml-3 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800">
                      {selectedImages.length} images
                    </span>
                    <span className="ml-2 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                      {imageDescriptions.length} descriptions
                    </span>
                  </h3>
                  <p className="text-gray-600 mt-1">Add relevant TOE images and cine loops to support the question</p>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowImageUpload(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-all duration-200"
                  >
                    <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    Add Images
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => {
                      console.log('QuestionForm: Add Description button clicked');
                      setShowImageDescriptionModal(true);
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-all duration-200"
                  >
                    <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Add Description
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setShowMetadataDialog(true)}
                    className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-all duration-200"
                  >
                    <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    Add Metadata
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowApplicableExamsDialog(true)}
                    className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition-all duration-200"
                  >
                    <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Add Exams
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setShowImageManager(!showImageManager)}
                    className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-all duration-200"
                  >
                    <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {showImageManager ? 'Hide Library' : 'Browse Library'}
                  </button>
                </div>
              </div>

              {/* Image Manager */}
              {showImageManager && (
                <div className="bg-white border-2 border-indigo-200 rounded-xl p-6 shadow-inner">
                  <ImageManager
                    mode="selection"
                    onImageSelect={handleImageSelect}
                    onImageRemove={handleImageRemove}
                    selectedImages={selectedImages.map(item => item.image.id!)}
                  />
                </div>
              )}

              {/* Image Descriptions */}
              {imageDescriptions.length > 0 && (
                <div className="mt-6">
                  <div className="mb-4">
                    <h4 className="text-lg font-semibold text-gray-800">Image Descriptions (Placeholders)</h4>
                  </div>
                  <div className="space-y-4">
                    {imageDescriptions.map((desc) => (
                      <div key={desc.id} className="border border-gray-300 rounded-lg p-4">
                        <div className="mb-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <label className="text-sm font-medium text-gray-700">Image Type:</label>
                              <select
                                value={desc.usage_type}
                                onChange={(e) => handleImageDescriptionUsageTypeChange(desc.id!, e.target.value as 'question' | 'explanation')}
                                className="text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              >
                                <option value="question">Question Image</option>
                                <option value="explanation">Explanation Image</option>
                              </select>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleImageDescriptionRemove(desc.id!)}
                              className="text-red-600 hover:text-red-800 font-medium text-sm"
                            >
                              Remove
                            </button>
                          </div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Image Description
                          </label>
                          <textarea
                            value={desc.description}
                            onChange={(e) => handleImageDescriptionChange(desc.id!, e.target.value)}
                            placeholder="Describe the image that should be added here..."
                            style={{width: '100%', minHeight: '80px'}}
                            className="px-3 py-2 text-base border border-gray-300 rounded focus:outline-none focus:border-blue-500 resize-vertical"
                            rows={3}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Generated Metadata */}
              {generatedMetadata.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4">Generated Metadata</h4>
                  <div className="space-y-3">
                    {generatedMetadata.map((item) => (
                      <div key={item.id} className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-3">
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                AI Metadata
                              </span>
                              <button
                                type="button"
                                onClick={() => toggleMetadataEdit(item.id)}
                                className="px-2 py-1 text-xs bg-purple-200 text-purple-800 rounded hover:bg-purple-300 transition-colors"
                              >
                                {editingMetadata[item.id] ? 'Save' : 'Edit'}
                              </button>
                            </div>
                            {editingMetadata[item.id] ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                              <div>
                                <label className="font-medium text-gray-700">Difficulty:</label>
                                <select
                                  value={item.data.difficulty || ''}
                                  onChange={(e) => handleMetadataFieldChange(item.id, 'difficulty', e.target.value)}
                                  className="w-full mt-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                                >
                                  <option value="">Select difficulty</option>
                                  <option value="basic">Basic</option>
                                  <option value="intermediate">Intermediate</option>
                                  <option value="advanced">Advanced</option>
                                </select>
                              </div>
                              <div>
                                <label className="font-medium text-gray-700">Category:</label>
                                <input
                                  type="text"
                                  value={item.data.category || ''}
                                  onChange={(e) => handleMetadataFieldChange(item.id, 'category', e.target.value)}
                                  className="w-full mt-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                                  placeholder="e.g., cardiology"
                                />
                              </div>
                              <div>
                                <label className="font-medium text-gray-700">Topic:</label>
                                <input
                                  type="text"
                                  value={item.data.topic || ''}
                                  onChange={(e) => handleMetadataFieldChange(item.id, 'topic', e.target.value)}
                                  className="w-full mt-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                                  placeholder="e.g., hemodynamics"
                                />
                              </div>
                              <div>
                                <label className="font-medium text-gray-700">Question Type:</label>
                                <select
                                  value={item.data.question_type || ''}
                                  onChange={(e) => handleMetadataFieldChange(item.id, 'question_type', e.target.value)}
                                  className="w-full mt-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                                >
                                  <option value="">Select type</option>
                                  <option value="multiple_choice">Multiple Choice</option>
                                  <option value="true_false">True/False</option>
                                  <option value="short_answer">Short Answer</option>
                                  <option value="case_study">Case Study</option>
                                </select>
                              </div>
                              <div>
                                <label className="font-medium text-gray-700">View Type:</label>
                                <input
                                  type="text"
                                  value={item.data.view_type || ''}
                                  onChange={(e) => handleMetadataFieldChange(item.id, 'view_type', e.target.value)}
                                  className="w-full mt-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                                  placeholder="e.g., hemodynamic_assessment"
                                />
                              </div>
                              <div className="col-span-full">
                                <label className="font-medium text-gray-700">Keywords (comma-separated):</label>
                                <input
                                  type="text"
                                  value={item.data.keywords ? item.data.keywords.join(', ') : ''}
                                  onChange={(e) => handleMetadataFieldChange(item.id, 'keywords', e.target.value.split(',').map(k => k.trim()).filter(k => k))}
                                  className="w-full mt-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                                  placeholder="e.g., echocardiography, restrictive, pericardial"
                                />
                              </div>
                              <div className="col-span-full">
                                <label className="font-medium text-gray-700">Major Structures (comma-separated):</label>
                                <input
                                  type="text"
                                  value={item.data.major_structures ? item.data.major_structures.join(', ') : ''}
                                  onChange={(e) => handleMetadataFieldChange(item.id, 'major_structures', e.target.value.split(',').map(s => s.trim()).filter(s => s))}
                                  className="w-full mt-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                                  placeholder="e.g., heart, pericardium"
                                />
                              </div>
                              <div className="col-span-full">
                                <label className="font-medium text-gray-700">Minor Structures (comma-separated):</label>
                                <input
                                  type="text"
                                  value={item.data.minor_structures ? item.data.minor_structures.join(', ') : ''}
                                  onChange={(e) => handleMetadataFieldChange(item.id, 'minor_structures', e.target.value.split(',').map(s => s.trim()).filter(s => s))}
                                  className="w-full mt-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                                  placeholder="e.g., myocardium"
                                />
                              </div>
                              <div className="col-span-full">
                                <label className="font-medium text-gray-700">Modalities (comma-separated):</label>
                                <input
                                  type="text"
                                  value={item.data.modalities ? item.data.modalities.join(', ') : ''}
                                  onChange={(e) => handleMetadataFieldChange(item.id, 'modalities', e.target.value.split(',').map(m => m.trim()).filter(m => m))}
                                  className="w-full mt-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                                  placeholder="e.g., echocardiography, hemodynamic_measurement"
                                />
                              </div>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                {item.data.difficulty && (
                                  <div><span className="font-medium text-gray-700">Difficulty:</span> <span className="text-gray-600">{item.data.difficulty}</span></div>
                                )}
                                {item.data.category && (
                                  <div><span className="font-medium text-gray-700">Category:</span> <span className="text-gray-600">{item.data.category}</span></div>
                                )}
                                {item.data.topic && (
                                  <div><span className="font-medium text-gray-700">Topic:</span> <span className="text-gray-600">{item.data.topic}</span></div>
                                )}
                                {item.data.question_type && (
                                  <div><span className="font-medium text-gray-700">Question Type:</span> <span className="text-gray-600">{item.data.question_type}</span></div>
                                )}
                                {item.data.view_type && (
                                  <div><span className="font-medium text-gray-700">View Type:</span> <span className="text-gray-600">{item.data.view_type}</span></div>
                                )}
                                {item.data.keywords && item.data.keywords.length > 0 && (
                                  <div className="col-span-full"><span className="font-medium text-gray-700">Keywords:</span> <span className="text-gray-600">{item.data.keywords.join(', ')}</span></div>
                                )}
                                {item.data.major_structures && item.data.major_structures.length > 0 && (
                                  <div className="col-span-full"><span className="font-medium text-gray-700">Major Structures:</span> <span className="text-gray-600">{item.data.major_structures.join(', ')}</span></div>
                                )}
                                {item.data.minor_structures && item.data.minor_structures.length > 0 && (
                                  <div className="col-span-full"><span className="font-medium text-gray-700">Minor Structures:</span> <span className="text-gray-600">{item.data.minor_structures.join(', ')}</span></div>
                                )}
                                {item.data.modalities && item.data.modalities.length > 0 && (
                                  <div className="col-span-full"><span className="font-medium text-gray-700">Modalities:</span> <span className="text-gray-600">{item.data.modalities.join(', ')}</span></div>
                                )}
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleMetadataRemove(item.id)}
                            className="ml-4 text-red-600 hover:text-red-800 font-medium text-sm"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add Metadata Button */}
              <div className="mt-6">
                <button
                  type="button"
                  onClick={handleAddMetadata}
                  className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                >
                  + Add Metadata
                </button>
              </div>

              {/* Generated Exams */}
              {generatedExams.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4">Generated Exam Associations</h4>
                  <div className="space-y-3">
                    {generatedExams.map((item) => (
                      <div key={item.id} className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-3">
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                Exam Associations
                              </span>
                              <button
                                type="button"
                                onClick={() => toggleExamEdit(item.id)}
                                className="px-2 py-1 text-xs bg-orange-200 text-orange-800 rounded hover:bg-orange-300 transition-colors"
                              >
                                {editingExams[item.id] ? 'Save' : 'Edit'}
                              </button>
                            </div>
                            {editingExams[item.id] ? (
                              <div className="space-y-4 text-sm">
                                {Array.isArray(item.data) ? item.data.map((exam: any, examIndex: number) => (
                                <div key={examIndex} className="border-l-3 border-orange-300 pl-3 space-y-2">
                                  <div>
                                    <label className="font-medium text-gray-700">Exam Name:</label>
                                    <select
                                      value={exam.examName || ''}
                                      onChange={(e) => handleExamFieldChange(item.id, examIndex, 'examName', e.target.value)}
                                      className="w-full mt-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                                    >
                                      <option value="">Select exam</option>
                                      <option value="PTEeXAM">PTEeXAM</option>
                                      <option value="EACTVI">EACTVI</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="font-medium text-gray-700">Subtopics (comma-separated):</label>
                                    <textarea
                                      value={exam.subtopics ? exam.subtopics.map((st: any) => typeof st === 'string' ? st : st.name).join(', ') : ''}
                                      onChange={(e) => handleExamFieldChange(item.id, examIndex, 'subtopics', e.target.value.split(',').map(s => s.trim()).filter(s => s).map(s => ({ name: s, section: 'Unknown' })))}
                                      className="w-full mt-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500 resize-vertical"
                                      rows={2}
                                      placeholder="e.g., Diastolic Function, Chamber Assessment"
                                    />
                                  </div>
                                  <div>
                                    <label className="font-medium text-gray-700">Reasoning:</label>
                                    <textarea
                                      value={exam.reasoning || ''}
                                      onChange={(e) => handleExamFieldChange(item.id, examIndex, 'reasoning', e.target.value)}
                                      className="w-full mt-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500 resize-vertical"
                                      rows={2}
                                      placeholder="Brief explanation of why this question fits these subtopics"
                                    />
                                  </div>
                                  {item.data.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => handleExamEntryRemove(item.id, examIndex)}
                                      className="text-red-600 hover:text-red-800 font-medium text-xs"
                                    >
                                      Remove Exam
                                    </button>
                                  )}
                                </div>
                              )) : (
                                <div className="text-gray-600">No exam data available</div>
                              )}
                              <button
                                type="button"
                                onClick={() => handleExamEntryAdd(item.id)}
                                className="text-orange-600 hover:text-orange-800 font-medium text-sm"
                              >
                                + Add Another Exam
                              </button>
                              </div>
                            ) : (
                              <div className="space-y-3 text-sm">
                                {Array.isArray(item.data) ? item.data.map((exam: any, examIndex: number) => (
                                  <div key={examIndex} className="border-l-3 border-orange-300 pl-3">
                                    <div className="font-medium text-gray-800 mb-1">{exam.examName}</div>
                                    {exam.subtopics && exam.subtopics.length > 0 && (
                                      <div className="mb-1">
                                        <span className="font-medium text-gray-700">Subtopics:</span>
                                        <ul className="list-disc list-inside ml-2 text-gray-600">
                                          {exam.subtopics.map((subtopic: any, subIndex: number) => (
                                            <li key={subIndex}>
                                              {typeof subtopic === 'string' ? subtopic : (
                                                <span>
                                                  <span className="font-medium text-blue-600">{subtopic.section}</span> {subtopic.name}
                                                </span>
                                              )}
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                    {exam.reasoning && (
                                      <div className="text-gray-600 text-xs italic">{exam.reasoning}</div>
                                    )}
                                  </div>
                                )) : (
                                  <div className="text-gray-600">No exam data available</div>
                                )}
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleExamRemove(item.id)}
                            className="ml-4 text-red-600 hover:text-red-800 font-medium text-sm"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add Exams Button */}
              <div className="mt-6">
                <button
                  type="button"
                  onClick={handleAddExams}
                  className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors"
                >
                  + Add Exam Associations
                </button>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="w-full mt-6">
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-all duration-200"
                  disabled={isSubmitting}
                >
                  Reset
                </button>
                
                <button
                  type="submit"
                  disabled={isSubmitting || !formData.question.trim() || !formData.correct_answer}
                  className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {isSubmitting ? (
                    mode === 'edit' ? 'Updating...' : 'Creating...'
                  ) : (
                    mode === 'edit' ? 'Update Question' : 'Create Question'
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
      </div>
    </>
  );
};

export default QuestionForm;