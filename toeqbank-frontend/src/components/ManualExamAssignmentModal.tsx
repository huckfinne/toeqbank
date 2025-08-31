import React, { useState } from 'react';
import { SubtopicWithSection } from '../services/api';

interface ApplicableExam {
  examName: string;
  subtopics: SubtopicWithSection[];
  reasoning?: string;
}

interface ManualExamAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (exams: ApplicableExam[]) => void;
  initialExams?: ApplicableExam[];
}

// Available exam topics with section numbers
const EXAM_TOPICS = {
  "PTEeXAM": {
    "1. Basic TEE": {
      "1.1": "TEE Probe Insertion and Safety",
      "1.2": "Basic TEE Views and Anatomy",
      "1.3": "Standard TEE Examination",
      "1.4": "TEE Equipment and Technology"
    },
    "2. Cardiac Anatomy and Physiology": {
      "2.1": "Chamber Assessment",
      "2.2": "Valvular Anatomy",
      "2.3": "Great Vessel Assessment",
      "2.4": "Congenital Heart Disease"
    },
    "3. Valvular Disease": {
      "3.1": "Mitral Valve Disease",
      "3.2": "Aortic Valve Disease",
      "3.3": "Tricuspid Valve Disease",
      "3.4": "Pulmonary Valve Disease",
      "3.5": "Prosthetic Valves"
    },
    "4. Hemodynamic Assessment": {
      "4.1": "Doppler Principles",
      "4.2": "Pressure Gradients",
      "4.3": "Cardiac Output Assessment",
      "4.4": "Diastolic Function"
    },
    "5. TEE in Cardiac Surgery": {
      "5.1": "Intraoperative TEE",
      "5.2": "Post-surgical Assessment",
      "5.3": "Surgical Planning"
    },
    "6. Advanced TEE Applications": {
      "6.1": "3D TEE",
      "6.2": "Strain Imaging",
      "6.3": "Contrast Enhancement",
      "6.4": "Interventional Guidance"
    }
  },
  "EACTVI": {
    "1. Basic Echocardiography": {
      "1.1": "Ultrasound Physics",
      "1.2": "Image Optimization",
      "1.3": "Standard Views",
      "1.4": "Doppler Techniques"
    },
    "2. Left Heart Assessment": {
      "2.1": "LV Function and Geometry",
      "2.2": "LA Assessment",
      "2.3": "Mitral Valve Evaluation",
      "2.4": "Aortic Valve Assessment"
    },
    "3. Right Heart Assessment": {
      "3.1": "RV Function Assessment",
      "3.2": "RA Evaluation",
      "3.3": "Tricuspid Valve Assessment",
      "3.4": "Pulmonary Assessment"
    },
    "4. Hemodynamics and Flow": {
      "4.1": "Pressure Measurements",
      "4.2": "Flow Quantification",
      "4.3": "Shunt Assessment",
      "4.4": "Valve Stenosis/Regurgitation"
    },
    "5. Advanced Techniques": {
      "5.1": "Tissue Doppler",
      "5.2": "Strain Echocardiography",
      "5.3": "3D Echocardiography",
      "5.4": "Contrast Echocardiography"
    },
    "6. Clinical Applications": {
      "6.1": "Heart Failure Assessment",
      "6.2": "Ischemic Heart Disease",
      "6.3": "Cardioembolic Source",
      "6.4": "Critical Care Echocardiography"
    }
  }
};

const ManualExamAssignmentModal: React.FC<ManualExamAssignmentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialExams = []
}) => {
  const [selectedExams, setSelectedExams] = useState<ApplicableExam[]>(
    initialExams.length > 0 ? [...initialExams] : []
  );

  React.useEffect(() => {
    if (isOpen) {
      setSelectedExams(initialExams.length > 0 ? [...initialExams] : []);
    }
  }, [isOpen, initialExams]);

  const toggleSubtopic = (examName: string, subtopic: string, section: string) => {
    setSelectedExams(prevExams => {
      const existingExamIndex = prevExams.findIndex(exam => exam.examName === examName);
      
      if (existingExamIndex >= 0) {
        // Exam exists, toggle subtopic
        const updatedExams = [...prevExams];
        const exam = updatedExams[existingExamIndex];
        
        const subtopicExists = exam.subtopics.some(st => st.name === subtopic);
        
        if (subtopicExists) {
          // Remove subtopic
          exam.subtopics = exam.subtopics.filter(st => st.name !== subtopic);
          // Remove exam if no subtopics left
          if (exam.subtopics.length === 0) {
            updatedExams.splice(existingExamIndex, 1);
          }
        } else {
          // Add subtopic
          exam.subtopics.push({ name: subtopic, section });
        }
        
        return updatedExams;
      } else {
        // Add new exam with this subtopic
        return [...prevExams, {
          examName,
          subtopics: [{ name: subtopic, section }],
          reasoning: 'Manually assigned'
        }];
      }
    });
  };

  const isSubtopicSelected = (examName: string, subtopic: string): boolean => {
    const exam = selectedExams.find(exam => exam.examName === examName);
    return exam ? exam.subtopics.some(st => st.name === subtopic) : false;
  };

  const handleSave = () => {
    onSave(selectedExams);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center p-4" 
      style={{
        zIndex: 99999, 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="rounded-2xl shadow-2xl max-w-4xl w-full mx-4 border-4 border-gray-300 relative"
        style={{backgroundColor: 'white', maxHeight: '80vh', overflow: 'auto', boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.1)'}}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-orange-600 to-red-600 px-8 py-6 rounded-t-2xl">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-2xl font-bold text-white">📋 Manual Exam Assignment</h3>
              <p className="text-orange-100 mt-1">Select applicable exam subtopics manually</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-white hover:text-red-200 bg-red-500/80 hover:bg-red-600 rounded-full p-3 transition-all duration-200 shadow-lg hover:shadow-xl"
              title="Close Dialog"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        <div className="p-8">
          <div className="grid md:grid-cols-2 gap-8">
            {Object.entries(EXAM_TOPICS).map(([examName, categories]) => (
              <div key={examName} className="border border-gray-200 rounded-lg p-6">
                <h4 className="text-xl font-semibold text-gray-900 mb-4">{examName}</h4>
                
                {Object.entries(categories).map(([categoryName, subtopics]) => (
                  <div key={categoryName} className="mb-6">
                    <h5 className="font-medium text-gray-800 mb-3">{categoryName}</h5>
                    <div className="space-y-2">
                      {Object.entries(subtopics).map(([section, subtopicName]) => (
                        <label key={section} className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isSubtopicSelected(examName, subtopicName as string)}
                            onChange={() => toggleSubtopic(examName, subtopicName as string, section)}
                            className="rounded border-gray-300 text-orange-600 focus:ring-orange-500 focus:border-orange-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">
                            <span className="font-medium text-blue-600">{section}</span> {subtopicName as string}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {selectedExams.length > 0 && (
            <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-medium text-green-800 mb-2">Selected Assignments:</h4>
              <div className="space-y-2">
                {selectedExams.map((exam, index) => (
                  <div key={index} className="text-sm">
                    <span className="font-medium text-green-800">{exam.examName}:</span>
                    <span className="text-green-700"> {exam.subtopics.map(st => 
                      `${st.section} ${st.name}`
                    ).join(', ')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="absolute bottom-0 right-0 left-0 flex justify-end items-center gap-3 px-8 py-6 border-t border-gray-100" style={{backgroundColor: 'white', borderRadius: '0 0 1rem 1rem'}}>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-all duration-200 font-semibold"
          >
            Save Assignments ({selectedExams.length})
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManualExamAssignmentModal;