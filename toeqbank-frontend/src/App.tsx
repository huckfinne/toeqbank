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

const AppContent: React.FC = () => {
  const { user, logout, isAdmin, isReviewer } = useAuth();

  return (
    <div className="App">
      <nav className="navbar">
        <div className="nav-container">
          <h1>TOE Question Bank</h1>
          <div className="nav-links">
            <Link to="/">Review Questions</Link>
            <Link to="/practice">Practice Test</Link>
            <Link to="/take-exam">Take Exam</Link>
            <Link to="/create-question">Create Question</Link>
            <Link to="/upload">Upload Questions</Link>
            <Link to="/images">Image Library</Link>
            <Link to="/needed-images">Needed Images</Link>
            <Link to="/my-returned-questions">My Returned Questions</Link>
            {(isReviewer || isAdmin) && <Link to="/reviewer/dashboard">Review Queue</Link>}
            {isAdmin && <Link to="/admin/users">Admin Panel</Link>}
            {isAdmin && <Link to="/admin/batches">Batch Management</Link>}
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
