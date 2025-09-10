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
import ExamSetup from './pages/ExamSetup';
import MyReturnedQuestions from './pages/MyReturnedQuestions';
import BatchManagement from './pages/BatchManagement';
import BatchDetails from './pages/BatchDetails';
import AdminDashboard from './pages/AdminDashboard';

const AppContent: React.FC = () => {
  const { user, logout, isAdmin, isReviewer } = useAuth();

  return (
    <div className="App">
      <nav className="navbar">
        <div className="nav-container">
          <h1>TOE Question Bank</h1>
          <div className="nav-links">
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
                  Review Questions
                </Link>
                <Link to="/create-question" className="nav-dropdown-item">
                  <span className="nav-dropdown-icon">✏️</span>
                  Create Question
                </Link>
                <Link to="/upload" className="nav-dropdown-item">
                  <span className="nav-dropdown-icon">📤</span>
                  Upload Questions
                </Link>
                <Link to="/my-returned-questions" className="nav-dropdown-item">
                  <span className="nav-dropdown-icon">↩️</span>
                  My Returned Questions
                </Link>
              </div>
            </div>
            
            <Link to="/practice">Practice Test</Link>
            <Link to="/take-exam">Take Exam</Link>
            <Link to="/images">Image Library</Link>
            <Link to="/needed-images">Needed Images</Link>
            {(isReviewer || isAdmin) && <Link to="/reviewer/dashboard">Review Queue</Link>}
            {isAdmin && <Link to="/admin">Admin Dashboard</Link>}
          </div>
          <div className="nav-user">
            <span className="welcome-text">Welcome, {user?.username}!</span>
            <button onClick={logout} className="logout-button">
              Logout
            </button>
          </div>
        </div>
      </nav>
      
      <main className="main-content">
        <Routes>
          <Route path="/" element={<QuestionReview />} />
          <Route path="/practice" element={<PracticeTest />} />
          <Route path="/take-exam" element={<ExamSetup />} />
          <Route path="/create-question" element={<QuestionEditor />} />
          <Route path="/edit-question/:id" element={<QuestionEditor />} />
          <Route path="/question/:id" element={<QuestionView />} />
          <Route path="/upload" element={<FileUpload />} />
          <Route path="/images" element={<ImageLibrary />} />
          <Route path="/needed-images" element={<NeededImages />} />
          <Route path="/my-returned-questions" element={<MyReturnedQuestions />} />
          <Route path="/reviewer/dashboard" element={<ReviewerDashboard />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<AdminUserPanel />} />
          <Route path="/admin/batches" element={<BatchManagement />} />
          <Route path="/admin/batches/:id" element={<BatchDetails />} />
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
