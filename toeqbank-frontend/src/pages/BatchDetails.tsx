import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { batchService } from '../services/api';

interface BatchDetailsData {
  batch: {
    id: number;
    batch_name: string;
    uploader_username: string;
    upload_date: string;
    question_count: number;
    actual_question_count: number;
    file_name: string;
    description: string;
  };
  questions: Array<{
    id: number;
    question_number: string;
    question: string;
    review_status: string;
    status_display: string;
    created_at: string;
  }>;
}

const BatchDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [batchDetails, setBatchDetails] = useState<BatchDetailsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingBatch, setDeletingBatch] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      loadBatchDetails();
    }
  }, [id]);

  const loadBatchDetails = async () => {
    try {
      setLoading(true);
      const data = await batchService.getBatchDetails(parseInt(id!));
      setBatchDetails(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load batch details');
      console.error('Error loading batch details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBatch = async () => {
    if (!batchDetails) return;

    const confirmMessage = `Are you sure you want to delete the batch "${batchDetails.batch.batch_name}"?\n\nThis will permanently delete:\n- ${batchDetails.questions.length} questions\n- All associated images and metadata\n- All review data\n\nThis action cannot be undone.`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setDeletingBatch(true);
      await batchService.deleteBatch(batchDetails.batch.id);
      
      alert(`Batch "${batchDetails.batch.batch_name}" has been deleted successfully.`);
      navigate('/admin/batches');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete batch');
      console.error('Error deleting batch:', err);
    } finally {
      setDeletingBatch(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'pending':
      case 'ready for review':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'returned':
      case 'needs rework':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
        <button
          onClick={() => navigate('/admin/batches')}
          className="mt-4 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
        >
          Back to Batches
        </button>
      </div>
    );
  }

  if (!batchDetails) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-gray-500">Batch not found</p>
          <button
            onClick={() => navigate('/admin/batches')}
            className="mt-4 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
          >
            Back to Batches
          </button>
        </div>
      </div>
    );
  }

  const { batch, questions } = batchDetails;

  // Group questions by status
  const statusCounts = questions.reduce((acc, q) => {
    acc[q.status_display] = (acc[q.status_display] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-lg p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{batch.batch_name}</h1>
            <p className="text-gray-500 mt-1">Uploaded by {batch.uploader_username}</p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/admin/batches')}
              className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
            >
              Back to Batches
            </button>
            <button
              onClick={handleDeleteBatch}
              disabled={deletingBatch}
              className={`px-4 py-2 rounded-lg transition-colors ${
                deletingBatch
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
            >
              {deletingBatch ? 'Deleting...' : 'Delete Batch'}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
            <button 
              onClick={() => setError(null)} 
              className="ml-2 text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        )}

        {/* Batch Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2">Upload Information</h3>
            <p className="text-sm text-gray-600"><strong>File:</strong> {batch.file_name}</p>
            <p className="text-sm text-gray-600"><strong>Date:</strong> {new Date(batch.upload_date).toLocaleString()}</p>
            <p className="text-sm text-gray-600"><strong>Questions:</strong> {questions.length}</p>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2">Status Summary</h3>
            {Object.entries(statusCounts).map(([status, count]) => (
              <p key={status} className="text-sm text-gray-600">
                <span className={`inline-block px-2 py-1 rounded-full text-xs mr-2 ${getStatusColor(status)}`}>
                  {status}
                </span>
                {count}
              </p>
            ))}
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
            <p className="text-sm text-gray-600">{batch.description || 'No description provided'}</p>
          </div>
        </div>

        {/* Questions List */}
        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Questions in this Batch</h3>
          
          {questions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No questions found in this batch</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Question #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Question Text
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {questions.map((question) => (
                    <tr key={question.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {question.question_number}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                        <div className="truncate" title={question.question}>
                          {question.question}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(question.status_display)}`}>
                          {question.status_display}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(question.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BatchDetails;