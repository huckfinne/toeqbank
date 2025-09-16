import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import ExamSelector, { ExamSelection } from '../components/ExamSelector';

const UserSettings: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || ''
  });

  const [examSelection, setExamSelection] = useState<ExamSelection>({
    examCategory: user?.exam_category || 'echocardiography',
    examType: user?.exam_type || 'eacvi_toe'
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsLoading(true);

    try {
      const updateData = {
        ...formData,
        exam_category: examSelection.examCategory,
        exam_type: examSelection.examType
      };

      await updateProfile(updateData);
      setMessage('Settings updated successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to update settings');
    } finally {
      setIsLoading(false);
    }
  };

  const getExamDisplayName = (category: string, type: string) => {
    const categoryNames = {
      'echocardiography': 'Echocardiography',
      'usmle': 'USMLE'
    };

    const typeNames = {
      'eacvi_toe': 'EACVI TOE (Transesophageal Echocardiography)',
      'tte': 'TTE (Transthoracic Echocardiography)',
      'step1': 'Step 1',
      'step2': 'Step 2',
      'step3': 'Step 3'
    };

    return `${categoryNames[category as keyof typeof categoryNames]} - ${typeNames[type as keyof typeof typeNames]}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-5">
              <h1 className="text-2xl font-bold text-white">User Settings</h1>
              <p className="text-blue-100 mt-1">Manage your account preferences and exam settings</p>
            </div>

            <div className="p-6">
              {/* Current Exam Info */}
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="text-sm font-medium text-blue-800 mb-2">Current Exam Selection</h3>
                <p className="text-blue-700">
                  {user?.exam_category && user?.exam_type 
                    ? getExamDisplayName(user.exam_category, user.exam_type)
                    : 'Not set'
                  }
                </p>
              </div>

              {message && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">
                  {message}
                </div>
              )}

              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Personal Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-1">
                        First Name
                      </label>
                      <input
                        type="text"
                        id="first_name"
                        name="first_name"
                        value={formData.first_name}
                        onChange={handleChange}
                        disabled={isLoading}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="First name"
                      />
                    </div>

                    <div>
                      <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-1">
                        Last Name
                      </label>
                      <input
                        type="text"
                        id="last_name"
                        name="last_name"
                        value={formData.last_name}
                        onChange={handleChange}
                        disabled={isLoading}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Last name"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      disabled={isLoading}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Email address"
                    />
                  </div>
                </div>

                {/* Exam Selection */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Exam Preferences</h3>
                  <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                    <ExamSelector
                      value={examSelection}
                      onChange={setExamSelection}
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserSettings;