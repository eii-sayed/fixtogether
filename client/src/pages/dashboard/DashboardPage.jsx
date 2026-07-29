import { useAuth } from '../../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { StatCard, PageLoader, ErrorState, StatusBadge } from '../../components/ui';
import { Package, Wrench, ClipboardList, Heart, Plus, ArrowRight, Users, Shield, BarChart3, AlertTriangle, Cog } from 'lucide-react';

function OwnerDashboard() {
  const { data: items } = useQuery({ queryKey: ['my-items'], queryFn: () => api.get('/items?limit=5').then(r => r.data.data) });
  const { data: requests } = useQuery({ queryKey: ['my-requests'], queryFn: () => api.get('/repair-requests?limit=5').then(r => r.data.data) });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Owner Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your items and repair requests</p>
        </div>
        <Link to="/items/new" className="btn-primary"><Plus className="w-4 h-4" /> Add Item</Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="My Items" value={items?.pagination?.total || 0} icon={Package} color="primary" />
        <StatCard label="Active Requests" value={requests?.pagination?.total || 0} icon={Wrench} color="secondary" />
        <StatCard label="Donations" value="0" icon={Heart} color="warning" />
      </div>

      {/* Recent Requests */}
      <div className="card">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Recent Repair Requests</h2>
          <Link to="/repair-requests" className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
            View all <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="divide-y divide-gray-100">
          {requests?.repairRequests?.length > 0 ? requests.repairRequests.slice(0, 5).map((rr) => (
            <Link key={rr._id} to={`/repair-requests/${rr._id}`} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{rr.item?.title || 'Repair Request'}</p>
                <p className="text-xs text-gray-500 mt-0.5 truncate">{rr.problemDescription?.substring(0, 80)}...</p>
              </div>
              <StatusBadge status={rr.requestStatus} />
            </Link>
          )) : (
            <div className="py-10 text-center text-sm text-gray-500">
              No repair requests yet. <Link to="/items/new" className="text-primary-600 font-medium">Add an item</Link> to get started.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TechnicianDashboard() {
  const { data: jobs } = useQuery({ queryKey: ['my-jobs'], queryFn: () => api.get('/repair-jobs?limit=5').then(r => r.data.data) });
  const { data: requests } = useQuery({ queryKey: ['available-requests'], queryFn: () => api.get('/repair-requests?status=published&limit=5').then(r => r.data.data).catch(() => ({ repairRequests: [] })) });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Technician Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your repair jobs and quotations</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Active Jobs" value={jobs?.pagination?.total || 0} icon={Wrench} color="primary" />
        <StatCard label="Available Requests" value={requests?.repairRequests?.length || 0} icon={ClipboardList} color="secondary" />
        <StatCard label="Profile" value="Active" icon={Users} color="warning" />
      </div>

      <div className="card">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">My Repair Jobs</h2>
          <Link to="/repair-jobs" className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">View all <ArrowRight className="w-3.5 h-3.5" /></Link>
        </div>
        <div className="divide-y divide-gray-100">
          {jobs?.repairJobs?.length > 0 ? jobs.repairJobs.slice(0, 5).map((job) => (
            <Link key={job._id} to={`/repair-jobs/${job._id}`} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors">
              <div><p className="text-sm font-medium text-gray-900">Job #{job._id.slice(-6)}</p>
                <p className="text-xs text-gray-500 mt-0.5">Owner: {job.owner?.fullName}</p></div>
              <StatusBadge status={job.currentStatus} />
            </Link>
          )) : <div className="py-10 text-center text-sm text-gray-500">No active jobs yet.</div>}
        </div>
      </div>
    </div>
  );
}

function AdminDashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => api.get('/admin/dashboard').then(r => r.data.data),
  });

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} />;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Platform overview and management</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={data?.users?.total || 0} icon={Users} color="primary" />
        <StatCard label="Active Repairs" value={data?.repairRequests?.active || 0} icon={Wrench} color="secondary" />
        <StatCard label="Pending Verifications" value={(data?.pendingVerifications?.technicians || 0) + (data?.pendingVerifications?.organizations || 0)} icon={Shield} color="warning" />
        <StatCard label="Open Disputes" value={data?.disputes?.open || 0} icon={AlertTriangle} color="danger" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Completed Repairs" value={data?.repairRequests?.completed || 0} icon={Wrench} color="primary" />
        <StatCard label="Completed Donations" value={data?.donations?.completed || 0} icon={Heart} color="secondary" />
        <StatCard label="AI Analyses" value={data?.ai?.totalAnalyses || 0} icon={BarChart3} color="purple" />
        <StatCard label="Safety Flagged" value={data?.safetyFlagged || 0} icon={AlertTriangle} color="danger" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="px-5 py-4 border-b border-gray-100"><h2 className="font-semibold text-gray-900">Quick Actions</h2></div>
          <div className="p-5 grid grid-cols-2 gap-3">
            <Link to="/admin/verifications" className="btn-outline"><Shield className="w-4 h-4" /> Verifications</Link>
            <Link to="/admin/users" className="btn-outline"><Users className="w-4 h-4" /> Users</Link>
            <Link to="/admin/safety" className="btn-outline"><Cog className="w-4 h-4" /> Safety Rules</Link>
            <Link to="/admin/verifications" className="btn-outline"><BarChart3 className="w-4 h-4" /> Analytics</Link>
          </div>
        </div>
        <div className="card">
          <div className="px-5 py-4 border-b border-gray-100"><h2 className="font-semibold text-gray-900">AI Correction Rate</h2></div>
          <div className="p-5 text-center">
            <p className="text-5xl font-bold text-primary-600">{data?.ai?.correctionRate || 0}%</p>
            <p className="text-sm text-gray-500 mt-2">of AI analyses were corrected by owners</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function OrgDashboard() {
  return (
    <div className="space-y-8">
      <div><h1 className="text-2xl font-bold text-gray-900">Organization Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Manage donations and community engagement</p></div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Active Donations" value="0" icon={Heart} color="primary" />
        <StatCard label="Received Items" value="0" icon={Package} color="secondary" />
        <StatCard label="Impact Score" value="0" icon={BarChart3} color="warning" />
      </div>
      <div className="card card-body text-center py-16">
        <Heart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Welcome to FixTogether</h3>
        <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">Browse available donations, set up your needed items, and start making an impact.</p>
        <Link to="/donations" className="btn-primary">Browse Donations</Link>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  return (
    <div className="page-container">
      {user?.role === 'admin' ? <AdminDashboard /> :
       user?.role === 'technician' ? <TechnicianDashboard /> :
       user?.role === 'organization' ? <OrgDashboard /> :
       <OwnerDashboard />}
    </div>
  );
}
