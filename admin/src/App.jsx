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
import { useAuth } from './context/AuthContext';

function ProtectedAdminLayout() {
  const { user, loading, logout } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="min-h-screen bg-gray-950 text-gray-300 grid place-items-center">Loading administrator session…</div>;
  }
  if (!user || user.role !== 'admin') {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  }
  if (!user.adminPermissions?.length) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-200 grid place-items-center p-6">
        <div className="max-w-md text-center space-y-2">
          <h1 className="text-lg font-bold">Admin access not assigned</h1>
          <p className="text-sm text-gray-400">Ask a super administrator to assign the permission scopes needed for your role.</p>
          <button onClick={logout} className="btn-secondary text-xs mt-3">Sign out</button>
        </div>
      </div>
    );
  }
  return <AdminLayout />;
}

function RequireAdminScope({ scope, anyScopes = [], children }) {
  const { user } = useAuth();
  const grants = user?.adminPermissions || [];
  const allowed = grants.includes('super_admin') || (scope ? grants.includes(scope) : anyScopes.some((grant) => grants.includes(grant)));
  if (!allowed) {
    return (
      <div className="rounded-2xl border border-amber-800/60 bg-amber-950/30 p-6 text-sm text-amber-200" role="alert">
        Your administrator account does not have access to this workflow.
      </div>
    );
  }
  return children;
}

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
      <Route element={<ProtectedAdminLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/users" element={<RequireAdminScope scope="support"><AdminUsersPage /></RequireAdminScope>} />
        <Route path="/verifications" element={<RequireAdminScope scope="verification"><AdminVerificationsPage /></RequireAdminScope>} />
        <Route path="/review-queue" element={<RequireAdminScope anyScopes={['support', 'verification', 'safety', 'disputes', 'audit']}><AdminReviewQueuePage /></RequireAdminScope>} />
        <Route path="/safety" element={<RequireAdminScope scope="safety"><AdminSafetyPage /></RequireAdminScope>} />
        <Route path="/disputes" element={<RequireAdminScope scope="disputes"><AdminDisputesPage /></RequireAdminScope>} />
        <Route path="/taxonomy" element={<RequireAdminScope scope="config"><AdminTaxonomyPage /></RequireAdminScope>} />
        <Route path="/audit-logs" element={<RequireAdminScope scope="audit"><AdminAuditLogsPage /></RequireAdminScope>} />
      </Route>

      {/* Legacy Route Aliases & Fallbacks */}
      <Route path="/admin/*" element={<LegacyAdminRedirect />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
