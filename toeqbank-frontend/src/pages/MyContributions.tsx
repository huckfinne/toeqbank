import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { questionService, imageService, Image } from '../services/api';
import './MyContributions.css';

interface MyQuestion {
  id: number;
  question_number: string;
  question: string;
  correct_answer: string;
  review_status: string;
  created_at?: string;
  reviewed_at?: string;
  reviewer_name?: string;
}

interface MyImage extends Image {
  reviewer_name?: string;
}

const MyContributions: React.FC = () => {
  const [myQuestions, setMyQuestions] = useState<MyQuestion[]>([]);
  const [myImages, setMyImages] = useState<MyImage[]>([]);
  const [myReturnedQuestions, setMyReturnedQuestions] = useState<MyQuestion[]>([]);
  const [myReturnedImages, setMyReturnedImages] = useState<MyImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'questions' | 'images'>('questions');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const navigate = useNavigate();

  useEffect(() => {
    console.log('🔍 MyContributions component mounted');
    loadMyContributions();
  }, []);

  const loadMyContributions = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading my contributions...');
      const [questionsResponse, imagesResponse] = await Promise.all([
        questionService.getMyQuestions(),
        imageService.getMyImages()
      ]);
      console.log('✅ Questions response:', questionsResponse);
      console.log('✅ Images response:', imagesResponse);
      
      // Store ALL questions and images (no filtering)
      const allQuestions = questionsResponse;
      const allImages = imagesResponse;

      setMyQuestions(allQuestions);
      setMyImages(allImages);

      // No longer need separate returned lists - we'll show all in main tabs
      setMyReturnedQuestions([]);
      setMyReturnedImages([]);
    } catch (err: any) {
      console.error('❌ Error loading contributions:', err);
      setError(err.response?.data?.error || 'Failed to load contributions');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'pending submission':
        return 'bg-blue-100 text-blue-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'returned':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleQuestionClick = (questionId: number) => {
    navigate(`/question/${questionId}`, { state: { from: '/my-contributions' } });
  };

  const handleImageClick = (imageId: number | undefined) => {
    if (imageId) {
      navigate(`/image/${imageId}`, { state: { from: '/my-contributions' } });
    }
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Helper function to filter by date
  const filterByDate = (item: MyQuestion | MyImage) => {
    if (dateFilter === 'all') return true;

    // Type guard: if created_at is undefined, include the item
    const createdAt = item.created_at;
    if (!createdAt) return true;

    const createdDate = new Date(createdAt);
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));

    switch (dateFilter) {
      case '7days':
        return daysDiff <= 7;
      case '30days':
        return daysDiff <= 30;
      case '90days':
        return daysDiff <= 90;
      case '180days':
        return daysDiff <= 180;
      case '1year':
        return daysDiff <= 365;
      default:
        return true;
    }
  };

  // Filter functions
  const getFilteredQuestions = () => {
    let filtered = myQuestions;

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(q => q.review_status === statusFilter);
    }

    // Apply date filter
    filtered = filtered.filter(filterByDate);

    return filtered;
  };

  const getFilteredImages = () => {
    let filtered = myImages;

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(img => img.review_status === statusFilter);
    }

    // Apply date filter
    filtered = filtered.filter(filterByDate);

    return filtered;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">My Contributions</h1>
          <div className="text-sm text-gray-500">
            {myQuestions.length} questions • {myImages.length} images
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Filter Section */}
        <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Filter by status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="pending submission">Pending Submission</option>
              <option value="pending">Pending Review</option>
              <option value="approved">Approved</option>
              <option value="returned">Needs Revision</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Filter by date:</label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Time</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="90days">Last 90 Days</option>
              <option value="180days">Last 6 Months</option>
              <option value="1year">Last Year</option>
            </select>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-0">
              <button
                onClick={() => setActiveTab('questions')}
                className={`relative px-6 py-4 font-semibold text-sm transition-all duration-200 ${
                  activeTab === 'questions'
                    ? 'text-blue-600 bg-white border-l border-t border-r border-gray-200 rounded-t-lg -mb-px z-10'
                    : 'text-gray-500 bg-gray-50 border border-gray-200 rounded-t-lg hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Questions ({getFilteredQuestions().length})
              </button>
              <button
                onClick={() => setActiveTab('images')}
                className={`relative px-6 py-4 font-semibold text-sm transition-all duration-200 ${
                  activeTab === 'images'
                    ? 'text-blue-600 bg-white border-l border-t border-r border-gray-200 rounded-t-lg -mb-px z-10'
                    : 'text-gray-500 bg-gray-50 border border-gray-200 rounded-t-lg hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Images ({getFilteredImages().length})
              </button>
            </nav>
          </div>
        </div>

        {/* Questions Tab */}
        {activeTab === 'questions' && (
          <div>
            {getFilteredQuestions().length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-500 mb-4">
                  <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No questions submitted yet</h3>
                <p className="text-gray-500 mb-4">Start contributing by creating your first question.</p>
                <button
                  onClick={() => navigate('/create-question')}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Question
                </button>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Group questions by status */}
                {['returned', 'rejected', 'pending submission', 'pending', 'approved'].map(status => {
                  const statusQuestions = getFilteredQuestions().filter(q => {
                    if (statusFilter === 'all') {
                      return q.review_status === status;
                    }
                    return q.review_status === status && q.review_status === statusFilter;
                  });

                  if (statusQuestions.length === 0) return null;

                  const statusConfig = {
                    returned: { icon: '↩️', title: 'Needs Revision', color: 'orange', bgColor: 'bg-orange-50', borderColor: 'border-orange-200' },
                    rejected: { icon: '❌', title: 'Rejected', color: 'red', bgColor: 'bg-red-50', borderColor: 'border-red-200' },
                    'pending submission': { icon: '📝', title: 'Pending Submission', color: 'blue', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
                    pending: { icon: '⏳', title: 'Pending Review', color: 'yellow', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-200' },
                    approved: { icon: '✅', title: 'Approved', color: 'green', bgColor: 'bg-green-50', borderColor: 'border-green-200' }
                  };

                  const config = statusConfig[status as keyof typeof statusConfig];

                  return (
                    <div key={status}>
                      <h3 className={`text-lg font-semibold text-${config.color}-700 mb-3 flex items-center`}>
                        <span className="mr-2">{config.icon}</span>
                        {config.title} ({statusQuestions.length})
                      </h3>
                      <div className={`rounded-lg ${config.bgColor} ${config.borderColor} border-2 overflow-hidden`}>
                        {statusQuestions.map((question, index) => (
                          <div
                            key={question.id}
                            className={`px-6 py-4 cursor-pointer transition-all duration-200 hover:bg-white hover:shadow-sm border-l-4 border-transparent hover:border-${config.color}-400 ${
                              index < statusQuestions.length - 1 ? 'border-b border-gray-200' : ''
                            }`}
                            onClick={() => handleQuestionClick(question.id)}
                          >
                            <div className="flex items-center gap-6 text-base">
                              <span className="font-bold text-gray-900 bg-white px-4 py-2 rounded whitespace-nowrap text-sm min-w-fit shadow-sm">
                                {question.question_number}
                              </span>
                              <span className={`text-xs px-3 py-1 rounded-full font-medium whitespace-nowrap min-w-fit ${getStatusColor(question.review_status)}`}>
                                {question.review_status.toUpperCase().replace('_', ' ')}
                              </span>
                              <span className="text-gray-800 flex-1 text-sm leading-relaxed">
                                {question.question.length > 80 ? question.question.substring(0, 80) + '...' : question.question}
                              </span>
                              <span className="text-sm text-gray-500 whitespace-nowrap min-w-fit">
                                {question.created_at ? new Date(question.created_at).toLocaleDateString() : 'Unknown'}
                              </span>
                              {question.reviewed_at && (
                                <span className="text-sm text-green-600 whitespace-nowrap min-w-fit">
                                  ✓ {new Date(question.reviewed_at).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Images Tab */}
        {activeTab === 'images' && (
          <div>
            {getFilteredImages().length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-500 mb-4">
                  <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No images uploaded yet</h3>
                <p className="text-gray-500 mb-4">Start contributing by uploading your first image.</p>
                <button
                  onClick={() => navigate('/images')}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Upload Images
                </button>
              </div>
            ) : (
              <div className="image-gallery">
                <table className="w-full table-fixed border-collapse bg-white rounded-lg shadow-sm">
                  <tbody>
                    {Array.from({ length: Math.ceil(getFilteredImages().length / 4) }, (_, rowIndex) => (
                      <tr key={rowIndex}>
                        {Array.from({ length: 4 }, (_, colIndex) => {
                          const imageIndex = rowIndex * 4 + colIndex;
                          const image = getFilteredImages()[imageIndex];
                          
                          if (!image) {
                            return <td key={colIndex} className="w-1/4 p-4"></td>;
                          }
                          
                          return (
                            <td key={colIndex} className="w-1/4 p-4 border border-gray-200">
                              <div className="transition-transform hover:scale-105">
                                {/* Image ID above the image */}
                                <div className="text-center mb-1">
                                  <span className="px-2 py-1 text-sm font-bold rounded bg-blue-500 text-white">
                                    ID: {image.id}
                                  </span>
                                </div>
                                <div 
                                  className="relative bg-gray-100 rounded overflow-hidden mx-auto mb-2 cursor-pointer" 
                                  style={{width: '96px', height: '96px', maxWidth: '96px', maxHeight: '96px'}}
                                  onClick={() => handleImageClick(image.id)}
                                >
                                  {image.mime_type?.startsWith('video/') ? (
                                    <video
                                      src={imageService.getImageUrl(image.file_path || image.filename)}
                                      className="w-full h-full object-cover"
                                      style={{width: '96px', height: '96px', maxWidth: '96px', maxHeight: '96px'}}
                                      muted
                                      loop
                                    />
                                  ) : (
                                    <img
                                      src={imageService.getImageUrl(image.file_path || image.filename)}
                                      alt={image.description || image.filename}
                                      className="w-full h-full object-cover"
                                      style={{width: '96px', height: '96px', maxWidth: '96px', maxHeight: '96px'}}
                                      onError={(e) => {
                                        const img = e.currentTarget;
                                        img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"%3E%3Crect fill="%23f0f0f0" width="96" height="96"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999" font-family="sans-serif" font-size="12"%3EImage Not Available%3C/text%3E%3C/svg%3E';
                                      }}
                                    />
                                  )}
                                  
                                  <div className="absolute top-1 left-1">
                                    <span className={`px-1 py-0.5 text-xs font-semibold rounded ${
                                      image.image_type === 'cine' 
                                        ? 'bg-purple-100 text-purple-800' 
                                        : 'bg-green-100 text-green-800'
                                    }`}>
                                      {image.image_type === 'cine' ? 'CINE' : 'STILL'}
                                    </span>
                                  </div>

                                  {/* Review Status Badge */}
                                  <div className="absolute top-1 right-1">
                                    <span className={`px-1 py-0.5 text-xs font-semibold rounded ${getStatusColor(image.review_status || 'pending')}`}>
                                      {(image.review_status || 'pending').toUpperCase().replace('_', ' ')}
                                    </span>
                                  </div>

                                  {image.duration_seconds && (
                                    <div className="absolute bottom-1 right-1 bg-black bg-opacity-70 text-white px-1 text-xs rounded">
                                      {image.duration_seconds}s
                                    </div>
                                  )}
                                </div>

                                {/* Image details below */}
                                <div className="text-center text-xs">
                                  <div className="font-medium truncate mb-1" title={image.description || image.filename}>
                                    {image.description || image.filename}
                                  </div>
                                  
                                  <div className="text-gray-500 mb-1">
                                    {formatFileSize(image.file_size || 0)}
                                  </div>

                                  {/* Review feedback */}
                                  {image.reviewed_at && (
                                    <div className="text-xs text-gray-600 mb-1">
                                      Reviewed: {new Date(image.reviewed_at).toLocaleDateString()}
                                    </div>
                                  )}
                                  
                                  {image.reviewed_by && (
                                    <div className="text-xs text-purple-600 mb-1">
                                      Reviewer ID: {image.reviewed_by}
                                    </div>
                                  )}

                                  {image.tags && image.tags.length > 0 && (
                                    <div className="mb-1">
                                      <span className="bg-blue-100 text-blue-800 px-1 rounded text-xs">
                                        {image.tags[0]}
                                      </span>
                                      {image.tags.length > 1 && (
                                        <span className="text-gray-500 ml-1">
                                          +{image.tags.length - 1}
                                        </span>
                                      )}
                                    </div>
                                  )}

                                  <div className="text-xs text-gray-500">
                                    Uploaded: {image.created_at ? new Date(image.created_at).toLocaleDateString() : 'Unknown'}
                                  </div>
                                </div>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <div className="mt-8 text-center">
          <button
            onClick={() => navigate('/')}
            className="bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default MyContributions;