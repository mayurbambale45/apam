import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext, AuthProvider } from './context/AuthContext';
import { Toaster } from 'sonner';

// Public Pages
import Login from './pages/Login';
import Register from './pages/Register';

// Layout
import DashboardLayout from './components/layout/DashboardLayout';

// Instructor Pages
import ManageExams from './pages/instructor/ManageExams';
import InstructorRubrics from './pages/instructor/InstructorRubrics';
import EvaluationResults from './pages/instructor/EvaluationResults';
import UploadAnswerKey from './pages/instructor/UploadAnswerKey';
import TeacherDashboard from './pages/instructor/TeacherDashboard';
import TeacherSubmissions from './pages/instructor/TeacherSubmissions';
import TeacherAnalytics from './pages/instructor/TeacherAnalytics';

// Exam System Pages
import ExamCoordinatorDashboard from './pages/examination_system/ExamCoordinatorDashboard';
import UploadSubmissions from './pages/examination_system/UploadSubmissions';
import BulkUpload from './pages/examination_system/BulkUpload';
import PipelineMonitor from './pages/examination_system/PipelineMonitor';

// Student Pages
import StudentDashboard from './pages/student/StudentDashboard';
import StudentSubmissions from './pages/student/StudentSubmissions';
import StudentProfile from './pages/student/StudentProfile';
import FeedbackViewer from './components/student/FeedbackViewer';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUserManagement from './pages/admin/AdminUserManagement';
import AdminExamManagement from './pages/admin/AdminExamManagement';
import AdminSubmissions from './pages/admin/AdminSubmissions';

// Protected Route Wrapper
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
    const { token, user } = useContext(AuthContext);
    
    if (!token) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles.length > 0 && user && !allowedRoles.includes(user.role)) {
        // Redirect to a default dashboard if role is unauthorized for this route
        return <Navigate to={`/${user.role}-dashboard`} replace />;
    }
    
    return children;
};

const AppRoutes = () => {
    const { user } = useContext(AuthContext);

    return (
        <Router>
            <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                
                {/* 
                 * Dashboard Nested Routing 
                 * All routes within here share the persistent DashboardLayout (Sidebar + Header)
                 */}
                <Route path="/" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
                    
                    {/* Instructor Routes */}
                    <Route path="instructor/exams" element={
                        <ProtectedRoute allowedRoles={['teacher']}>
                            <ManageExams />
                        </ProtectedRoute>
                    } />
                    <Route path="instructor/answer-key" element={
                        <ProtectedRoute allowedRoles={['teacher']}>
                            <UploadAnswerKey />
                        </ProtectedRoute>
                    } />
                    <Route path="instructor/rubrics" element={
                        <ProtectedRoute allowedRoles={['teacher']}>
                            <InstructorRubrics />
                        </ProtectedRoute>
                    } />
                    <Route path="instructor/evaluations" element={
                        <ProtectedRoute allowedRoles={['teacher']}>
                            <EvaluationResults />
                        </ProtectedRoute>
                    } />
                    <Route path="instructor/submissions" element={
                        <ProtectedRoute allowedRoles={['teacher']}>
                            <TeacherSubmissions />
                        </ProtectedRoute>
                    } />
                    <Route path="instructor/dashboard" element={
                        <ProtectedRoute allowedRoles={['teacher']}>
                            <TeacherDashboard />
                        </ProtectedRoute>
                    } />
                    <Route path="instructor/analytics" element={
                        <ProtectedRoute allowedRoles={['teacher']}>
                            <TeacherAnalytics />
                        </ProtectedRoute>
                    } />

                    {/* Student Routes */}
                    <Route path="student/dashboard" element={
                        <ProtectedRoute allowedRoles={['student']}>
                            <StudentDashboard />
                        </ProtectedRoute>
                    } />
                    <Route path="student/submissions" element={
                        <ProtectedRoute allowedRoles={['student']}>
                            <StudentSubmissions />
                        </ProtectedRoute>
                    } />
                    <Route path="student/profile" element={
                        <ProtectedRoute allowedRoles={['student']}>
                            <StudentProfile />
                        </ProtectedRoute>
                    } />
                    
                    {/* Exam Coordinator Routes */}
                    <Route path="examination_system-dashboard" element={
                        <ProtectedRoute allowedRoles={['examination_system']}>
                            <ExamCoordinatorDashboard />
                        </ProtectedRoute>
                    } />
                    <Route path="examination_system/uploads" element={
                        <ProtectedRoute allowedRoles={['examination_system']}>
                            <UploadSubmissions />
                        </ProtectedRoute>
                    } />
                    <Route path="examination_system/bulk-upload" element={
                        <ProtectedRoute allowedRoles={['examination_system']}>
                            <BulkUpload />
                        </ProtectedRoute>
                    } />
                    <Route path="examination_system/pipeline" element={
                        <ProtectedRoute allowedRoles={['examination_system']}>
                            <PipelineMonitor />
                        </ProtectedRoute>
                    } />
                    
                    {/* Admin Dashboard */}
                    <Route path="administrator-dashboard" element={
                        <ProtectedRoute allowedRoles={['administrator']}>
                            <AdminDashboard />
                        </ProtectedRoute>
                    } />
                    <Route path="admin/users" element={
                        <ProtectedRoute allowedRoles={['administrator']}>
                            <AdminUserManagement />
                        </ProtectedRoute>
                    } />
                    <Route path="admin/exams" element={
                        <ProtectedRoute allowedRoles={['administrator']}>
                            <AdminExamManagement />
                        </ProtectedRoute>
                    } />
                    <Route path="admin/submissions" element={
                        <ProtectedRoute allowedRoles={['administrator']}>
                            <AdminSubmissions />
                        </ProtectedRoute>
                    } />
                    <Route path="admin/evaluations" element={
                        <ProtectedRoute allowedRoles={['administrator']}>
                            <EvaluationResults />
                        </ProtectedRoute>
                    } />
                    
                    {/* Legacy Redirects */}
                    <Route path="admin-dashboard" element={<Navigate to="/administrator-dashboard" replace />} />
                    <Route path="teacher-dashboard" element={<Navigate to="/instructor/dashboard" replace />} />
                    <Route path="student-dashboard" element={<Navigate to="/student/dashboard" replace />} />
                    
                    {/* Default Dashboard Redirection Base */}
                    <Route index element={
                        user ? <Navigate to={`/${user.role}-dashboard`} replace /> : <Navigate to="/login" replace />
                    } />
                </Route>

                {/* Catch-all */}
                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
        </Router>
    );
};

const App = () => {
    return (
        <AuthProvider>
            <Toaster position="top-right" richColors />
            <AppRoutes />
        </AuthProvider>
    );
};

export default App;
