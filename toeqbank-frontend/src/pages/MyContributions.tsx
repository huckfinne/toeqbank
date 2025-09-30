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
  created_at: string;
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
  const [activeTab, setActiveTab] = useState<'questions' | 'images' | 'returned'>('questions');
  const [statusFilter, setStatusFilter] = useState<string>('all');
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
      
      // Separate regular and returned items
      const allQuestions = questionsResponse;
      const allImages = imagesResponse;
      
      // Filter returned items (status: 'returned' or 'rejected')
      const returnedQuestions = allQuestions.filter(q => 
        q.review_status === 'returned' || q.review_status === 'rejected'
      );
      const returnedImages = allImages.filter(img => 
        img.review_status === 'returned' || img.review_status === 'rejected'
      );
      
      // Filter regular items (not returned)
      const regularQuestions = allQuestions.filter(q => 
        q.review_status !== 'returned' && q.review_status !== 'rejected'
      );
      const regularImages = allImages.filter(img => 
        img.review_status !== 'returned' && img.review_status !== 'rejected'
      );
      
      setMyQuestions(regularQuestions);
      setMyImages(regularImages);
      setMyReturnedQuestions(returnedQuestions);
      setMyReturnedImages(returnedImages);
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

  // Filter functions
  const getFilteredQuestions = () => {
    if (statusFilter === 'all') return myQuestions;
    return myQuestions.filter(q => q.review_status === statusFilter);
  };

  const getFilteredImages = () => {
    if (statusFilter === 'all') return myImages;
    return myImages.filter(img => img.review_status === statusFilter);
  };

  const getFilteredReturnedQuestions = () => {
    if (statusFilter === 'all') return myReturnedQuestions;
    return myReturnedQuestions.filter(q => q.review_status === statusFilter);
  };

  const getFilteredReturnedImages = () => {
    if (statusFilter === 'all') return myReturnedImages;
    return myReturnedImages.filter(img => img.review_status === statusFilter);
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
            {myQuestions.length} questions, {myImages.length} images, {getFilteredReturnedQuestions().length + getFilteredReturnedImages().length} returned items
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Filter Section */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Filter by status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="returned">Needs Revision</option>
              <option value="rejected">Rejected</option>
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
              <button
                onClick={() => setActiveTab('returned')}
                className={`relative px-6 py-4 font-semibold text-sm transition-all duration-200 ${
                  activeTab === 'returned'
                    ? 'text-red-600 bg-white border-l border-t border-r border-gray-200 rounded-t-lg -mb-px z-10'
                    : 'text-gray-500 bg-gray-50 border border-gray-200 rounded-t-lg hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                Returned ({getFilteredReturnedQuestions().length + getFilteredReturnedImages().length})
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
              <div className="space-y-1">
                {getFilteredQuestions().map((question, index) => (
                  <div 
                    key={question.id} 
                    className={`px-6 py-5 cursor-pointer transition-all duration-200 hover:bg-blue-50 hover:shadow-sm border-l-4 border-transparent hover:border-blue-400 ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                    }`}
                    onClick={() => handleQuestionClick(question.id)}
                  >
                    <div className="flex items-center gap-8 text-base">
                      <span className="font-bold text-gray-900 bg-gray-100 px-4 py-2 rounded whitespace-nowrap text-sm min-w-fit">
                        {question.question_number}
                      </span>
                      <span className={`text-xs px-3 py-1 rounded-full font-medium whitespace-nowrap min-w-fit ${getStatusColor(question.review_status)}`}>
                        {question.review_status.toUpperCase().replace('_', ' ')}
                      </span>
                      <span className="text-gray-800 flex-1 text-sm leading-relaxed">
                        {question.question.length > 80 ? question.question.substring(0, 80) + '...' : question.question}
                      </span>
                      <span className="text-sm text-gray-500 whitespace-nowrap min-w-fit">
                        {new Date(question.created_at).toLocaleDateString()}
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

        {/* Returned Tab */}
        {activeTab === 'returned' && (
          <div>
            {(getFilteredReturnedQuestions().length === 0 && getFilteredReturnedImages().length === 0) ? (
              <div className="text-center py-12">
                <div className="text-gray-500 mb-4">
                  <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No returned items</h3>
                <p className="text-gray-500 mb-4">All your submissions are in good standing.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Returned Questions */}
                {getFilteredReturnedQuestions().length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-red-600 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Returned Questions ({getFilteredReturnedQuestions().length})
                    </h3>
                    <div className="space-y-4">
                      {getFilteredReturnedQuestions().map((question) => (
                        <div 
                          key={question.id} 
                          className="border-2 border-red-200 rounded-lg px-6 py-4 cursor-pointer transition-all duration-200 bg-red-50 hover:border-red-300 hover:shadow-md"
                          onClick={() => handleQuestionClick(question.id)}
                        >
                          <div className="flex items-center gap-6 text-base">
                            <span className="font-bold text-gray-900 bg-gray-100 px-4 py-2 rounded whitespace-nowrap text-sm">
                              {question.question_number}
                            </span>
                            <span className={`text-xs px-3 py-1 rounded-full font-medium whitespace-nowrap ${getStatusColor(question.review_status)}`}>
                              {question.review_status.toUpperCase().replace('_', ' ')}
                            </span>
                            <span className="text-gray-800 flex-1 truncate text-sm leading-relaxed">
                              {question.question.length > 80 ? question.question.substring(0, 80) + '...' : question.question}
                            </span>
                            <span className="text-sm text-gray-500 whitespace-nowrap ml-4">
                              {new Date(question.created_at).toLocaleDateString()}
                            </span>
                            {question.reviewed_at && (
                              <span className="text-sm text-red-600 whitespace-nowrap ml-2">
                                ⚠ {new Date(question.reviewed_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Returned Images */}
                {getFilteredReturnedImages().length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-red-600 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Returned Images ({getFilteredReturnedImages().length})
                    </h3>
                    <div className="image-gallery">
                      <table className="w-full table-fixed border-collapse bg-red-50 rounded-lg">
                        <tbody>
                          {Array.from({ length: Math.ceil(getFilteredReturnedImages().length / 4) }, (_, rowIndex) => (
                            <tr key={rowIndex}>
                              {Array.from({ length: 4 }, (_, colIndex) => {
                                const imageIndex = rowIndex * 4 + colIndex;
                                const image = getFilteredReturnedImages()[imageIndex];
                                
                                if (!image) {
                                  return <td key={colIndex} className="w-1/4 p-4"></td>;
                                }
                                
                                return (
                                  <td key={colIndex} className="w-1/4 p-4 border border-red-200">
                                    <div className="transition-transform hover:scale-105">
                                      <div className="text-center mb-1">
                                        <span className="px-2 py-1 text-sm font-bold rounded bg-red-500 text-white">
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

                                        <div className="absolute top-1 right-1">
                                          <span className={`px-1 py-0.5 text-xs font-semibold rounded ${getStatusColor(image.review_status || 'pending')}`}>
                                            {(image.review_status || 'pending').toUpperCase().replace('_', ' ')}
                                          </span>
                                        </div>
                                      </div>

                                      <div className="text-center text-xs">
                                        <div className="font-medium truncate mb-1 text-red-700" title={image.description || image.filename}>
                                          {image.description || image.filename}
                                        </div>
                                        
                                        <div className="text-red-600 mb-1">
                                          {formatFileSize(image.file_size || 0)}
                                        </div>

                                        {image.reviewed_at && (
                                          <div className="text-xs text-red-600 mb-1">
                                            Returned: {new Date(image.reviewed_at).toLocaleDateString()}
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
                  </div>
                )}
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