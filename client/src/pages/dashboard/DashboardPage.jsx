import { useAuth } from '../../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { StatCard, PageLoader, ErrorState, StatusBadge } from '../../components/ui';
import {
  Package,
  Wrench,
  ClipboardList,
  Heart,
  Plus,
  ArrowRight,
  Users,
  Shield,
  BarChart3,
  AlertTriangle,
  AlertCircle,
  Cog,
  Sparkles,
  Calendar,
  Clock,
  CheckCircle2,
  Award,
  DollarSign,
  Activity,
} from 'lucide-react';
import { getStatusConfig } from '../../utils/repairStatusConfig';

function OwnerDashboard() {
  const { data: statsData } = useQuery({
    queryKey: ['my-stats'],
    queryFn: () => api.get('/users/me/stats').then((r) => r.data.data?.stats),
  });

  const { data: actionRequiredData } = useQuery({
    queryKey: ['repair-requests', { tab: 'action_required' }],
    queryFn: () => api.get('/repair-requests?tab=action_required&limit=4').then((r) => r.data.data),
  });

  const { data: activeRequestsData } = useQuery({
    queryKey: ['repair-requests', { tab: 'active' }],
    queryFn: () => api.get('/repair-requests?tab=active&limit=4').then((r) => r.data.data),
  });

  const { data: activityData } = useQuery({
    queryKey: ['my-activity'],
    queryFn: () => api.get('/users/me/activity').then((r) => r.data.data?.activities),
  });

  const stats = statsData || {};
  const actionRequiredList = actionRequiredData?.repairRequests || [];
  const activeList = activeRequestsData?.repairRequests || [];
  const activities = activityData || [];

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
            Owner Command Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Track your ongoing repairs, manage items, and monitor your circular impact.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Link to="/items/new" className="btn-outline btn-sm">
            <Package className="w-4 h-4" /> Register Item
          </Link>
          <Link to="/repair-requests/new" className="btn-primary btn-sm flex items-center gap-1.5 shadow-sm">
            <Plus className="w-4 h-4" /> Request Repair
          </Link>
        </div>
      </div>

      {/* Primary KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Registered Items"
          value={stats.registeredItems || 0}
          icon={Package}
          color="primary"
        />
        <StatCard
          label="Active Repairs"
          value={stats.activeRepairs || 0}
          icon={Wrench}
          color="secondary"
        />
        <StatCard
          label="Repairs Completed"
          value={stats.completedRepairs || 0}
          icon={CheckCircle2}
          color="success"
        />
        <StatCard
          label="Community Donations"
          value={stats.totalDonations || 0}
          icon={Heart}
          color="warning"
        />
      </div>

      {/* SECTION 1: ACTION REQUIRED QUEUE */}
      {actionRequiredList.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-primary-600 animate-ping" />
              <h2 className="text-base font-bold text-gray-900 uppercase tracking-wider">
                Action Required Queue ({actionRequiredList.length})
              </h2>
            </div>
            <Link
              to="/repair-requests?tab=action_required"
              className="text-xs text-primary-600 hover:text-primary-700 font-semibold flex items-center gap-1"
            >
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            {actionRequiredList.map((rr) => {
              const statusCfg = getStatusConfig(rr.requestStatus);
              return (
                <Link
                  key={rr._id}
                  to={`/repair-requests/${rr._id}`}
                  className="card p-4 hover:shadow-md transition-all border-l-4 border-l-primary-500 hover:border-primary-300 flex flex-col justify-between gap-3 group"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-bold text-sm text-gray-900 group-hover:text-primary-600 truncate">
                        {rr.item?.title || 'Repair Request'}
                      </h3>
                      <StatusBadge status={rr.requestStatus} />
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-1">{rr.problemDescription}</p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs">
                    <span className="text-primary-800 font-bold flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-primary-600" />
                      {statusCfg.requiredAction.owner}
                    </span>
                    <span className="text-primary-600 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                      Respond <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 2: 2-COLUMN LAYOUT (ACTIVE REPAIRS & RECENT ACTIVITY) */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Active Repairs */}
        <div className="card">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary-600" /> Active Repairs Tracker
            </h2>
            <Link
              to="/repair-requests?tab=active"
              className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1 font-medium"
            >
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="divide-y divide-gray-100">
            {activeList.length > 0 ? (
              activeList.map((rr) => (
                <Link
                  key={rr._id}
                  to={`/repair-requests/${rr._id}`}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors"
                >
                  <div className="min-w-0 pr-3">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {rr.item?.title || 'Repair Request'}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                      {rr.problemDescription?.substring(0, 70)}...
                    </p>
                  </div>
                  <StatusBadge status={rr.requestStatus} />
                </Link>
              ))
            ) : (
              <div className="py-12 text-center text-xs text-gray-500 space-y-2">
                <p>No active repairs in progress right now.</p>
                <Link to="/repair-requests/new" className="text-primary-600 font-semibold inline-block">
                  + Start a new repair request
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity Stream (10 event types with deep links) */}
        <div className="card">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-600" /> Recent Journey Activity
            </h2>
            <span className="text-[11px] text-gray-400">Live timeline</span>
          </div>

          <div className="divide-y divide-gray-100 max-h-[380px] overflow-y-auto">
            {activities.length > 0 ? (
              activities.map((act) => (
                <Link
                  key={act.id}
                  to={act.link || '/dashboard'}
                  className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors text-xs"
                >
                  <div className="min-w-0 pr-2">
                    <p className="font-medium text-gray-800 truncate">{act.title}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {new Date(act.timestamp).toLocaleString()}
                    </p>
                  </div>
                  {act.badge && (
                    <span className="badge-gray text-[10px] shrink-0">{act.badge}</span>
                  )}
                </Link>
              ))
            ) : (
              <div className="py-12 text-center text-xs text-gray-500">
                No recent activity recorded yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TechnicianDashboard() {
  const { data: workspaceData, isLoading, error } = useQuery({
    queryKey: ['technician-workspace'],
    queryFn: () => api.get('/technicians/me/workspace').then((r) => r.data.data),
    staleTime: 30000,
  });

  const profile = workspaceData?.profile;
  const urgentActions = workspaceData?.urgentActions || [];
  const activeJobs = workspaceData?.activeJobs || [];
  const matchingOpps = workspaceData?.matchingOpportunities || [];
  const invitations = workspaceData?.pendingInvitations || [];
  const todayAppts = workspaceData?.todayAppointments || [];
  const pendingCosts = workspaceData?.pendingCostApprovals || [];
  const performance = workspaceData?.performance || {};

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-6">
      {/* 1. Header & Live Availability Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">
              {profile?.professionalName || 'Technician Operational Workspace'}
            </h1>
            <span
              className={`px-2 py-0.5 rounded text-xs font-semibold ${
                profile?.verificationStatus === 'approved'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}
            >
              {profile?.verificationStatus === 'approved' ? 'Verified Pro' : 'Verification In Progress'}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Operational queue, active hardware benches, and real-time job dispatch
          </p>
        </div>

        {/* Status / Capacity Toggle Info */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs font-semibold text-gray-800 flex items-center gap-1.5 justify-end">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  profile?.availabilityStatus === 'available'
                    ? 'bg-green-500 animate-pulse'
                    : profile?.availabilityStatus === 'busy'
                    ? 'bg-amber-500'
                    : 'bg-gray-400'
                }`}
              />
              <span className="capitalize">{profile?.availabilityStatus || 'Available'}</span>
              {profile?.vacationMode && <span className="text-[10px] text-purple-600 font-bold">(Vacation)</span>}
            </div>
            <p className="text-[11px] text-gray-400">
              Active Load: {profile?.activeJobsCount || 0} / {profile?.maxConcurrentJobs || 5} concurrent jobs
            </p>
          </div>
          <Link to="/technicians/profile" className="btn-secondary py-1.5 px-3 text-xs font-semibold">
            Manage Load
          </Link>
        </div>
      </div>

      {/* Capacity / Vacation Alert */}
      {profile?.capacityWarning && (
        <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between text-xs text-amber-800">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Capacity Reached:</strong> You are currently managing {profile?.activeJobsCount} active jobs. New matches will be throttled.
            </span>
          </div>
          <Link to="/repair-jobs" className="font-semibold text-amber-900 underline">
            View Jobs
          </Link>
        </div>
      )}

      {/* 2. Key Performance Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <span className="text-xs text-gray-500 font-medium">Active Jobs</span>
          <div className="text-xl font-bold text-gray-900 mt-1">{activeJobs.length}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <span className="text-xs text-gray-500 font-medium">Repairs Completed</span>
          <div className="text-xl font-bold text-gray-900 mt-1">{performance.completedRepairs || 0}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <span className="text-xs text-gray-500 font-medium">Average Rating</span>
          <div className="text-xl font-bold text-gray-900 mt-1">
            ⭐ {performance.rating?.toFixed(1) || '5.0'} ({performance.reviewCount || 0})
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <span className="text-xs text-gray-500 font-medium">Accepted Quotes</span>
          <div className="text-xl font-bold text-gray-900 mt-1">{performance.quotesAccepted || 0}</div>
        </div>
      </div>

      {/* 3. Urgent Action Queue (if any) */}
      {urgentActions.length > 0 && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-700" />
              <span>Urgent Operational Actions Required ({urgentActions.length})</span>
            </h2>
            <span className="text-[11px] text-amber-700 font-medium">Immediate Attention</span>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {urgentActions.map((action, idx) => (
              <div
                key={idx}
                className="p-3 bg-white rounded-xl border border-amber-200/80 shadow-xs flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold text-gray-900 truncate">{action.title}</p>
                  <p className="text-[11px] text-gray-500 truncate">{action.description}</p>
                </div>
                <Link
                  to={action.link || '/repair-jobs'}
                  className="btn-primary py-1 px-3 text-xs font-semibold shrink-0"
                >
                  {action.buttonLabel || 'Resolve'}
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Two Column Workspace Layout */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Left Column: Active Bench Jobs (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Active Jobs */}
          <div className="card">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                <Wrench className="w-4 h-4 text-primary-600" />
                <span>Active Repair Benches ({activeJobs.length})</span>
              </h2>
              <Link
                to="/repair-jobs"
                className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1 font-medium"
              >
                Full Workspace View <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="divide-y divide-gray-100">
              {activeJobs.length > 0 ? (
                activeJobs.map((job) => (
                  <div
                    key={job._id}
                    className="p-4 hover:bg-gray-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/repair-jobs/${job._id}`}
                          className="text-sm font-bold text-gray-900 hover:text-primary-600 truncate"
                        >
                          {job.repairRequest?.item?.title || `Job #${job._id.slice(-6)}`}
                        </Link>
                        <span className="badge-gray text-[10px]">#{job._id.slice(-6)}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Customer: {job.owner?.fullName || 'Client'} • {job.repairRequest?.preferredServiceMethod || 'Standard'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge status={job.currentStatus} />
                      <Link
                        to={`/repair-jobs/${job._id}`}
                        className="btn-secondary py-1 px-2.5 text-xs font-semibold"
                      >
                        Open Bench
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-xs text-gray-500 space-y-2">
                  <p>No active repair jobs in progress right now.</p>
                  <Link to="/repair-requests?tab=recommended" className="text-primary-600 font-semibold inline-block">
                    Explore matching repair requests to quote
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Pending Invitations & Opportunities */}
          {invitations.length > 0 && (
            <div className="card">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-primary-50/30">
                <h2 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary-600" />
                  <span>Direct Customer Invitations ({invitations.length})</span>
                </h2>
                <span className="text-xs font-semibold text-primary-700">Action Needed</span>
              </div>
              <div className="divide-y divide-gray-100">
                {invitations.map((inv) => (
                  <div key={inv._id} className="p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-900 truncate">
                        {inv.item?.title || 'Repair Request'}
                      </p>
                      <p className="text-[11px] text-gray-500 truncate mt-0.5">
                        {inv.problemDescription?.substring(0, 80)}...
                      </p>
                    </div>
                    <Link to={`/repair-requests/${inv._id}`} className="btn-primary py-1 px-3 text-xs font-semibold shrink-0">
                      Submit Quotation
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Schedule & Matching Opportunities (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Quick Find Work Card */}
          <div className="card p-5 bg-gradient-to-br from-primary-600 to-primary-800 text-white shadow-md">
            <h3 className="text-base font-bold">Discover Repair Work</h3>
            <p className="text-xs text-primary-100 mt-1">
              Find verified hardware repair jobs matching your category skills and service radius.
            </p>
            <div className="mt-4 flex gap-2">
              <Link to="/repair-requests?tab=recommended" className="bg-white text-primary-700 px-3.5 py-1.5 rounded-xl text-xs font-bold hover:bg-primary-50 transition-colors">
                Recommended
              </Link>
              <Link to="/repair-requests?tab=nearby" className="bg-primary-700/80 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold hover:bg-primary-700 transition-colors">
                Nearby
              </Link>
            </div>
          </div>

          {/* Today's Schedule */}
          <div className="card">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-gray-600" />
                <span>Today's Handover Schedule</span>
              </h3>
              <span className="text-[11px] text-gray-400">{todayAppts.length} appointments</span>
            </div>
            <div className="divide-y divide-gray-100 p-2">
              {todayAppts.length > 0 ? (
                todayAppts.map((appt, i) => (
                  <div key={i} className="p-3 text-xs space-y-1">
                    <p className="font-bold text-gray-900">{appt.itemTitle}</p>
                    <p className="text-gray-500">
                      Time: {appt.time} • Owner: {appt.ownerName}
                    </p>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-xs text-gray-400">
                  No appointments scheduled for today.
                </div>
              )}
            </div>
          </div>

          {/* Recommended Matching Opportunities */}
          <div className="card">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span>High-Match Jobs</span>
              </h3>
              <Link to="/repair-requests?tab=recommended" className="text-xs text-primary-600 font-medium">
                View all
              </Link>
            </div>
            <div className="divide-y divide-gray-100">
              {matchingOpps.length > 0 ? (
                matchingOpps.slice(0, 4).map((opp) => (
                  <Link
                    key={opp._id}
                    to={`/repair-requests/${opp._id}`}
                    className="p-3.5 block hover:bg-gray-50 transition-colors text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-gray-900 truncate">{opp.item?.title || 'Repair Request'}</p>
                      <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 text-[10px] font-bold shrink-0">
                        {opp.matchScore || 85}% Match
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 truncate mt-1">
                      Budget: ৳{opp.budget?.minimum || 0} - ৳{opp.budget?.maximum || 'Flexible'}
                    </p>
                  </Link>
                ))
              ) : (
                <div className="py-6 text-center text-xs text-gray-400">
                  No new high-match listings currently.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminDashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => api.get('/admin/dashboard').then((r) => r.data.data),
    refetchInterval: 30000,
  });

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} />;

  const urgentQueue = data?.urgentQueue || [];
  const criticalAlerts = data?.criticalAlerts || {};
  const metrics = data?.metrics || {};
  const systemHealth = data?.systemHealth || {};

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header & Command Center Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
              Administrator Command Center
            </h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-primary-100 text-primary-800 border border-primary-200">
              Live Governance
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Real-time platform operations, safety triage, review queue locks, and ecosystem governance.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link to="/admin/review-queue" className="btn-primary text-xs flex items-center gap-1.5 shadow-xs">
            <ClipboardList className="w-4 h-4" /> Open Review Queue
          </Link>
          <Link to="/admin/audit-logs" className="btn-outline text-xs flex items-center gap-1.5">
            <Shield className="w-4 h-4" /> Audit Logs
          </Link>
        </div>
      </div>

      {/* CRITICAL OPERATIONAL QUEUE (Prioritizes urgent work over metrics) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Link
          to="/admin/review-queue?tab=critical"
          className="card p-4 hover:shadow-md transition-all border-l-4 border-l-red-500 hover:border-red-400 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-red-600 uppercase tracking-wider">Critical Safety</span>
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-2">
            {criticalAlerts.criticalSafetyFlags?.length || 0}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">Hazardous flags awaiting triage</p>
        </Link>

        <Link
          to="/admin/disputes"
          className="card p-4 hover:shadow-md transition-all border-l-4 border-l-purple-500 hover:border-purple-400 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-600 uppercase tracking-wider">Active Disputes</span>
            <AlertCircle className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-2">
            {criticalAlerts.highPriorityDisputes?.length || 0}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">Formal arbitration cases</p>
        </Link>

        <Link
          to="/admin/verifications"
          className="card p-4 hover:shadow-md transition-all border-l-4 border-l-amber-500 hover:border-amber-400 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Verifications</span>
            <Shield className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-2">
            {criticalAlerts.pendingVerificationsCount || 0}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">Pending tech & org credentials</p>
        </Link>

        <Link
          to="/admin/review-queue"
          className="card p-4 hover:shadow-md transition-all border-l-4 border-l-blue-500 hover:border-blue-400 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Review Queue</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-2">
            {urgentQueue.length}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">Urgent triage items</p>
        </Link>
      </div>

      {/* 2-COLUMN OPERATIONAL BENCH */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Left Column: Priority Review Queue Triage (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="card">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-primary-600" />
                <h2 className="font-semibold text-gray-900 text-sm">
                  Active Priority Review Queue ({urgentQueue.length})
                </h2>
              </div>
              <Link
                to="/admin/review-queue"
                className="text-xs text-primary-600 hover:text-primary-700 font-semibold flex items-center gap-1"
              >
                View Full Queue <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="divide-y divide-gray-100">
              {urgentQueue.length > 0 ? (
                urgentQueue.slice(0, 5).map((item) => (
                  <div
                    key={item._id}
                    className="p-4 hover:bg-gray-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            item.priority === 'critical'
                              ? 'bg-red-100 text-red-700'
                              : item.priority === 'high'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {item.priority}
                        </span>
                        <h3 className="text-xs font-bold text-gray-900 truncate">{item.title}</h3>
                      </div>
                      <p className="text-[11px] text-gray-500 line-clamp-1">{item.reason}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {item.lock?.lockedBy && (
                        <span className="text-[10px] text-gray-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          Locked by {item.lock.lockedBy.fullName?.split(' ')[0] || 'Admin'}
                        </span>
                      )}
                      <Link
                        to="/admin/review-queue"
                        className="btn-secondary py-1 px-3 text-xs font-semibold"
                      >
                        Inspect
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-xs text-gray-500">
                  No urgent items waiting in the review queue. All clear!
                </div>
              )}
            </div>
          </div>

          {/* Platform Performance & Impact */}
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="card p-4">
              <span className="text-xs text-gray-500 font-medium">Total Users</span>
              <div className="text-lg font-bold text-gray-900 mt-1">{metrics.users?.total || 0}</div>
              <div className="text-[10px] text-gray-400 mt-0.5">
                {metrics.users?.owners || 0} Owners • {metrics.users?.technicians || 0} Techs
              </div>
            </div>
            <div className="card p-4">
              <span className="text-xs text-gray-500 font-medium">Completed Repairs</span>
              <div className="text-lg font-bold text-emerald-600 mt-1">{metrics.repairs?.completed || 0}</div>
              <div className="text-[10px] text-gray-400 mt-0.5">
                {metrics.repairs?.active || 0} Active in shop
              </div>
            </div>
            <div className="card p-4">
              <span className="text-xs text-gray-500 font-medium">E-Waste Avoided</span>
              <div className="text-lg font-bold text-primary-700 mt-1">
                {(metrics.impact?.totalWasteAvoided || 0).toLocaleString()} kg
              </div>
              <div className="text-[10px] text-gray-400 mt-0.5">
                ৳{(metrics.impact?.totalCostSaved || 0).toLocaleString()} customer savings
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Platform Navigation & Health (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Quick Management Suite */}
          <div className="card">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 text-sm">Governance Modules</h2>
            </div>
            <div className="p-3 grid grid-cols-2 gap-2">
              <Link to="/admin/verifications" className="p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors text-xs font-semibold text-gray-800 flex flex-col gap-1.5">
                <Shield className="w-4 h-4 text-amber-600" />
                <span>Verifications</span>
              </Link>
              <Link to="/admin/users" className="p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors text-xs font-semibold text-gray-800 flex flex-col gap-1.5">
                <Users className="w-4 h-4 text-blue-600" />
                <span>User Moderation</span>
              </Link>
              <Link to="/admin/safety" className="p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors text-xs font-semibold text-gray-800 flex flex-col gap-1.5">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span>Safety & Regex</span>
              </Link>
              <Link to="/admin/disputes" className="p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors text-xs font-semibold text-gray-800 flex flex-col gap-1.5">
                <Wrench className="w-4 h-4 text-purple-600" />
                <span>Dispute Cases</span>
              </Link>
              <Link to="/admin/taxonomy" className="p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors text-xs font-semibold text-gray-800 flex flex-col gap-1.5">
                <Cog className="w-4 h-4 text-indigo-600" />
                <span>Categories & Skills</span>
              </Link>
              <Link to="/admin/audit-logs" className="p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors text-xs font-semibold text-gray-800 flex flex-col gap-1.5">
                <BarChart3 className="w-4 h-4 text-emerald-600" />
                <span>Audit & AI Logs</span>
              </Link>
            </div>
          </div>

          {/* System Health Indicators */}
          <div className="card p-5 space-y-3">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-emerald-600" /> System Health Status
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between text-gray-600">
                <span>API Gateway:</span>
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> Operational
                </span>
              </div>
              <div className="flex items-center justify-between text-gray-600">
                <span>Database Cluster:</span>
                <span className="text-emerald-600 font-semibold">Connected</span>
              </div>
              <div className="flex items-center justify-between text-gray-600">
                <span>AI Governance Engine:</span>
                <span className="text-emerald-600 font-semibold">Healthy</span>
              </div>
              <div className="flex items-center justify-between text-gray-600">
                <span>API Uptime:</span>
                <span className="font-mono text-gray-800">{Math.floor(systemHealth.apiUptime || 0)}s</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


function OrgDashboard() {
  const { data: workspaceData, isLoading, error } = useQuery({
    queryKey: ['org-workspace'],
    queryFn: () => api.get('/organizations/me/workspace').then((r) => r.data.data),
    staleTime: 30000,
    refetchInterval: 60000,
  });

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} />;

  const profile = workspaceData?.profile;
  const urgentActions = workspaceData?.urgentActions || [];
  const queues = workspaceData?.queues || {};
  const counts = workspaceData?.counts || {};
  const impactStats = profile?.impactStats || {};
  const isVerified = profile?.verificationStatus === 'approved';

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Header & Organization Verification Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
              {profile?.organizationName || 'Organization Operational Command Center'}
            </h1>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                isVerified
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                  : profile?.verificationStatus === 'pending'
                  ? 'bg-amber-100 text-amber-800 border-amber-200'
                  : 'bg-red-100 text-red-800 border-red-200'
              }`}
            >
              {isVerified
                ? 'Verified Partner'
                : profile?.verificationStatus === 'pending'
                ? 'Verification Under Review'
                : 'Action Required: Submit Verification'}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Donation offer triage, collection logistics, hardware inspection, and community impact accounting.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/donations?tab=needs&new=true" className="btn-primary text-xs flex items-center gap-1.5 shadow-xs">
            <Plus className="w-4 h-4" /> Post Community Need
          </Link>
          <Link to="/donations?tab=offers" className="btn-outline text-xs flex items-center gap-1.5">
            <Heart className="w-4 h-4 text-pink-500" /> Browse Offers
          </Link>
        </div>
      </div>

      {/* Verification Compliance Warning (if not approved) */}
      {!isVerified && (
        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold">Compliance Status: {profile?.verificationStatus?.replace(/_/g, ' ').toUpperCase()}</strong>
              <p className="text-amber-800 mt-0.5">
                {profile?.verificationStatus === 'pending'
                  ? 'Your legal documents are currently being inspected by platform administrators. Offer acceptance is enabled once verified.'
                  : 'Submit official NGO/Non-Profit registration and tax credentials to unlock donation acceptance and community need publishing.'}
              </p>
            </div>
          </div>
          <Link
            to="/donations?tab=verification"
            className="btn-primary py-1.5 px-3 text-xs font-semibold bg-amber-700 hover:bg-amber-800 text-white shrink-0 shadow-xs"
          >
            Manage Verification
          </Link>
        </div>
      )}

      {/* 2. Urgent Operational Queue (Prioritizes urgent work over general metrics) */}
      {urgentActions.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50/90 to-orange-50/70 border border-amber-200 rounded-2xl p-5 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-700" />
              <span>Urgent Operational Tasks Requiring Attention ({urgentActions.length})</span>
            </h2>
            <span className="text-[11px] font-semibold text-amber-800">Immediate Action Required</span>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {urgentActions.slice(0, 3).map((act) => (
              <div
                key={act.id}
                className="p-3.5 bg-white rounded-xl border border-amber-200/90 shadow-xs flex flex-col justify-between space-y-3 hover:shadow-md transition-shadow"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                        act.priority === 'critical'
                          ? 'bg-red-100 text-red-700'
                          : act.priority === 'high'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {act.priority}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {new Date(act.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-gray-900 mt-2 line-clamp-1">{act.title}</h3>
                  <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{act.description}</p>
                </div>

                <Link
                  to={act.link}
                  className="btn-primary py-1 px-3 text-xs font-semibold text-center w-full shadow-xs"
                >
                  {act.actionLabel}
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Key Operational & Impact Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="card p-4">
          <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
            <span>Offers Awaiting Decision</span>
            <Heart className="w-4 h-4 text-pink-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-2">{counts.pendingDecisions || 0}</div>
          <p className="text-[11px] text-gray-400 mt-0.5">Incoming donor offers</p>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
            <span>Scheduled Collections</span>
            <Truck className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-2">{counts.scheduledCollections || 0}</div>
          <p className="text-[11px] text-gray-400 mt-0.5">Active pickups & dropoffs</p>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
            <span>Awaiting Inspection</span>
            <Wrench className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-2">{counts.awaitingInspection || 0}</div>
          <p className="text-[11px] text-gray-400 mt-0.5">Items on testing bench</p>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
            <span>Verified Impact Avoided</span>
            <Recycle className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 mt-2">
            {(impactStats.totalWeightProcessed || 0).toLocaleString()} kg
          </div>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {impactStats.totalItemsProcessed || 0} items diverted from landfill
          </p>
        </div>
      </div>

      {/* 4. Two-Column Operational Bench */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Left Column: Active Offers & Inspection Bench (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Incoming Offers */}
          <div className="card">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-pink-600" />
                <h2 className="font-semibold text-gray-900 text-sm">
                  Incoming Matching Donation Offers ({queues.offersAwaitingDecision?.length || 0})
                </h2>
              </div>
              <Link to="/donations?tab=offers" className="text-xs text-primary-600 hover:text-primary-700 font-semibold flex items-center gap-1">
                View All Offers <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="divide-y divide-gray-100">
              {queues.offersAwaitingDecision?.length > 0 ? (
                queues.offersAwaitingDecision.slice(0, 4).map((offer) => (
                  <div key={offer._id} className="p-4 hover:bg-gray-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="badge-blue text-[10px]">{offer.category?.name || 'Hardware'}</span>
                        <h3 className="text-xs font-bold text-gray-900 truncate">{offer.title || offer.item?.title || 'Donated Item'}</h3>
                      </div>
                      <p className="text-[11px] text-gray-500 line-clamp-1">
                        Condition: <strong className="capitalize">{offer.itemCondition}</strong> • Donor: {offer.owner?.fullName} • Handover: {offer.preferredHandover?.toUpperCase()}
                      </p>
                    </div>

                    <Link
                      to={`/donations?tab=offers&offerId=${offer._id}`}
                      className="btn-primary py-1 px-3 text-xs font-semibold shrink-0"
                    >
                      Review Offer
                    </Link>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-xs text-gray-500">
                  No pending donation offers currently awaiting decision.
                </div>
              )}
            </div>
          </div>

          {/* Inspection Bench Queue */}
          <div className="card">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-amber-600" />
                <h2 className="font-semibold text-gray-900 text-sm">
                  Items Received Awaiting Technical Inspection ({queues.itemsAwaitingInspection?.length || 0})
                </h2>
              </div>
              <Link to="/donations?tab=inspection" className="text-xs text-primary-600 hover:text-primary-700 font-semibold flex items-center gap-1">
                Open Inspection Bench <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="divide-y divide-gray-100">
              {queues.itemsAwaitingInspection?.length > 0 ? (
                queues.itemsAwaitingInspection.map((item) => (
                  <div key={item._id} className="p-4 hover:bg-gray-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="badge-yellow text-[10px]">Testing Required</span>
                        <h3 className="text-xs font-bold text-gray-900 truncate">{item.title || item.item?.title || 'Hardware Item'}</h3>
                      </div>
                      <p className="text-[11px] text-gray-500">
                        Received on {new Date(item.updatedAt).toLocaleDateString()} • Complete checklist to record outcome
                      </p>
                    </div>

                    <Link
                      to={`/donations?tab=inspection&inspectId=${item._id}`}
                      className="btn-secondary py-1 px-3 text-xs font-semibold shrink-0"
                    >
                      Inspect Checklist
                    </Link>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-gray-500">
                  All received hardware has been inspected and processed.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Quick Navigation & Active Needs (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Quick Operations Suite */}
          <div className="card p-5 space-y-3">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
              Operation Workspaces
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <Link to="/donations?tab=offers" className="p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors text-xs font-semibold text-gray-800 flex flex-col gap-1.5">
                <Heart className="w-4 h-4 text-pink-600" />
                <span>Donation Offers</span>
              </Link>
              <Link to="/donations?tab=needs" className="p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors text-xs font-semibold text-gray-800 flex flex-col gap-1.5">
                <Package className="w-4 h-4 text-blue-600" />
                <span>Community Needs</span>
              </Link>
              <Link to="/donations?tab=collections" className="p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors text-xs font-semibold text-gray-800 flex flex-col gap-1.5">
                <Truck className="w-4 h-4 text-indigo-600" />
                <span>Collections Hub</span>
              </Link>
              <Link to="/donations?tab=impact" className="p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors text-xs font-semibold text-gray-800 flex flex-col gap-1.5">
                <Recycle className="w-4 h-4 text-emerald-600" />
                <span>Impact Ledger</span>
              </Link>
            </div>
          </div>

          {/* Active Community Needs Tracker */}
          <div className="card">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-1.5">
                <Package className="w-4 h-4 text-primary-600" />
                <span>Active Needs</span>
              </h3>
              <Link to="/donations?tab=needs" className="text-xs text-primary-600 font-medium">
                Manage
              </Link>
            </div>

            <div className="divide-y divide-gray-100 p-2">
              {queues.urgentNeeds?.length > 0 ? (
                queues.urgentNeeds.map((need) => (
                  <div key={need._id} className="p-3 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-gray-900 truncate">{need.title}</p>
                      <span className="badge-gray text-[9px] uppercase">{need.urgency}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-gray-500">
                      <span>Target: {need.quantityRequested} items</span>
                      <span>Received: {need.quantityReceived || 0}</span>
                    </div>
                    <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-primary-600 h-full rounded-full"
                        style={{
                          width: `${Math.min(100, ((need.quantityReceived || 0) / (need.quantityRequested || 1)) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-xs text-gray-400">
                  No active community needs currently seeking items.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  return (
    <div className="page-container">
      {user?.role === 'admin' ? (
        <AdminDashboard />
      ) : user?.role === 'technician' ? (
        <TechnicianDashboard />
      ) : user?.role === 'organization' ? (
        <OrgDashboard />
      ) : (
        <OwnerDashboard />
      )}
    </div>
  );
}
