import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './App.css';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import QuestionReview from './pages/QuestionReview';
import PracticeTest from './pages/PracticeTest';
import FileUpload from './components/FileUpload';
import ImageLibrary from './pages/ImageLibrary';
import NeededImages from './pages/NeededImages';
import QuestionEditor from './pages/QuestionEditor';
import QuestionView from './pages/QuestionView';
import AdminUserPanel from './components/AdminUserPanel';
import ReviewerDashboard from './pages/ReviewerDashboard';
import ReviewImages from './pages/ReviewImages';
import MyReturnedQuestions from './pages/MyReturnedQuestions';
import BatchManagement from './pages/BatchManagement';
import BatchDetails from './pages/BatchDetails';
import AdminDashboard from './pages/AdminDashboard';
import AIManipulation from './pages/AIManipulation';
import AIGenerateQuestions from './pages/AIGenerateQuestions';
import GenerateQuestionsFromImages from './pages/GenerateQuestionsFromImages';
import ImageView from './pages/ImageView';
import UserSettings from './pages/UserSettings';
import MyContributions from './pages/MyContributions';

const AppContent: React.FC = () => {
  const { user, logout, isAdmin, isReviewer } = useAuth();
  
  // Check if user is ONLY an image contributor (no admin or reviewer privileges)
  const isOnlyImageContributor = user && user.is_image_contributor === true && !user.is_admin && !user.is_reviewer;
  
  // Dynamic title based on user's exam category
  const getNavbarTitle = () => {
    if (!user) return 'Question Bank';
    
    const examCategory = user.exam_category?.toLowerCase();
    if (examCategory === 'usmle') {
      return 'USMLE Question Bank';
    } else if (examCategory === 'echocardiography' || examCategory === 'echo') {
      return 'Echo Question Bank';
    } else {
      return 'TOE Question Bank'; // Fallback for backward compatibility
    }
  };

  return (
    <div className="App">
      <nav className="navbar">
        <div className="nav-container">
          <h1>{getNavbarTitle()}</h1>
          <div className="nav-links">
            {/* Hide Questions dropdown and Question Bank for users who are ONLY image contributors */}
            {!isOnlyImageContributor && (
              <>
                {/* Questions Dropdown */}
                <div className="nav-dropdown">
                  <span className="nav-dropdown-trigger">
                    Questions
                    <svg className="nav-dropdown-arrow" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M8 10.5L4 6.5h8l-4 4z"/>
                    </svg>
                  </span>
                  <div className="nav-dropdown-menu">
                    <Link to="/" className="nav-dropdown-item">
                      <span className="nav-dropdown-icon">📖</span>
                      <div className="nav-dropdown-content">
                        <span className="nav-dropdown-title">Browse Questions</span>
                        <span className="nav-dropdown-description">Browse and review existing questions</span>
                      </div>
                    </Link>
                    <Link to="/create-question" className="nav-dropdown-item">
                      <span className="nav-dropdown-icon">✏️</span>
                      <div className="nav-dropdown-content">
                        <span className="nav-dropdown-title">Create Question</span>
                        <span className="nav-dropdown-description">Add new questions to the database</span>
                      </div>
                    </Link>
                    <Link to="/upload" className="nav-dropdown-item">
                      <span className="nav-dropdown-icon">📤</span>
                      <div className="nav-dropdown-content">
                        <span className="nav-dropdown-title">Upload Questions</span>
                        <span className="nav-dropdown-description">Bulk import questions via CSV file</span>
                      </div>
                    </Link>
                    <Link to="/my-returned-questions" className="nav-dropdown-item">
                      <span className="nav-dropdown-icon">↩️</span>
                      <div className="nav-dropdown-content">
                        <span className="nav-dropdown-title">My Returned Questions</span>
                        <span className="nav-dropdown-description">Questions needing your attention</span>
                      </div>
                    </Link>
                    {isAdmin && (
                      <>
                        <Link to="/ai-generate-questions" className="nav-dropdown-item">
                          <span className="nav-dropdown-icon">🤖</span>
                          <div className="nav-dropdown-content">
                            <span className="nav-dropdown-title">AI Generate Questions from Images</span>
                            <span className="nav-dropdown-description">Generate questions using AI from uploaded images</span>
                          </div>
                        </Link>
                        <Link to="/generate-questions-from-images" className="nav-dropdown-item">
                          <span className="nav-dropdown-icon">🎯</span>
                          <div className="nav-dropdown-content">
                            <span className="nav-dropdown-title">Generate Questions from Images</span>
                            <span className="nav-dropdown-description">Create questions from selected image collections</span>
                          </div>
                        </Link>
                      </>
                    )}
                  </div>
                </div>
                
                <Link to="/practice">Question Bank</Link>
              </>
            )}
            
            <Link to="/images">Image Library</Link>
            <Link to="/needed-images">Needed Images</Link>
            
            {/* Review Dropdown for Reviewers */}
            {(isReviewer || isAdmin) && (
              <div className="nav-dropdown">
                <span className="nav-dropdown-trigger">
                  Review
                  <svg className="nav-dropdown-arrow" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M8 10.5L4 6.5h8l-4 4z"/>
                  </svg>
                </span>
                <div className="nav-dropdown-menu">
                  <Link to="/reviewer/dashboard" className="nav-dropdown-item">
                    <span className="nav-dropdown-icon">📝</span>
                    <div className="nav-dropdown-content">
                      <span className="nav-dropdown-title">Review Questions</span>
                      <span className="nav-dropdown-description">Review and approve submitted questions</span>
                    </div>
                  </Link>
                  <Link to="/reviewer/images" className="nav-dropdown-item">
                    <span className="nav-dropdown-icon">🖼️</span>
                    <div className="nav-dropdown-content">
                      <span className="nav-dropdown-title">Review Images</span>
                      <span className="nav-dropdown-description">Review and manage uploaded images</span>
                    </div>
                  </Link>
                </div>
              </div>
            )}
            
            {/* Admin Dropdown */}
            {isAdmin && (
              <div className="nav-dropdown">
                <span className="nav-dropdown-trigger">
                  Admin
                  <svg className="nav-dropdown-arrow" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M8 10.5L4 6.5h8l-4 4z"/>
                  </svg>
                </span>
                <div className="nav-dropdown-menu">
                  <Link to="/admin" className="nav-dropdown-item">
                    <span className="nav-dropdown-icon">🏠</span>
                    <div className="nav-dropdown-content">
                      <span className="nav-dropdown-title">Admin Dashboard</span>
                      <span className="nav-dropdown-description">System overview and administration hub</span>
                    </div>
                  </Link>
                  <Link to="/admin/users" className="nav-dropdown-item">
                    <span className="nav-dropdown-icon">👥</span>
                    <div className="nav-dropdown-content">
                      <span className="nav-dropdown-title">User Management</span>
                      <span className="nav-dropdown-description">Manage users, roles, and permissions</span>
                    </div>
                  </Link>
                  <Link to="/admin/batches" className="nav-dropdown-item">
                    <span className="nav-dropdown-icon">📦</span>
                    <div className="nav-dropdown-content">
                      <span className="nav-dropdown-title">Batch Management</span>
                      <span className="nav-dropdown-description">Manage upload batches and bulk operations</span>
                    </div>
                  </Link>
                  <Link to="/admin/ai" className="nav-dropdown-item">
                    <span className="nav-dropdown-icon">🤖</span>
                    <div className="nav-dropdown-content">
                      <span className="nav-dropdown-title">AI Manipulation</span>
                      <span className="nav-dropdown-description">AI-powered question analysis and enhancement tools</span>
                    </div>
                  </Link>
                </div>
              </div>
            )}
          </div>
          <div className="nav-user">
            <div className="nav-dropdown">
              <span className="nav-dropdown-trigger">
                {user?.username}
                <svg className="nav-dropdown-arrow" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M8 10.5L4 6.5h8l-4 4z"/>
                </svg>
              </span>
              <div className="nav-dropdown-menu">
                <Link 
                  to="/my-contributions" 
                  className="nav-dropdown-item"
                >
                  <span className="nav-dropdown-icon">📊</span>
                  <div className="nav-dropdown-content">
                    <span className="nav-dropdown-title">My Contributions</span>
                    <span className="nav-dropdown-description">View your submitted content</span>
                  </div>
                </Link>
                <Link 
                  to="/settings" 
                  className="nav-dropdown-item"
                >
                  <span className="nav-dropdown-icon">⚙️</span>
                  <div className="nav-dropdown-content">
                    <span className="nav-dropdown-title">Settings</span>
                    <span className="nav-dropdown-description">Manage your account</span>
                  </div>
                </Link>
                <button 
                  onClick={logout} 
                  className="nav-dropdown-item logout-item"
                >
                  <span className="nav-dropdown-icon">🚪</span>
                  <div className="nav-dropdown-content">
                    <span className="nav-dropdown-title">Logout</span>
                    <span className="nav-dropdown-description">Sign out of your account</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>
      
      <main className="main-content">
        <Routes>
          <Route path="/" element={<ProtectedRoute><QuestionReview /></ProtectedRoute>} />
          <Route path="/practice" element={<ProtectedRoute><PracticeTest /></ProtectedRoute>} />
          <Route path="/create-question" element={<ProtectedRoute><QuestionEditor /></ProtectedRoute>} />
          <Route path="/edit-question/:id" element={<ProtectedRoute><QuestionEditor /></ProtectedRoute>} />
          <Route path="/question/:id" element={<ProtectedRoute><QuestionView /></ProtectedRoute>} />
          <Route path="/upload" element={<ProtectedRoute><FileUpload /></ProtectedRoute>} />
          <Route path="/images" element={<ProtectedRoute><ImageLibrary /></ProtectedRoute>} />
          <Route path="/needed-images" element={<ProtectedRoute><NeededImages /></ProtectedRoute>} />
          <Route path="/my-returned-questions" element={<ProtectedRoute><MyReturnedQuestions /></ProtectedRoute>} />
          <Route path="/reviewer/dashboard" element={<ProtectedRoute><ReviewerDashboard /></ProtectedRoute>} />
          <Route path="/reviewer/images" element={<ProtectedRoute><ReviewImages /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute><AdminUserPanel /></ProtectedRoute>} />
          <Route path="/admin/batches" element={<ProtectedRoute><BatchManagement /></ProtectedRoute>} />
          <Route path="/admin/batches/:id" element={<ProtectedRoute><BatchDetails /></ProtectedRoute>} />
          <Route path="/admin/ai" element={<ProtectedRoute><AIManipulation /></ProtectedRoute>} />
          <Route path="/ai-generate-questions" element={<ProtectedRoute><AIGenerateQuestions /></ProtectedRoute>} />
          <Route path="/generate-questions-from-images" element={<ProtectedRoute><GenerateQuestionsFromImages /></ProtectedRoute>} />
          <Route path="/image/:id" element={<ProtectedRoute><ImageView /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><UserSettings /></ProtectedRoute>} />
          <Route path="/my-contributions" element={<MyContributions />} />
        </Routes>
      </main>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <ProtectedRoute>
          <AppContent />
        </ProtectedRoute>
      </Router>
    </AuthProvider>
  );
}

export default App;
