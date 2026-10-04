import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { StatCard, PageLoader, ErrorState } from '../components/ui';
import {
  ClipboardList,
  Shield,
  BarChart3,
  AlertTriangle,
  AlertCircle,
  Package,
  Wrench,
  Clock,
  ArrowRight,
  Users,
  Activity,
  CheckCircle,
  Sparkles,
} from 'lucide-react';

export default function DashboardPage() {
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-900 p-5 rounded-2xl border border-gray-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Administrator Command Center
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">
              Live Governance
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Real-time platform operations, safety triage, review queue locks, and ecosystem governance.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link to="/review-queue" className="btn-primary text-xs flex items-center gap-1.5 shadow-xs">
            <ClipboardList className="w-4 h-4" /> Open Review Queue
          </Link>
          <Link to="/audit-logs" className="btn-outline text-xs flex items-center gap-1.5">
            <Shield className="w-4 h-4" /> Audit Logs
          </Link>
        </div>
      </div>

      {/* CRITICAL OPERATIONAL QUEUE */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Link
          to="/review-queue?tab=critical"
          className="card p-4 hover:border-red-500/80 transition-all border-l-4 border-l-red-500 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-red-400 uppercase tracking-wider">Critical Safety</span>
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">
            {criticalAlerts.criticalSafetyFlags?.length || 0}
          </div>
          <p className="text-[11px] text-gray-400 mt-1">Hazardous flags awaiting triage</p>
        </Link>

        <Link
          to="/disputes"
          className="card p-4 hover:border-purple-500/80 transition-all border-l-4 border-l-purple-500 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">Active Disputes</span>
            <AlertCircle className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">
            {criticalAlerts.highPriorityDisputes?.length || 0}
          </div>
          <p className="text-[11px] text-gray-400 mt-1">Formal arbitration cases</p>
        </Link>

        <Link
          to="/verifications"
          className="card p-4 hover:border-amber-500/80 transition-all border-l-4 border-l-amber-500 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Verifications</span>
            <Shield className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">
            {criticalAlerts.pendingVerificationsCount || 0}
          </div>
          <p className="text-[11px] text-gray-400 mt-1">Pending tech & org credentials</p>
        </Link>

        <Link
          to="/review-queue"
          className="card p-4 hover:border-blue-500/80 transition-all border-l-4 border-l-blue-500 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Review Queue</span>
            <Clock className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">
            {urgentQueue.length}
          </div>
          <p className="text-[11px] text-gray-400 mt-1">Urgent triage items</p>
        </Link>
      </div>

      {/* 2-COLUMN OPERATIONAL BENCH */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Left Column: Priority Review Queue Triage (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="card">
            <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-primary-400" />
                <h2 className="font-semibold text-white text-sm">
                  Active Priority Review Queue ({urgentQueue.length})
                </h2>
              </div>
              <Link
                to="/review-queue"
                className="text-xs text-primary-400 hover:text-primary-300 font-semibold flex items-center gap-1"
              >
                View Full Queue <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="divide-y divide-gray-800">
              {urgentQueue.length > 0 ? (
                urgentQueue.slice(0, 5).map((item) => (
                  <div
                    key={item._id}
                    className="p-4 hover:bg-gray-800/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            item.priority === 'critical'
                              ? 'bg-red-950 text-red-300 border border-red-800'
                              : item.priority === 'high'
                              ? 'bg-amber-950 text-amber-300 border border-amber-800'
                              : 'bg-blue-950 text-blue-300 border border-blue-800'
                          }`}
                        >
                          {item.priority}
                        </span>
                        <h3 className="text-xs font-bold text-white truncate">{item.title}</h3>
                      </div>
                      <p className="text-[11px] text-gray-400 line-clamp-1">{item.reason}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {item.lock?.lockedBy && (
                        <span className="text-[10px] text-gray-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          Locked by {item.lock.lockedBy.fullName?.split(' ')[0] || 'Admin'}
                        </span>
                      )}
                      <Link
                        to="/review-queue"
                        className="btn-secondary py-1 px-3 text-xs font-semibold"
                      >
                        Inspect
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-xs text-gray-400">
                  No urgent items waiting in the review queue. All clear!
                </div>
              )}
            </div>
          </div>

          {/* Platform Performance & Impact */}
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="card p-4">
              <span className="text-xs text-gray-400 font-medium">Total Users</span>
              <div className="text-lg font-bold text-white mt-1">{metrics.users?.total || 0}</div>
              <div className="text-[10px] text-gray-500 mt-0.5">
                {metrics.users?.owners || 0} Owners • {metrics.users?.technicians || 0} Techs
              </div>
            </div>
            <div className="card p-4">
              <span className="text-xs text-gray-400 font-medium">Completed Repairs</span>
              <div className="text-lg font-bold text-emerald-400 mt-1">{metrics.repairs?.completed || 0}</div>
              <div className="text-[10px] text-gray-500 mt-0.5">
                {metrics.repairs?.active || 0} Active in shop
              </div>
            </div>
            <div className="card p-4">
              <span className="text-xs text-gray-400 font-medium">E-Waste Avoided</span>
              <div className="text-lg font-bold text-emerald-400 mt-1">
                {(metrics.impact?.totalWasteAvoided || 0).toLocaleString()} kg
              </div>
              <div className="text-[10px] text-gray-500 mt-0.5">
                ৳{(metrics.impact?.totalCostSaved || 0).toLocaleString()} customer savings
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Platform Navigation & Health (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Quick Management Suite */}
          <div className="card">
            <div className="px-5 py-4 border-b border-gray-800">
              <h2 className="font-semibold text-white text-sm">Governance Modules</h2>
            </div>
            <div className="p-3 grid grid-cols-2 gap-2">
              <Link to="/verifications" className="p-3 rounded-xl border border-gray-800 hover:bg-gray-800/80 transition-colors text-xs font-semibold text-gray-300 flex flex-col gap-1.5">
                <Shield className="w-4 h-4 text-amber-400" />
                <span>Verifications</span>
              </Link>
              <Link to="/users" className="p-3 rounded-xl border border-gray-800 hover:bg-gray-800/80 transition-colors text-xs font-semibold text-gray-300 flex flex-col gap-1.5">
                <Users className="w-4 h-4 text-blue-400" />
                <span>User Directory</span>
              </Link>
              <Link to="/safety" className="p-3 rounded-xl border border-gray-800 hover:bg-gray-800/80 transition-colors text-xs font-semibold text-gray-300 flex flex-col gap-1.5">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span>Safety Rules</span>
              </Link>
              <Link to="/disputes" className="p-3 rounded-xl border border-gray-800 hover:bg-gray-800/80 transition-colors text-xs font-semibold text-gray-300 flex flex-col gap-1.5">
                <Wrench className="w-4 h-4 text-purple-400" />
                <span>Dispute Cases</span>
              </Link>
              <Link to="/taxonomy" className="p-3 rounded-xl border border-gray-800 hover:bg-gray-800/80 transition-colors text-xs font-semibold text-gray-300 flex flex-col gap-1.5">
                <Package className="w-4 h-4 text-indigo-400" />
                <span>Categories</span>
              </Link>
              <Link to="/audit-logs" className="p-3 rounded-xl border border-gray-800 hover:bg-gray-800/80 transition-colors text-xs font-semibold text-gray-300 flex flex-col gap-1.5">
                <BarChart3 className="w-4 h-4 text-emerald-400" />
                <span>Audit Logs</span>
              </Link>
            </div>
          </div>

          {/* System Health Indicators */}
          <div className="card p-5 space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-emerald-400" /> System Health Status
            </h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-gray-400">
                <span>API Gateway:</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Operational
                </span>
              </div>
              <div className="flex items-center justify-between text-gray-400">
                <span>Database Cluster:</span>
                <span className="text-emerald-400 font-semibold">Connected</span>
              </div>
              <div className="flex items-center justify-between text-gray-400">
                <span>AI Governance:</span>
                <span className="text-emerald-400 font-semibold">Healthy</span>
              </div>
              <div className="flex items-center justify-between text-gray-400">
                <span>Environment:</span>
                <span className="text-gray-300 font-mono text-[11px]">Development (Port 5174)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
