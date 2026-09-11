import { Routes, Route } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import AdminLayout from './components/layout/AdminLayout';
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
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminVerificationsPage from './pages/admin/AdminVerificationsPage';
import AdminSafetyPage from './pages/admin/AdminSafetyPage';
import AdminReviewQueuePage from './pages/admin/AdminReviewQueuePage';
import AdminDisputesPage from './pages/admin/AdminDisputesPage';
import AdminTaxonomyPage from './pages/admin/AdminTaxonomyPage';
import AdminAuditLogsPage from './pages/admin/AdminAuditLogsPage';
import RepairRequestMessagesPage from './pages/repairs/RepairRequestMessagesPage';
import ForumPage from './pages/forum/ForumPage';
import ThreadDetailPage from './pages/forum/ThreadDetailPage';
import NewThreadPage from './pages/forum/NewThreadPage';

export default function App() {
  return (
    <Routes>
      {/* Admin Command Center & Workspaces (Dedicated Left-Side Panel Layout) */}
      <Route
        element={
          <ProtectedRoute roles={['admin']}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/admin" element={<DashboardPage />} />
        <Route path="/admin/review-queue" element={<AdminReviewQueuePage />} />
        <Route path="/admin/users" element={<AdminUsersPage />} />
        <Route path="/admin/verifications" element={<AdminVerificationsPage />} />
        <Route path="/admin/safety" element={<AdminSafetyPage />} />
        <Route path="/admin/disputes" element={<AdminDisputesPage />} />
        <Route path="/admin/taxonomy" element={<AdminTaxonomyPage />} />
        <Route path="/admin/audit-logs" element={<AdminAuditLogsPage />} />
        <Route path="/admin/repair-requests" element={<RepairRequestsPage />} />
        <Route path="/admin/donations" element={<DonationsPage />} />
      </Route>

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
