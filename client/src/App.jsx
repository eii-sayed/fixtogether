import { Routes, Route } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import { ProtectedRoute, GuestRoute } from './components/auth/ProtectedRoute';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import ItemsPage from './pages/items/ItemsPage';
import NewItemPage from './pages/items/NewItemPage';
import RepairRequestsPage from './pages/repairs/RepairRequestsPage';
import RepairRequestDetailPage from './pages/repairs/RepairRequestDetailPage';
import NewRepairRequestPage from './pages/repairs/NewRepairRequestPage';
import RepairJobsPage from './pages/repairs/RepairJobsPage';
import DonationsPage from './pages/donations/DonationsPage';
import ConversationsPage from './pages/messages/ConversationsPage';
import ProfilePage from './pages/profile/ProfilePage';
import TechnicianProfilePage from './pages/profile/TechnicianProfilePage';
import NotificationsPage from './pages/notifications/NotificationsPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminVerificationsPage from './pages/admin/AdminVerificationsPage';
import AdminSafetyPage from './pages/admin/AdminSafetyPage';

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<LandingPage />} />

        <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
        <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />

        {/* Authenticated routes */}
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/technicians/:id" element={<ProtectedRoute><TechnicianProfilePage /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />

        {/* Items */}
        <Route path="/items" element={<ProtectedRoute roles={['owner']}><ItemsPage /></ProtectedRoute>} />
        <Route path="/items/new" element={<ProtectedRoute roles={['owner']}><NewItemPage /></ProtectedRoute>} />

        {/* Repair Requests */}
        <Route path="/repair-requests" element={<ProtectedRoute><RepairRequestsPage /></ProtectedRoute>} />
        <Route path="/repair-requests/new" element={<ProtectedRoute roles={['owner']}><NewRepairRequestPage /></ProtectedRoute>} />
        <Route path="/repair-requests/:id" element={<ProtectedRoute><RepairRequestDetailPage /></ProtectedRoute>} />

        {/* Repair Jobs */}
        <Route path="/repair-jobs" element={<ProtectedRoute><RepairJobsPage /></ProtectedRoute>} />

        {/* Donations */}
        <Route path="/donations" element={<ProtectedRoute><DonationsPage /></ProtectedRoute>} />

        {/* Messages */}
        <Route path="/messages" element={<ProtectedRoute><ConversationsPage /></ProtectedRoute>} />

        {/* Admin */}
        <Route path="/admin" element={<ProtectedRoute roles={['admin']}><DashboardPage /></ProtectedRoute>} />
        <Route path="/admin/users" element={<ProtectedRoute roles={['admin']}><AdminUsersPage /></ProtectedRoute>} />
        <Route path="/admin/verifications" element={<ProtectedRoute roles={['admin']}><AdminVerificationsPage /></ProtectedRoute>} />
        <Route path="/admin/safety" element={<ProtectedRoute roles={['admin']}><AdminSafetyPage /></ProtectedRoute>} />

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
