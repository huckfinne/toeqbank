import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const AdminDashboard: React.FC = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

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
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">🛠️ Admin Dashboard</h1>
          <p className="text-xl text-gray-600">Central hub for system administration and management</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
          {adminSections.map((section, index) => (
            <div key={index} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300">
              <div className="flex items-center mb-4">
                {section.icon}
                <div className="ml-4">
                  <h2 className="text-xl font-bold text-gray-900">{section.title}</h2>
                  <p className="text-sm text-gray-600 mt-1">{section.description}</p>
                </div>
              </div>

              <div className="space-y-3 mt-6">
                {section.options.map((option, optionIndex) => {
                  const colors = getColorClasses(option.color);
                  return (
                    <button
                      key={optionIndex}
                      onClick={() => navigate(option.path)}
                      className={`w-full text-left p-4 rounded-lg border-2 border-transparent ${colors.bg} ${colors.hover} transition-all duration-200 group`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className={`font-semibold ${colors.text} group-hover:text-gray-900`}>
                            {option.name}
                          </h3>
                          <p className="text-sm text-gray-500 mt-1">
                            {option.description}
                          </p>
                        </div>
                        <svg 
                          className={`w-5 h-5 ${colors.text} group-hover:text-gray-900 group-hover:translate-x-1 transition-all duration-200`}
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Quick Stats Section */}
        <div className="mt-12 bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Stats</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">-</div>
              <div className="text-gray-600">Active Users</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">-</div>
              <div className="text-gray-600">Upload Batches</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">-</div>
              <div className="text-gray-600">Total Questions</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600 mb-2">-</div>
              <div className="text-gray-600">Pending Reviews</div>
            </div>
          </div>
          <p className="text-sm text-gray-500 text-center mt-4">
            Statistics will be loaded dynamically based on current system data
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;