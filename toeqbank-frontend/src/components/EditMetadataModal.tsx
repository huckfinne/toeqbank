import React, { useState } from 'react';
import { GeneratedMetadata } from '../services/claudeApi';

interface EditMetadataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (metadata: GeneratedMetadata) => void;
  metadata: GeneratedMetadata;
}

const EditMetadataModal: React.FC<EditMetadataModalProps> = ({
  isOpen,
  onClose,
  onSave,
  metadata
}) => {
  const [editableMetadata, setEditableMetadata] = useState<GeneratedMetadata>({ ...metadata });
  const [newKeyword, setNewKeyword] = useState('');
  const [newMajorStructure, setNewMajorStructure] = useState('');
  const [newMinorStructure, setNewMinorStructure] = useState('');
  const [newModality, setNewModality] = useState('');

  React.useEffect(() => {
    if (isOpen) {
      setEditableMetadata({ ...metadata });
      setNewKeyword('');
      setNewMajorStructure('');
      setNewMinorStructure('');
      setNewModality('');
    }
  }, [isOpen, metadata]);

  const handleSave = () => {
    onSave(editableMetadata);
    onClose();
  };

  const addKeyword = () => {
    if (newKeyword.trim()) {
      setEditableMetadata({
        ...editableMetadata,
        keywords: [...editableMetadata.keywords, newKeyword.trim()]
      });
      setNewKeyword('');
    }
  };

  const removeKeyword = (index: number) => {
    setEditableMetadata({
      ...editableMetadata,
      keywords: editableMetadata.keywords.filter((_, i) => i !== index)
    });
  };

  const addMajorStructure = () => {
    if (newMajorStructure.trim()) {
      setEditableMetadata({
        ...editableMetadata,
        majorStructures: [...editableMetadata.majorStructures, newMajorStructure.trim()]
      });
      setNewMajorStructure('');
    }
  };

  const removeMajorStructure = (index: number) => {
    setEditableMetadata({
      ...editableMetadata,
      majorStructures: editableMetadata.majorStructures.filter((_, i) => i !== index)
    });
  };

  const addMinorStructure = () => {
    if (newMinorStructure.trim()) {
      setEditableMetadata({
        ...editableMetadata,
        minorStructures: [...editableMetadata.minorStructures, newMinorStructure.trim()]
      });
      setNewMinorStructure('');
    }
  };

  const removeMinorStructure = (index: number) => {
    setEditableMetadata({
      ...editableMetadata,
      minorStructures: editableMetadata.minorStructures.filter((_, i) => i !== index)
    });
  };

  const addModality = () => {
    if (newModality.trim()) {
      setEditableMetadata({
        ...editableMetadata,
        modalities: [...editableMetadata.modalities, newModality.trim()]
      });
      setNewModality('');
    }
  };

  const removeModality = (index: number) => {
    setEditableMetadata({
      ...editableMetadata,
      modalities: editableMetadata.modalities.filter((_, i) => i !== index)
    });
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
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-8 py-6 rounded-t-2xl">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-2xl font-bold text-white">📝 Edit Metadata</h3>
              <p className="text-green-100 mt-1">Manually edit question metadata and tags</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-white hover:text-red-300 bg-red-500/80 hover:bg-red-600 rounded-full p-3 transition-all duration-200 shadow-lg hover:shadow-xl"
              title="Close Dialog"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        <div className="p-8">
          <div className="space-y-6">
            {/* Basic Fields */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty Level</label>
                <select
                  value={editableMetadata.difficulty}
                  onChange={(e) => setEditableMetadata({...editableMetadata, difficulty: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={editableMetadata.category}
                  onChange={(e) => setEditableMetadata({...editableMetadata, category: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="Transthoracic Echocardiography (TTE)">Transthoracic Echocardiography (TTE)</option>
                  <option value="Transesophageal Echocardiography (TEE/TOE)">Transesophageal Echocardiography (TEE/TOE)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Topic</label>
                <input
                  type="text"
                  value={editableMetadata.topic}
                  onChange={(e) => setEditableMetadata({...editableMetadata, topic: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Question Type</label>
                <select
                  value={editableMetadata.questionType}
                  onChange={(e) => setEditableMetadata({...editableMetadata, questionType: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="Multiple Choice">Multiple Choice</option>
                  <option value="Short Answer">Short Answer</option>
                  <option value="Essay">Essay</option>
                  <option value="Fill-in-the-Blank">Fill-in-the-Blank</option>
                  <option value="Matching">Matching</option>
                  <option value="True/False">True/False</option>
                  <option value="Constructed Response">Constructed Response</option>
                  <option value="Performance Tasks">Performance Tasks</option>
                  <option value="Grid-in">Grid-in</option>
                  <option value="Student-Produced Response">Student-Produced Response</option>
                  <option value="Authentic Assessment">Authentic Assessment</option>
                  <option value="Free Response">Free Response</option>
                </select>
              </div>
            </div>

            {/* TEE View */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">TEE View (if applicable)</label>
              <input
                type="text"
                value={editableMetadata.view || ''}
                onChange={(e) => setEditableMetadata({...editableMetadata, view: e.target.value || undefined})}
                placeholder="e.g., Midesophageal Four-Chamber"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* Keywords */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Keywords</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {editableMetadata.keywords.map((keyword, index) => (
                  <span key={index} className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                    {keyword}
                    <button
                      onClick={() => removeKeyword(index)}
                      className="ml-1 bg-red-500 text-white hover:bg-red-600 rounded text-xs px-1.5 py-0.5 font-medium transition-colors"
                      title="Remove"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  placeholder="Add new keyword"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  onKeyPress={(e) => e.key === 'Enter' && addKeyword()}
                />
                <button
                  onClick={addKeyword}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Major Structures */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Major Structures</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {editableMetadata.majorStructures.map((structure, index) => (
                  <span key={index} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                    {structure}
                    <button
                      onClick={() => removeMajorStructure(index)}
                      className="ml-1 bg-red-500 text-white hover:bg-red-600 rounded text-xs px-1.5 py-0.5 font-medium transition-colors"
                      title="Remove"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMajorStructure}
                  onChange={(e) => setNewMajorStructure(e.target.value)}
                  placeholder="Add major structure"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  onKeyPress={(e) => e.key === 'Enter' && addMajorStructure()}
                />
                <button
                  onClick={addMajorStructure}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Minor Structures */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Minor Structures</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {editableMetadata.minorStructures.map((structure, index) => (
                  <span key={index} className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                    {structure}
                    <button
                      onClick={() => removeMinorStructure(index)}
                      className="ml-1 bg-red-500 text-white hover:bg-red-600 rounded text-xs px-1.5 py-0.5 font-medium transition-colors"
                      title="Remove"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMinorStructure}
                  onChange={(e) => setNewMinorStructure(e.target.value)}
                  placeholder="Add minor structure"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  onKeyPress={(e) => e.key === 'Enter' && addMinorStructure()}
                />
                <button
                  onClick={addMinorStructure}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Modalities */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Modalities</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {editableMetadata.modalities.map((modality, index) => (
                  <span key={index} className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                    {modality}
                    <button
                      onClick={() => removeModality(index)}
                      className="ml-1 bg-red-500 text-white hover:bg-red-600 rounded text-xs px-1.5 py-0.5 font-medium transition-colors"
                      title="Remove"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newModality}
                  onChange={(e) => setNewModality(e.target.value)}
                  placeholder="Add modality"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  onKeyPress={(e) => e.key === 'Enter' && addModality()}
                />
                <button
                  onClick={addModality}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
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
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditMetadataModal;