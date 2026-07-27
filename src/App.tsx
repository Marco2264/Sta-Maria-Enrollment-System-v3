import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { LoginPage } from './pages/auth/LoginPage';
import { LandingPage } from './pages/LandingPage';
import { SignUpPage } from './pages/auth/SignUpPage';
import { LoadingSpinner } from './components/ui/LoadingSpinner';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

const AdminDashboard = React.lazy(() => import('./pages/admin/AdminDashboard').then(module => ({ default: module.AdminDashboard })));
const TeacherDashboard = React.lazy(() => import('./pages/teacher/TeacherDashboard').then(module => ({ default: module.TeacherDashboard })));
const ParentPortal = React.lazy(() => import('./pages/parent/ParentPortal').then(module => ({ default: module.ParentPortal })));

export function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Toaster position="top-center" />
      <Suspense fallback={<div className="h-screen w-screen"><LoadingSpinner message="Loading School Portal..." /></div>}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/admin" element={<ProtectedRoute requiredRole={['admin', 'subadmin']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/teacher" element={<ProtectedRoute requiredRole="teacher"><TeacherDashboard /></ProtectedRoute>} />
          <Route path="/parent" element={<ProtectedRoute requiredRole="parent"><ParentPortal /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}