import { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import { ProtectedRoute, GuestRoute } from './components/auth/ProtectedRoute';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import ItemsPage from './pages/items/ItemsPage';
import NewItemPage from './pages/items/NewItemPage';
import EditItemPage from './pages/items/EditItemPage';
import RepairRequestsPage from './pages/repairs/RepairRequestsPage';
import RepairRequestDetailPage from './pages/repairs/RepairRequestDetailPage';
import RepairRequestMatchesPage from './pages/repairs/RepairRequestMatchesPage';
import NewRepairRequestPage from './pages/repairs/NewRepairRequestPage';
import RepairJobsPage from './pages/repairs/RepairJobsPage';
import DonationsPage from './pages/donations/DonationsPage';
import NewDonationPage from './pages/donations/NewDonationPage';
import ConversationsPage from './pages/messages/ConversationsPage';
import ProfilePage from './pages/profile/ProfilePage';
import TechnicianProfilePage from './pages/profile/TechnicianProfilePage';
import TechniciansPage from './pages/profile/TechniciansPage';
import UserProfilePage from './pages/profile/UserProfilePage';
import OrganizationProfilePage from './pages/profile/OrganizationProfilePage';
import NotificationsPage from './pages/notifications/NotificationsPage';
import RepairRequestMessagesPage from './pages/repairs/RepairRequestMessagesPage';
import ForumPage from './pages/forum/ForumPage';
import ThreadDetailPage from './pages/forum/ThreadDetailPage';
import NewThreadPage from './pages/forum/NewThreadPage';

function AdminRedirectGateway() {
  const location = useLocation();
  const adminBaseUrl = import.meta.env.VITE_ADMIN_URL || 'http://localhost:5174';

  useEffect(() => {
    const subpath = location.pathname.replace(/^\/admin/, '') || '/';
    const destination = `${adminBaseUrl}${subpath}${location.search}`;
    window.location.href = destination;
  }, [adminBaseUrl, location]);

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
    <Routes>
      {/* Standalone Admin Portal Redirect Gateway */}
      <Route path="/admin/*" element={<AdminRedirectGateway />} />
      <Route path="/admin" element={<AdminRedirectGateway />} />

      {/* Main Public & User Layout */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<LandingPage />} />

        <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
        <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />

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

        {/* Repair Jobs */}
        <Route path="/repair-jobs" element={<ProtectedRoute><RepairJobsPage /></ProtectedRoute>} />

        {/* Donations */}
        <Route path="/donations" element={<ProtectedRoute><DonationsPage /></ProtectedRoute>} />
        <Route path="/donations/new" element={<ProtectedRoute><NewDonationPage /></ProtectedRoute>} />

        {/* Messages */}
        <Route path="/messages" element={<ProtectedRoute><ConversationsPage /></ProtectedRoute>} />

        {/* 404 */}
        <Route path="*" element={
          <div className="page-container text-center py-24">
            <h1 className="text-6xl font-black text-gray-200">404</h1>
            <p className="text-lg text-gray-500 mt-4">Page not found</p>
            <a href="/" className="btn-primary mt-6 inline-flex">Go Home</a>
          </div>
        } />
      </Route>
    </Routes>
  );
}
