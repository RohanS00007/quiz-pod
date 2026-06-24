import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import QuizzLanding from "./components/QuizzLanding";
import AuthPage from "./components/AuthPage";
import StudentDashboardV2 from "./components/StudentDashboardV2";
import TeacherDashboard from "./components/TeacherDashboard";
import MistakeBook from './components/MistakeBook';
import StudentPerformanceMetrics from './components/StudentPerformanceMetrics';
import QuizArena from './components/QuizArena';
import TeacherFavouriteQuestions from './components/TeacherFavouriteQuestions';
import QuizDetail from './components/QuizDetail';
import QuizSubmissions from './components/QuizSubmissions';

import CreateQuiz from "./components/CreateQuiz";
import ProtectedRoute from "./components/ProtectedRoute";

function AppRoutes() {
  const { user, logout } = useAuth();

  const studentName = user?.name?.split(' ')[0] || 'Student';
  const studentLast = user?.name?.split(' ').slice(1).join(' ') || '';
  const teacherName = user?.name?.split(' ')[0] || 'Teacher';
  const teacherLast = user?.name?.split(' ').slice(1).join(' ') || '';

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  return (
    <Routes>
      <Route path="/" element={<QuizzLanding />} />
      <Route path="/auth" element={<AuthPage />} />

      {/* Student Routes */}
      <Route path="/student" element={
        <ProtectedRoute requiredRole="student" element={
          <StudentDashboardV2
            studentName={studentName}
            lastName={studentLast}
            streak={0}
            rank={0}
            onLogout={handleLogout}
          />
        } />
      } />
      <Route path="/mistakebook" element={
        <ProtectedRoute requiredRole="student" element={<MistakeBook />} />
      } />
      <Route path="/quizArena" element={
        <ProtectedRoute requiredRole="student" element={<QuizArena />} />
      } />
      <Route path="/student/performance" element={
        <ProtectedRoute requiredRole="student" element={<StudentPerformanceMetrics />} />
      } />
      <Route path="/student/quizdetail" element={
        <ProtectedRoute requiredRole="student" element={<QuizDetail />} />
      } />

      {/* Teacher Routes */}
      <Route path="/teacher" element={
        <ProtectedRoute requiredRole="teacher" element={
          <TeacherDashboard
            teacherName={teacherName}
            lastName={teacherLast}
            onLogout={handleLogout}
          />
        } />
      } />
      <Route
        path="/teacher/create-quiz"
        element={<Navigate to="/teacher" state={{ openCreate: true }} replace />}
      />
      <Route
        path="/teacher/quiz/:id/submissions"
        element={<ProtectedRoute requiredRole="teacher" element={<QuizSubmissions />} />}
      />
      <Route
        path="/teacher/favourites"
        element={<Navigate to="/teacher" state={{ activeNav: 'favourites' }} replace />}
      />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
