import React, { useState } from 'react';

export interface ExamSelection {
  examCategory: string;
  examType: string;
}

interface ExamSelectorProps {
  value: ExamSelection;
  onChange: (selection: ExamSelection) => void;
  error?: string;
}

const EXAM_CATEGORIES = {
  ECHOCARDIOGRAPHY: 'echocardiography',
  USMLE: 'usmle'
} as const;

const EXAM_TYPES = {
  EACVI_TOE: 'eacvi_toe',
  ADVANCE_PTEEXAM: 'advance_pteexam',
  TTE: 'tte',
  STEP_1: 'step1',
  STEP_2: 'step2',
  STEP_3: 'step3'
} as const;

const EXAM_CATEGORY_TYPES = {
  [EXAM_CATEGORIES.ECHOCARDIOGRAPHY]: [
    { value: EXAM_TYPES.EACVI_TOE, label: 'EACVI TOE (Transesophageal Echocardiography)' },
    { value: EXAM_TYPES.ADVANCE_PTEEXAM, label: 'Advance PTEeXAM' }
  ],
  [EXAM_CATEGORIES.USMLE]: [
    { value: EXAM_TYPES.STEP_1, label: 'Step 1' },
    { value: EXAM_TYPES.STEP_2, label: 'Step 2' },
    { value: EXAM_TYPES.STEP_3, label: 'Step 3' }
  ]
} as const;

const ExamSelector: React.FC<ExamSelectorProps> = ({ value, onChange, error }) => {
  const [selectedCategory, setSelectedCategory] = useState(value.examCategory);

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    // Reset exam type when category changes
    const availableTypes = EXAM_CATEGORY_TYPES[category as keyof typeof EXAM_CATEGORY_TYPES];
    const defaultType = availableTypes?.[0]?.value || '';
    onChange({
      examCategory: category,
      examType: defaultType
    });
  };

  const handleTypeChange = (type: string) => {
    onChange({
      examCategory: selectedCategory,
      examType: type
    });
  };

  const availableTypes = selectedCategory ? 
    EXAM_CATEGORY_TYPES[selectedCategory as keyof typeof EXAM_CATEGORY_TYPES] : [];

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Select Your Exam Category
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            className={`relative border-2 rounded-lg p-6 cursor-pointer transition-all ${
              selectedCategory === EXAM_CATEGORIES.ECHOCARDIOGRAPHY
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onClick={() => handleCategoryChange(EXAM_CATEGORIES.ECHOCARDIOGRAPHY)}
          >
            <div className="flex items-center">
              <input
                type="radio"
                name="examCategory"
                value={EXAM_CATEGORIES.ECHOCARDIOGRAPHY}
                checked={selectedCategory === EXAM_CATEGORIES.ECHOCARDIOGRAPHY}
                onChange={() => handleCategoryChange(EXAM_CATEGORIES.ECHOCARDIOGRAPHY)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <div className="ml-3">
                <div className="text-lg font-medium text-gray-900">
                  🫀 Echocardiography
                </div>
                <div className="text-sm text-gray-500">
                  Cardiac imaging and ultrasound exams
                </div>
              </div>
            </div>
          </div>

          <div
            className={`relative border-2 rounded-lg p-6 cursor-pointer transition-all ${
              selectedCategory === EXAM_CATEGORIES.USMLE
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onClick={() => handleCategoryChange(EXAM_CATEGORIES.USMLE)}
          >
            <div className="flex items-center">
              <input
                type="radio"
                name="examCategory"
                value={EXAM_CATEGORIES.USMLE}
                checked={selectedCategory === EXAM_CATEGORIES.USMLE}
                onChange={() => handleCategoryChange(EXAM_CATEGORIES.USMLE)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <div className="ml-3">
                <div className="text-lg font-medium text-gray-900">
                  🩺 USMLE
                </div>
                <div className="text-sm text-gray-500">
                  United States Medical Licensing Examination
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedCategory && availableTypes.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Select Your Specific Exam
          </label>
          <div className="grid grid-cols-1 gap-3">
            {availableTypes.map((type) => (
              <div
                key={type.value}
                className={`relative border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  value.examType === type.value
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onClick={() => handleTypeChange(type.value)}
              >
                <div className="flex items-center">
                  <input
                    type="radio"
                    name="examType"
                    value={type.value}
                    checked={value.examType === type.value}
                    onChange={() => handleTypeChange(type.value)}
                    className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300"
                  />
                  <label className="ml-3 text-sm font-medium text-gray-900 cursor-pointer">
                    {type.label}
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="text-red-600 text-sm">
          {error}
        </div>
      )}
    </div>
  );
};

export default ExamSelector;