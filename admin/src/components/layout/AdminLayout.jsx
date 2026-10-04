import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import {
  LayoutDashboard,
  ClipboardList,
  ShieldCheck,
  Users,
  AlertTriangle,
  MessageSquare,
  Package,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  LogOut,
  ExternalLink,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';

const ADMIN_MENU_GROUPS = [
  {
    title: 'OPERATIONS',
    items: [
      { label: 'Command Center', path: '/', icon: LayoutDashboard, exact: true },
      { label: 'Review Queue', path: '/review-queue', icon: ClipboardList, badgeKey: 'urgentQueueCount', badgeColor: 'bg-rose-500 text-white' },
      { label: 'Dispute Arbitration', path: '/disputes', icon: MessageSquare, badgeKey: 'disputesCount', badgeColor: 'bg-purple-600 text-white' },
    ],
  },
  {
    title: 'GOVERNANCE & TRUST',
    items: [
      { label: 'User Directory', path: '/users', icon: Users },
      { label: 'Verifications', path: '/verifications', icon: ShieldCheck, badgeKey: 'verificationsCount', badgeColor: 'bg-amber-500 text-white' },
      { label: 'Safety & Screening', path: '/safety', icon: AlertTriangle },
    ],
  },
  {
    title: 'PLATFORM & SYSTEM',
    items: [
      { label: 'Taxonomy Tree', path: '/taxonomy', icon: Package },
      { label: 'Audit & AI Logs', path: '/audit-logs', icon: BarChart3 },
    ],
  },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Close mobile drawer on route change
  React.useEffect(() => {
    setMobileDrawerOpen(false);
  }, [location.pathname]);

  // Live badge counts from dashboard overview
  const { data: dashboardData } = useQuery({
    queryKey: ['admin-overview-badges'],
    queryFn: () => api.get('/admin/dashboard').then((r) => r.data.data),
    refetchInterval: 30000,
  });

  const badgeCounts = {
    urgentQueueCount: dashboardData?.urgentQueue?.length || 0,
    disputesCount: dashboardData?.criticalAlerts?.highPriorityDisputes?.length || 0,
    verificationsCount: dashboardData?.criticalAlerts?.pendingVerificationsCount || 0,
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isCurrentActive = (item) => {
    if (item.exact) {
      return location.pathname === item.path;
    }
    return location.pathname.startsWith(item.path);
  };

  const publicUrl = import.meta.env.VITE_CLIENT_URL || 'http://localhost:5173';

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col antialiased">
      {/* TOP COMMAND HEADER */}
      <header className="sticky top-0 z-30 bg-gray-900/90 backdrop-blur-md border-b border-gray-800 h-16 px-4 sm:px-6 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileDrawerOpen(true)}
            className="md:hidden p-2 rounded-xl text-gray-400 hover:bg-gray-800 transition-colors"
            aria-label="Open Navigation"
          >
            <Menu className="w-5 h-5" />
          </button>

          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-tr from-primary-700 via-primary-600 to-emerald-500 rounded-xl flex items-center justify-center shadow-md shadow-primary-500/20 text-white font-bold">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-black bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent tracking-tight">
                  FixTogether
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-950 text-emerald-300 border border-emerald-800/80 tracking-wider">
                  Admin Command
                </span>
              </div>
              <span className="text-[10px] text-gray-500 font-semibold -mt-0.5 hidden sm:block">
                Dedicated Platform Governance Hub
              </span>
            </div>
          </Link>
        </div>

        {/* Right Header Utilities */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-emerald-950/60 border border-emerald-800/60 rounded-full text-xs text-emerald-300 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Operational Mode</span>
          </div>

          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-300 bg-gray-800/80 hover:bg-gray-800 border border-gray-700 transition-colors"
            title="Open Consumer Marketplace"
          >
            <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
            <span className="hidden sm:inline">Public Site</span>
          </a>

          <div className="flex items-center gap-2 pl-2 border-l border-gray-800">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-white truncate max-w-[120px]">{user?.fullName || 'Super Admin'}</p>
              <p className="text-[10px] text-emerald-400 font-mono">ROLE: ADMIN</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-400 hover:text-rose-400 hover:bg-gray-800 rounded-xl transition-colors"
              title="Sign Out of Admin Console"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 relative">
        {/* DESKTOP SIDEBAR */}
        <aside
          className={`hidden md:flex flex-col bg-gray-900 border-r border-gray-800 transition-all duration-200 z-20 shrink-0 sticky top-16 h-[calc(100vh-4rem)] ${
            sidebarCollapsed ? 'w-20' : 'w-64'
          }`}
        >
          <div className="p-3 border-b border-gray-800/80 flex items-center justify-between">
            {!sidebarCollapsed ? (
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 px-2">
                Operations & Systems
              </span>
            ) : (
              <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500 mx-auto">
                Nav
              </span>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-800"
              title={sidebarCollapsed ? 'Expand' : 'Collapse'}
            >
              {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-5">
            {ADMIN_MENU_GROUPS.map((group) => (
              <div key={group.title} className="space-y-1">
                {!sidebarCollapsed && (
                  <p className="px-3 text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1.5">
                    {group.title}
                  </p>
                )}
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isCurrentActive(item);
                  const count = item.badgeKey ? badgeCounts[item.badgeKey] : 0;

                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center ${
                        sidebarCollapsed ? 'justify-center px-2 py-3' : 'justify-between px-3 py-2.5'
                      } rounded-xl text-xs font-semibold transition-all ${
                        active
                          ? 'bg-primary-950/80 text-primary-300 border border-primary-700/60 shadow-xs'
                          : 'text-gray-400 hover:bg-gray-800/80 hover:text-gray-200'
                      }`}
                      title={sidebarCollapsed ? `${item.label}${count > 0 ? ` (${count})` : ''}` : undefined}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-primary-400' : 'text-gray-500'}`} />
                        {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                      </div>
                      {!sidebarCollapsed && count > 0 && (
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${item.badgeColor || 'bg-gray-700 text-white'}`}>
                          {count}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="p-3 border-t border-gray-800 text-[11px] text-gray-500">
            {!sidebarCollapsed && (
              <p className="text-center font-mono text-[10px] text-gray-600">FixTogether Core v1.0</p>
            )}
          </div>
        </aside>

        {/* MOBILE DRAWER */}
        {mobileDrawerOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            <div className="fixed inset-0 bg-black/70 backdrop-blur-xs" onClick={() => setMobileDrawerOpen(false)} />
            <div className="relative w-64 bg-gray-900 h-full flex flex-col p-4 space-y-4 shadow-2xl z-10">
              <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                <span className="text-sm font-bold text-white">Navigation</span>
                <button onClick={() => setMobileDrawerOpen(false)} className="text-gray-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4">
                {ADMIN_MENU_GROUPS.map((group) => (
                  <div key={group.title} className="space-y-1">
                    <p className="text-[10px] font-black uppercase text-gray-500 px-2">{group.title}</p>
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const active = isCurrentActive(item);
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold ${
                            active ? 'bg-primary-950 text-primary-300 font-bold border border-primary-800' : 'text-gray-400 hover:bg-gray-800'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* MAIN CONTENT WORKSPACE */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
