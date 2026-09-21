// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ROLE } from '@/constants/roles';
import { TEACHER_ROUTES, STUDENT_ROUTES } from '@/constants/routes';
import Loading from '@/components/common/Loading';

import LoginPage from '@/pages/LoginPage';
import TeacherLayout from '@/layouts/TeacherLayout';
import StudentLayout from '@/layouts/StudentLayout';

// Teacher pages
import DashboardPage from '@/pages/teacher/DashboardPage';
import StudentsPage from '@/pages/teacher/StudentsPage';
import TuitionPage from '@/pages/teacher/TuitionPage';
import StreakManagerPage from '@/pages/teacher/StreakManagerPage';
import AssignmentsPage from '@/pages/teacher/AssignmentsPage';
import VocabularyPage from '@/pages/teacher/VocabularyPage';
import GrammarPage from '@/pages/teacher/GrammarPage';
import ListeningPage from '@/pages/teacher/ListeningPage';
import VocabularyReviewPage from '@/pages/teacher/VocabularyReviewPage';
import TeacherDocumentsPage from '@/pages/teacher/DocumentsPage';

// Student pages
import AssignmentPage from '@/pages/student/AssignmentPage';
import HomePage from '@/pages/student/HomePage';
import HomeworkPage from '@/pages/student/HomeworkPage';
import StudentVocabularyPage from '@/pages/student/VocabularyPage';
import StudentGrammarPage from '@/pages/student/GrammarPage';
import SummaryPage from '@/pages/student/SummaryPage';
import StudentTuitionPage from '@/pages/student/TuitionPage';
import DocumentsPage from '@/pages/student/DocumentsPage';
import ProfilePage from '@/pages/student/ProfilePage';


function ProtectedRoute({ children, allowedRole }) {
  const { profile, loading } = useAuth();
  if (loading) return <Loading fullPage text="Đang kiểm tra đăng nhập..." />;
  if (!profile) return <Navigate to="/login" replace />;
  if (profile.role !== allowedRole) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const { profile, loading } = useAuth();

  if (loading) return <Loading fullPage />;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        {/* Teacher */}
        <Route
          path="/teacher"
          element={
            <ProtectedRoute allowedRole={ROLE.TEACHER}>
              <TeacherLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to={TEACHER_ROUTES.DASHBOARD} replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="students" element={<StudentsPage />} />
          <Route path="tuition" element={<TuitionPage />} />
          <Route path="streak-manager" element={<StreakManagerPage />} />
          <Route path="assignments" element={<AssignmentsPage />} />
          <Route path="vocabulary" element={<VocabularyPage />} />
          <Route path="grammar" element={<GrammarPage />} />
          <Route path="listening" element={<ListeningPage />} />
          <Route path="vocabulary-review" element={<VocabularyReviewPage />} />
          <Route path="documents" element={<TeacherDocumentsPage />} />
        </Route>

        {/* Student */}
        <Route
          path="/student"
          element={
            <ProtectedRoute allowedRole={ROLE.STUDENT}>
              <StudentLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to={STUDENT_ROUTES.HOME} replace />} />
          <Route path="home" element={<HomePage />} />
          <Route path="homework" element={<HomeworkPage />} />
          <Route path="assignment/:id" element={<AssignmentPage />} />
          <Route path="vocabulary" element={<StudentVocabularyPage />} />
          <Route path="grammar" element={<StudentGrammarPage />} />
          <Route path="summary" element={<SummaryPage />} />
          <Route path="tuition" element={<StudentTuitionPage />} />
          <Route path="documents" element={<DocumentsPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        {/* Fallback */}
        <Route
          path="*"
          element={
            profile?.role === ROLE.TEACHER
              ? <Navigate to={TEACHER_ROUTES.DASHBOARD} replace />
              : profile?.role === ROLE.STUDENT
              ? <Navigate to={STUDENT_ROUTES.HOME} replace />
              : <Navigate to="/login" replace />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}