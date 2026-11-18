import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import { ProtectedRoute, GuestRoute } from './components/auth/ProtectedRoute';
import { useAuth } from './context/AuthContext';
import api from './api/axios';

// Load page code only when a route is visited to keep the initial bundle small.
const LandingPage = lazy(() => import('./pages/LandingPage'));
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));
const VerifyEmailPage = lazy(() => import('./pages/auth/VerifyEmailPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'));
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'));
const ItemsPage = lazy(() => import('./pages/items/ItemsPage'));
const NewItemPage = lazy(() => import('./pages/items/NewItemPage'));
const EditItemPage = lazy(() => import('./pages/items/EditItemPage'));
const RepairRequestsPage = lazy(() => import('./pages/repairs/RepairRequestsPage'));
const RepairRequestDetailPage = lazy(() => import('./pages/repairs/RepairRequestDetailPage'));
const RepairRequestMatchesPage = lazy(() => import('./pages/repairs/RepairRequestMatchesPage'));
const NewRepairRequestPage = lazy(() => import('./pages/repairs/NewRepairRequestPage'));
const RepairJobsPage = lazy(() => import('./pages/repairs/RepairJobsPage'));
const DonationsPage = lazy(() => import('./pages/donations/DonationsPage'));
const NewDonationPage = lazy(() => import('./pages/donations/NewDonationPage'));
const ConversationsPage = lazy(() => import('./pages/messages/ConversationsPage'));
const ProfilePage = lazy(() => import('./pages/profile/ProfilePage'));
const TechnicianProfilePage = lazy(() => import('./pages/profile/TechnicianProfilePage'));
const TechnicianBusinessPage = lazy(() => import('./pages/technician/TechnicianBusinessPage'));
const TechniciansPage = lazy(() => import('./pages/profile/TechniciansPage'));
const UserProfilePage = lazy(() => import('./pages/profile/UserProfilePage'));
const OrganizationProfilePage = lazy(() => import('./pages/profile/OrganizationProfilePage'));
const NotificationsPage = lazy(() => import('./pages/notifications/NotificationsPage'));
const RepairRequestMessagesPage = lazy(() => import('./pages/repairs/RepairRequestMessagesPage'));
const ForumPage = lazy(() => import('./pages/forum/ForumPage'));
const ThreadDetailPage = lazy(() => import('./pages/forum/ThreadDetailPage'));
const NewThreadPage = lazy(() => import('./pages/forum/NewThreadPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

function AdminRedirectGateway() {
  const location = useLocation();
  const { user } = useAuth();
  const getAdminBaseUrl = () => {
    const envUrl = import.meta.env.VITE_ADMIN_URL;
    if (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')) {
      if (!envUrl || envUrl.includes('admin.fixtogether.com') || envUrl.includes('localhost')) {
        return 'https://fixtogether-admin.vercel.app';
      }
    }
    if (envUrl && !envUrl.includes('admin.fixtogether.com')) {
      return envUrl;
    }
    return 'http://localhost:5174';
  };

  const adminBaseUrl = getAdminBaseUrl();

  useEffect(() => {
    const subpath = location.pathname.replace(/^\/admin/, '') || '/';
    const launchAdmin = async () => {
      if (user?.role === 'admin') {
        try {
          const { data } = await api.post('/auth/sso-ticket');
          const ticket = data?.data?.ticket;
          if (ticket) {
            const separator = location.search ? '&' : '?';
            window.location.href = `${adminBaseUrl}${subpath}${location.search}${separator}sso_ticket=${ticket}`;
            return;
          }
        } catch {
          // Fall back to direct navigation
        }
      }
      window.location.href = `${adminBaseUrl}${subpath}${location.search}`;
    };

    launchAdmin();
  }, [adminBaseUrl, location, user]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-950 text-white text-center">
      <div className="w-14 h-14 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center mb-4 shadow-lg shadow-purple-500/10">
        <span className="text-2xl animate-spin">⚙️</span>
      </div>
      <h1 className="text-xl font-bold mb-2 tracking-tight">Redirecting to FixTogether Admin Command Center</h1>
      <p className="text-xs text-gray-400 max-w-md mb-6 leading-relaxed">
        The Administrator workspace is hosted at a dedicated web address:{' '}
        <span className="text-purple-400 font-mono font-semibold">{adminBaseUrl}</span>
      </p>
      <a
        href={adminBaseUrl}
        className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-md active:scale-95"
      >
        Open Admin Portal Now &rarr;
      </a>
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<div className="page-container py-16 text-center">Loading page…</div>}>
    <Routes>
      {/* Standalone Admin Portal Redirect Gateway */}
      <Route path="/admin/*" element={<AdminRedirectGateway />} />
      <Route path="/admin" element={<AdminRedirectGateway />} />

      {/* Main Public & User Layout */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<LandingPage />} />

        <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
        <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/forgot-password" element={<GuestRoute><ForgotPasswordPage /></GuestRoute>} />
        <Route path="/reset-password" element={<GuestRoute><ResetPasswordPage /></GuestRoute>} />

        {/* Public profile and directory routes — accessible by anyone */}
        <Route path="/technicians" element={<TechniciansPage />} />
        <Route path="/technicians/:id" element={<TechnicianProfilePage />} />
        <Route path="/organizations/:id" element={<OrganizationProfilePage />} />
        <Route path="/users/:id" element={<UserProfilePage />} />

        {/* Community Forum & Threaded Q&A */}
        <Route path="/forum" element={<ForumPage />} />
        <Route path="/forum/new" element={<ProtectedRoute><NewThreadPage /></ProtectedRoute>} />
        <Route path="/forum/:id" element={<ThreadDetailPage />} />

        {/* Authenticated routes */}
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />

        {/* Items */}
        <Route path="/items" element={<ProtectedRoute><ItemsPage /></ProtectedRoute>} />
        <Route path="/items/new" element={<ProtectedRoute><NewItemPage /></ProtectedRoute>} />
        <Route path="/items/:id/edit" element={<ProtectedRoute><EditItemPage /></ProtectedRoute>} />

        {/* Repair Requests */}
        <Route path="/repair-requests" element={<ProtectedRoute><RepairRequestsPage /></ProtectedRoute>} />
        <Route path="/repair-requests/new" element={<ProtectedRoute><NewRepairRequestPage /></ProtectedRoute>} />
        <Route path="/repair-requests/:id" element={<ProtectedRoute><RepairRequestDetailPage /></ProtectedRoute>} />
        <Route path="/repair-requests/:id/matches" element={<ProtectedRoute><RepairRequestMatchesPage /></ProtectedRoute>} />
        <Route path="/repair-requests/:id/messages" element={<ProtectedRoute><RepairRequestMessagesPage /></ProtectedRoute>} />
        <Route path="/chat" element={<ProtectedRoute><RepairRequestMessagesPage /></ProtectedRoute>} />

        {/* Repair Jobs */}
        <Route path="/repair-jobs" element={<ProtectedRoute><RepairJobsPage /></ProtectedRoute>} />
        <Route path="/technician-business" element={<ProtectedRoute><TechnicianBusinessPage /></ProtectedRoute>} />

        {/* Donations */}
        <Route path="/donations" element={<ProtectedRoute><DonationsPage /></ProtectedRoute>} />
        <Route path="/donations/new" element={<ProtectedRoute><NewDonationPage /></ProtectedRoute>} />

        {/* Messages */}
        <Route path="/messages" element={<ProtectedRoute><ConversationsPage /></ProtectedRoute>} />

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
    </Suspense>
  );
}
