import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const AdminDashboard: React.FC = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  if (!isAdmin) {
    return (
      <div className="page-container d-flex justify-content-center align-items-center" style={{minHeight: '60vh'}}>
        <div className="text-center">
          <div className="alert alert-error">
            <h2 className="mb-2">Access Denied</h2>
            <p className="mb-0">You need admin privileges to access this page.</p>
          </div>
        </div>
      </div>
    );
  }

  const adminSections = [
    {
      title: 'User Management',
      description: 'Manage system users, permissions, and access controls',
      icon: (
        <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
        </svg>
      ),
      options: [
        {
          name: 'View All Users',
          description: 'Manage existing users, roles, and permissions',
          path: '/admin/users',
          color: 'blue'
        },
        {
          name: 'Create New User',
          description: 'Add new users to the system',
          path: '/admin/users?action=create',
          color: 'green'
        }
      ]
    },
    {
      title: 'Batch Management',
      description: 'Manage question upload batches and bulk operations',
      icon: (
        <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      ),
      options: [
        {
          name: 'View All Batches',
          description: 'Browse and manage upload batches',
          path: '/admin/batches',
          color: 'purple'
        },
        {
          name: 'Batch Statistics',
          description: 'View upload statistics and analytics',
          path: '/admin/batch-stats',
          color: 'indigo'
        }
      ]
    },
    {
      title: 'AI Tools',
      description: 'AI-powered question analysis and enhancement tools',
      icon: (
        <svg className="w-8 h-8 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      options: [
        {
          name: 'AI Manipulation',
          description: 'AI-powered question enhancement and analysis',
          path: '/admin/ai',
          color: 'cyan'
        }
      ]
    },
    {
      title: 'System Management',
      description: 'System-wide settings and maintenance tools',
      icon: (
        <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      options: [
        {
          name: 'Database Backup',
          description: 'Create and manage database backups',
          path: '/admin/backup',
          color: 'yellow'
        },
        {
          name: 'System Logs',
          description: 'View application logs and monitoring',
          path: '/admin/logs',
          color: 'gray'
        }
      ]
    }
  ];

  const getColorClasses = (color: string) => {
    const colorMap: Record<string, { bg: string; hover: string; text: string }> = {
      blue: { bg: 'bg-blue-50', hover: 'hover:bg-blue-100', text: 'text-blue-700' },
      green: { bg: 'bg-green-50', hover: 'hover:bg-green-100', text: 'text-green-700' },
      purple: { bg: 'bg-purple-50', hover: 'hover:bg-purple-100', text: 'text-purple-700' },
      indigo: { bg: 'bg-indigo-50', hover: 'hover:bg-indigo-100', text: 'text-indigo-700' },
      cyan: { bg: 'bg-cyan-50', hover: 'hover:bg-cyan-100', text: 'text-cyan-700' },
      yellow: { bg: 'bg-yellow-50', hover: 'hover:bg-yellow-100', text: 'text-yellow-700' },
      gray: { bg: 'bg-gray-50', hover: 'hover:bg-gray-100', text: 'text-gray-700' }
    };
    return colorMap[color] || colorMap.gray;
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>🛠️ Admin Dashboard</h1>
        <p>Central hub for system administration and management</p>
      </div>

      <div className="grid-container grid-3">
        {adminSections.map((section, index) => (
          <div key={index} className="content-card">
            <div className="card-header">
              <div className="d-flex align-items-center">
                {section.icon}
                <div className="ms-3">
                  <h3 className="mb-1">{section.title}</h3>
                  <p className="text-muted mb-0">{section.description}</p>
                </div>
              </div>
            </div>
            <div className="card-body">
              <div className="d-flex flex-column gap-3">
                {section.options.map((option, optionIndex) => (
                  <button
                    key={optionIndex}
                    onClick={() => navigate(option.path)}
                    className="btn btn-outline w-100 text-start"
                  >
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <div className="font-weight-medium">{option.name}</div>
                        <div className="text-muted small">{option.description}</div>
                      </div>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Stats Section */}
      <div className="content-card mt-4">
        <div className="card-header">
          <h3 className="mb-0">Quick Stats</h3>
          <p className="text-muted mb-0">Current system overview and metrics</p>
        </div>
        <div className="card-body">
          <div className="grid-container grid-4">
            <div className="text-center">
              <div className="h2 text-primary mb-2">-</div>
              <div className="text-muted">Active Users</div>
            </div>
            <div className="text-center">
              <div className="h2 text-success mb-2">-</div>
              <div className="text-muted">Upload Batches</div>
            </div>
            <div className="text-center">
              <div className="h2 text-warning mb-2">-</div>
              <div className="text-muted">Total Questions</div>
            </div>
            <div className="text-center">
              <div className="h2 text-danger mb-2">-</div>
              <div className="text-muted">Pending Reviews</div>
            </div>
          </div>
          <div className="alert alert-info mt-4">
            <small>Statistics will be loaded dynamically based on current system data</small>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;