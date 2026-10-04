import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import AdminLayout from './components/layout/AdminLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminVerificationsPage from './pages/AdminVerificationsPage';
import AdminReviewQueuePage from './pages/AdminReviewQueuePage';
import AdminSafetyPage from './pages/AdminSafetyPage';
import AdminDisputesPage from './pages/AdminDisputesPage';
import AdminTaxonomyPage from './pages/AdminTaxonomyPage';
import AdminAuditLogsPage from './pages/AdminAuditLogsPage';

function LegacyAdminRedirect() {
  const location = useLocation();
  const targetPath = location.pathname.replace(/^\/admin/, '') || '/';
  return <Navigate to={`${targetPath}${location.search}`} replace />;
}

export default function App() {
  return (
    <Routes>
      {/* Public Admin Gateway Login */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected Admin Command Center Routes */}
      <Route element={<AdminLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/users" element={<AdminUsersPage />} />
        <Route path="/verifications" element={<AdminVerificationsPage />} />
        <Route path="/review-queue" element={<AdminReviewQueuePage />} />
        <Route path="/safety" element={<AdminSafetyPage />} />
        <Route path="/disputes" element={<AdminDisputesPage />} />
        <Route path="/taxonomy" element={<AdminTaxonomyPage />} />
        <Route path="/audit-logs" element={<AdminAuditLogsPage />} />
      </Route>

      {/* Legacy Route Aliases & Fallbacks */}
      <Route path="/admin/*" element={<LegacyAdminRedirect />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
