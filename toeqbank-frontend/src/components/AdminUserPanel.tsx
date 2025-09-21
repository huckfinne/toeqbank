import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { adminService, AdminUser, CreateUserData } from '../services/adminApi';
import { useAuth } from '../contexts/AuthContext';

interface CreateUserFormData extends CreateUserData {
  confirmPassword: string;
  is_image_contributor: boolean;
}

const AdminUserPanel: React.FC = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [registrationLink, setRegistrationLink] = useState<string | null>(null);
  const [generatingLink, setGeneratingLink] = useState(false);
  
  const [createForm, setCreateForm] = useState<CreateUserFormData>({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: '',
    is_admin: false,
    is_reviewer: false,
    is_image_contributor: false
  });


  const [resetPasswordForm, setResetPasswordForm] = useState({
    userId: 0,
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswordReset, setShowPasswordReset] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    }
  }, [isAdmin]);

  useEffect(() => {
    // Check if we should auto-open the create form based on URL params
    const action = searchParams.get('action');
    if (action === 'create') {
      setShowCreateForm(true);
    }
  }, [searchParams]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const usersData = await adminService.getUsers();
      setUsers(usersData);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load users');
      console.error('Load users error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (createForm.password !== createForm.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setError(null);
      const { confirmPassword, ...userData } = createForm;
      await adminService.createUser(userData);
      setSuccess('User created successfully');
      setCreateForm({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        first_name: '',
        last_name: '',
        is_admin: false,
        is_reviewer: false,
    is_image_contributor: false
      });
      setShowCreateForm(false);
      loadUsers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create user');
      console.error('Create user error:', err);
    }
  };


  const handleDeleteUser = async (userId: number, username: string) => {
    if (!window.confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setError(null);
      await adminService.deleteUser(userId);
      setSuccess('User deleted successfully');
      loadUsers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete user');
      console.error('Delete user error:', err);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (resetPasswordForm.newPassword !== resetPasswordForm.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setError(null);
      await adminService.resetPassword(resetPasswordForm.userId, resetPasswordForm.newPassword);
      setSuccess('Password reset successfully');
      setShowPasswordReset(false);
      setResetPasswordForm({
        userId: 0,
        newPassword: '',
        confirmPassword: ''
      });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to reset password');
      console.error('Reset password error:', err);
    }
  };


  const startPasswordReset = (userId: number) => {
    setResetPasswordForm({
      userId,
      newPassword: '',
      confirmPassword: ''
    });
    setShowPasswordReset(true);
  };

  const getUserRole = (user: AdminUser): string => {
    if (user.is_admin) return 'admin';
    if (user.is_reviewer) return 'reviewer';
    if (user.is_image_contributor) return 'image_contributor';
    return 'regular';
  };

  const handleQuickRoleChange = async (userId: number, newRole: string) => {
    try {
      setError(null);
      const updateData = {
        is_admin: newRole === 'admin',
        is_reviewer: newRole === 'reviewer' || newRole === 'admin',
        is_image_contributor: newRole === 'image_contributor'
      };
      
      await adminService.updateUser(userId, updateData);
      setSuccess('User role updated successfully');
      loadUsers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update user role');
      console.error('Update user role error:', err);
    }
  };

  const generateRegistrationLink = async () => {
    try {
      setGeneratingLink(true);
      setError(null);
      const response = await adminService.generateRegistrationToken('image_contributor', 72);
      setRegistrationLink(response.registrationUrl);
      setSuccess('Registration link generated successfully! Link expires in 72 hours.');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to generate registration link');
      console.error('Generate registration link error:', err);
    } finally {
      setGeneratingLink(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setSuccess('Registration link copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600">You need admin privileges to access this page.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">👥 User Management</h1>
            <p className="text-gray-600">Manage system users and their permissions.</p>
          </div>
          <button
            onClick={() => navigate('/admin')}
            className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
          >
            Back to Admin Dashboard
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg">
            <p className="text-red-800">{error}</p>
            <button 
              onClick={() => setError(null)}
              className="mt-2 text-red-600 hover:text-red-800 text-sm"
            >
              Dismiss
            </button>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 rounded-r-lg">
            <p className="text-green-800">{success}</p>
            <button 
              onClick={() => setSuccess(null)}
              className="mt-2 text-green-600 hover:text-green-800 text-sm"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Registration Link Generation */}
        <div className="mb-8 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200 p-6">
          <div className="flex items-center mb-4">
            <span className="text-2xl mr-3">🔗</span>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Generate Registration Link</h2>
              <p className="text-sm text-gray-600">Create a secure registration link for new Image Contributors</p>
            </div>
          </div>
          
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <button
                onClick={generateRegistrationLink}
                disabled={generatingLink}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {generatingLink ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <span>🎫</span>
                    Generate Image Contributor Link
                  </>
                )}
              </button>
            </div>
          </div>
          
          {registrationLink && (
            <div className="mt-4 bg-white rounded-lg border border-purple-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-900">Registration Link Generated</h3>
                <span className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded-full">Expires in 72 hours</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={registrationLink}
                  readOnly
                  className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm font-mono"
                />
                <button
                  onClick={() => copyToClipboard(registrationLink)}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-sm"
                >
                  📋 Copy
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Send this link to the person you want to invite as an Image Contributor. They can use it to create their account with the appropriate permissions.
              </p>
            </div>
          )}
        </div>

        {/* Create User Button */}
        <div className="mb-6">
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {showCreateForm ? 'Cancel' : '+ Create New User'}
          </button>
        </div>

        {/* Create User Form */}
        {showCreateForm && (
          <div className="mb-8 bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Create New User</h2>
            <form onSubmit={handleCreateUser}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Username *
                  </label>
                  <input
                    type="text"
                    value={createForm.username}
                    onChange={(e) => setCreateForm({...createForm, username: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({...createForm, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={createForm.first_name}
                    onChange={(e) => setCreateForm({...createForm, first_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={createForm.last_name}
                    onChange={(e) => setCreateForm({...createForm, last_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password *
                  </label>
                  <input
                    type="password"
                    value={createForm.password}
                    onChange={(e) => setCreateForm({...createForm, password: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    minLength={6}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    value={createForm.confirmPassword}
                    onChange={(e) => setCreateForm({...createForm, confirmPassword: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <div className="pb-2 border-b border-gray-200">
                  <p className="text-xs text-gray-500 mb-2 font-medium">User Type:</p>
                  <label className="flex items-center mb-2">
                    <input
                      type="radio"
                      name="createUserType"
                      checked={!createForm.is_image_contributor}
                      onChange={() => setCreateForm({...createForm, is_image_contributor: false})}
                      className="mr-2 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="text-sm text-gray-700 font-medium">Regular User</span>
                      <span className="text-xs text-gray-500 block">Can create questions and upload images without limits</span>
                    </div>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="createUserType"
                      checked={createForm.is_image_contributor}
                      onChange={() => setCreateForm({...createForm, is_image_contributor: true})}
                      className="mr-2 text-purple-600 focus:ring-purple-500"
                    />
                    <div>
                      <span className="text-sm text-gray-700 font-medium">Image Contributor</span>
                      <span className="text-xs text-gray-500 block">Limited to 20 uploads, for paid contractors</span>
                    </div>
                  </label>
                </div>
                <div className="pt-2">
                  <p className="text-xs text-gray-500 mb-2 font-medium">Additional Privileges (optional):</p>
                  <label className="flex items-center mb-2">
                    <input
                      type="checkbox"
                      checked={createForm.is_admin}
                      onChange={(e) => setCreateForm({...createForm, is_admin: e.target.checked})}
                      className="mr-2 text-red-600 focus:ring-red-500"
                    />
                    <div>
                      <span className="text-sm text-gray-700 font-medium">Administrator</span>
                      <span className="text-xs text-gray-500 block">Full system access</span>
                    </div>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={createForm.is_reviewer}
                      onChange={(e) => setCreateForm({...createForm, is_reviewer: e.target.checked})}
                      className="mr-2 text-green-600 focus:ring-green-500"
                    />
                    <div>
                      <span className="text-sm text-gray-700 font-medium">Reviewer</span>
                      <span className="text-xs text-gray-500 block">Can review and approve content</span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create User
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Admin Users Section */}
        <div className="mb-8 bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-purple-50 to-purple-100 border-b">
            <div className="flex items-center">
              <span className="text-xl mr-2">👑</span>
              <h2 className="text-lg font-semibold text-gray-900">
                Administrators ({users.filter(u => u.is_admin).length})
              </h2>
            </div>
            <p className="text-sm text-gray-600 mt-1">Users with full system access and administrative privileges</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Login
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.filter(user => user.is_admin).map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {user.first_name || user.last_name ? 
                            `${user.first_name || ''} ${user.last_name || ''}`.trim() : 
                            user.username}
                        </div>
                        {(user.first_name || user.last_name) && (
                          <div className="text-sm text-gray-500">@{user.username}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-1">
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                          Admin
                        </span>
                        {user.is_reviewer && (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            Reviewer
                          </span>
                        )}
                        {user.is_image_contributor && (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            Image Contributor
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2 items-center">
                        <select
                          value={getUserRole(user)}
                          onChange={(e) => handleQuickRoleChange(user.id, e.target.value)}
                          className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                          <option value="admin">Admin</option>
                          <option value="reviewer">Reviewer</option>
                          <option value="image_contributor">Image Contributor</option>
                          <option value="regular">Regular User</option>
                        </select>
                        <button
                          onClick={() => startPasswordReset(user.id)}
                          className="text-yellow-600 hover:text-yellow-900"
                        >
                          Reset Password
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id, user.username)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.filter(user => user.is_admin).length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      No administrators found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Reviewer Users Section */}
        <div className="mb-8 bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-blue-100 border-b">
            <div className="flex items-center">
              <span className="text-xl mr-2">🔍</span>
              <h2 className="text-lg font-semibold text-gray-900">
                Reviewers ({users.filter(u => u.is_reviewer && !u.is_admin).length})
              </h2>
            </div>
            <p className="text-sm text-gray-600 mt-1">Users who can review and approve questions</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Login
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.filter(user => user.is_reviewer && !user.is_admin).map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {user.first_name || user.last_name ? 
                            `${user.first_name || ''} ${user.last_name || ''}`.trim() : 
                            user.username}
                        </div>
                        {(user.first_name || user.last_name) && (
                          <div className="text-sm text-gray-500">@{user.username}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-1">
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          Reviewer
                        </span>
                        {user.is_image_contributor && (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            Image Contributor
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2 items-center">
                        <select
                          value={getUserRole(user)}
                          onChange={(e) => handleQuickRoleChange(user.id, e.target.value)}
                          className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                          <option value="admin">Admin</option>
                          <option value="reviewer">Reviewer</option>
                          <option value="image_contributor">Image Contributor</option>
                          <option value="regular">Regular User</option>
                        </select>
                        <button
                          onClick={() => startPasswordReset(user.id)}
                          className="text-yellow-600 hover:text-yellow-900"
                        >
                          Reset Password
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id, user.username)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.filter(user => user.is_reviewer && !user.is_admin).length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      No reviewers found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Image Contributors Section */}
        <div className="mb-8 bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-green-50 to-green-100 border-b">
            <div className="flex items-center">
              <span className="text-xl mr-2">🖼️</span>
              <h2 className="text-lg font-semibold text-gray-900">
                Image Contributors ({users.filter(u => u.is_image_contributor && !u.is_admin && !u.is_reviewer).length})
              </h2>
            </div>
            <p className="text-sm text-gray-600 mt-1">Users who can access and contribute to the image library</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Limit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Images
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Descriptions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total / Remaining
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.filter(user => user.is_image_contributor && !user.is_admin && !user.is_reviewer).map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {user.first_name || user.last_name ? 
                            `${user.first_name || ''} ${user.last_name || ''}`.trim() : 
                            user.username}
                        </div>
                        {(user.first_name || user.last_name) && (
                          <div className="text-sm text-gray-500">@{user.username}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                      {user.contribution_stats?.permitted_limit || 20}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                      {user.contribution_stats?.total_images || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                      {user.contribution_stats?.total_descriptions || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                      <div className="flex flex-col">
                        <span className={`font-medium ${
                          (user.contribution_stats?.total_contributions || 0) >= (user.contribution_stats?.permitted_limit || 20) 
                            ? 'text-red-600' 
                            : 'text-gray-900'
                        }`}>
                          {user.contribution_stats?.total_contributions || 0} / {user.contribution_stats?.permitted_limit || 20}
                        </span>
                        <span className="text-xs text-gray-500">
                          {user.contribution_stats?.remaining || 20} remaining
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2 items-center">
                        <select
                          value={getUserRole(user)}
                          onChange={(e) => handleQuickRoleChange(user.id, e.target.value)}
                          className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                          <option value="admin">Admin</option>
                          <option value="reviewer">Reviewer</option>
                          <option value="image_contributor">Image Contributor</option>
                          <option value="regular">Regular User</option>
                        </select>
                        <button
                          onClick={() => startPasswordReset(user.id)}
                          className="text-yellow-600 hover:text-yellow-900"
                        >
                          Reset Password
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id, user.username)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.filter(user => user.is_image_contributor && !user.is_admin && !user.is_reviewer).length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                      No image contributors found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Regular Users Section */}
        <div className="mb-8 bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b">
            <div className="flex items-center">
              <span className="text-xl mr-2">👥</span>
              <h2 className="text-lg font-semibold text-gray-900">
                Regular Users ({users.filter(u => !u.is_admin && !u.is_reviewer && !u.is_image_contributor).length})
              </h2>
            </div>
            <p className="text-sm text-gray-600 mt-1">Standard users with basic access to the system and their contribution statistics</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Images
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Descriptions
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Login
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.filter(user => !user.is_admin && !user.is_reviewer && !user.is_image_contributor).map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {user.first_name || user.last_name ? 
                            `${user.first_name || ''} ${user.last_name || ''}`.trim() : 
                            user.username}
                        </div>
                        {(user.first_name || user.last_name) && (
                          <div className="text-sm text-gray-500">@{user.username}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                      <span className="font-medium text-green-600">
                        {user.contribution_stats?.total_images || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                      <span className="font-medium text-blue-600">
                        {user.contribution_stats?.total_descriptions || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                      <span className="font-bold text-gray-900">
                        {user.contribution_stats?.total_contributions || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2 items-center">
                        <select
                          value={getUserRole(user)}
                          onChange={(e) => handleQuickRoleChange(user.id, e.target.value)}
                          className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                          <option value="admin">Admin</option>
                          <option value="reviewer">Reviewer</option>
                          <option value="image_contributor">Image Contributor</option>
                          <option value="regular">Regular User</option>
                        </select>
                        <button
                          onClick={() => startPasswordReset(user.id)}
                          className="text-yellow-600 hover:text-yellow-900"
                        >
                          Reset Password
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id, user.username)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.filter(user => !user.is_admin && !user.is_reviewer && !user.is_image_contributor).length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                      No regular users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>


        {/* Reset Password Modal */}
        {showPasswordReset && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Reset Password</h2>
              <form onSubmit={handleResetPassword}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={resetPasswordForm.newPassword}
                      onChange={(e) => setResetPasswordForm({...resetPasswordForm, newPassword: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                      minLength={6}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={resetPasswordForm.confirmPassword}
                      onChange={(e) => setResetPasswordForm({...resetPasswordForm, confirmPassword: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    type="submit"
                    className="px-6 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                  >
                    Reset Password
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPasswordReset(false)}
                    className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminUserPanel;