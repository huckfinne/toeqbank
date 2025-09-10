import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { batchService } from '../services/api';

interface UploadBatch {
  id: number;
  batch_name: string;
  uploader_username: string;
  upload_date: string;
  question_count: number;
  actual_question_count: number;
  file_name: string;
  description: string;
}

const BatchManagement: React.FC = () => {
  const [batches, setBatches] = useState<UploadBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingBatchId, setDeletingBatchId] = useState<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadBatches();
  }, []);

  const loadBatches = async () => {
    try {
      setLoading(true);
      const data = await batchService.getAllBatches();
      setBatches(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load batches');
      console.error('Error loading batches:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBatch = async (batch: UploadBatch) => {
    const confirmMessage = `Are you sure you want to delete the batch "${batch.batch_name}"?\n\nThis will permanently delete:\n- ${batch.actual_question_count} questions\n- All associated images and metadata\n- All review data\n\nThis action cannot be undone.`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setDeletingBatchId(batch.id);
      await batchService.deleteBatch(batch.id);
      
      // Remove the batch from the list
      setBatches(batches.filter(b => b.id !== batch.id));
      
      alert(`Batch "${batch.batch_name}" has been deleted successfully.`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete batch');
      console.error('Error deleting batch:', err);
    } finally {
      setDeletingBatchId(null);
    }
  };

  const handleViewBatch = (batchId: number) => {
    navigate(`/admin/batches/${batchId}`);
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
          <h1 className="text-3xl font-bold text-gray-900">Upload Batch Management</h1>
          <div className="flex items-center space-x-4">
            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
              {batches.length} batch{batches.length !== 1 ? 'es' : ''} total
            </span>
            <button
              onClick={() => navigate('/admin/users')}
              className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
            >
              Back to Admin Panel
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

        {batches.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Upload Batches</h3>
            <p className="text-gray-500">No upload batches have been created yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Batch Info
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Uploader
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Questions
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Upload Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {batches.map((batch) => (
                    <tr key={batch.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {batch.batch_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {batch.file_name}
                          </div>
                          {batch.description && (
                            <div className="text-xs text-gray-400 mt-1">
                              {batch.description}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {batch.uploader_username}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {batch.actual_question_count}
                        </div>
                        {batch.question_count !== batch.actual_question_count && (
                          <div className="text-xs text-amber-600">
                            (originally {batch.question_count})
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(batch.upload_date).toLocaleDateString()}<br />
                        <span className="text-xs text-gray-400">
                          {new Date(batch.upload_date).toLocaleTimeString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => handleViewBatch(batch.id)}
                          className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded transition-colors"
                        >
                          View Details
                        </button>
                        <button
                          onClick={() => handleDeleteBatch(batch)}
                          disabled={deletingBatchId === batch.id}
                          className={`px-3 py-1 rounded transition-colors ${
                            deletingBatchId === batch.id
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100'
                          }`}
                        >
                          {deletingBatchId === batch.id ? 'Deleting...' : 'Delete Batch'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BatchManagement;