import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import GlobalSearchModal from '../common/GlobalSearchModal';
import {
  LayoutDashboard,
  ClipboardList,
  ShieldCheck,
  Users,
  AlertTriangle,
  MessageSquare,
  Package,
  BarChart3,
  Wrench,
  Heart,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Search,
  Bell,
  LogOut,
  ExternalLink,
  ShieldAlert,
  Sparkles,
  Activity,
} from 'lucide-react';

const ADMIN_MENU_GROUPS = [
  {
    title: 'OPERATIONS',
    items: [
      {
        label: 'Command Center',
        path: '/admin',
        icon: LayoutDashboard,
        exact: true,
      },
      {
        label: 'Review Queue',
        path: '/admin/review-queue',
        icon: ClipboardList,
        badgeKey: 'urgentQueueCount',
        badgeColor: 'bg-red-500 text-white',
      },
      {
        label: 'Dispute Arbitration',
        path: '/admin/disputes',
        icon: MessageSquare,
        badgeKey: 'disputesCount',
        badgeColor: 'bg-purple-600 text-white',
      },
    ],
  },
  {
    title: 'GOVERNANCE & TRUST',
    items: [
      {
        label: 'User Management',
        path: '/admin/users',
        icon: Users,
      },
      {
        label: 'Verifications',
        path: '/admin/verifications',
        icon: ShieldCheck,
        badgeKey: 'verificationsCount',
        badgeColor: 'bg-amber-500 text-white',
      },
      {
        label: 'Safety & Regex',
        path: '/admin/safety',
        icon: AlertTriangle,
      },
    ],
  },
  {
    title: 'PLATFORM & SYSTEM',
    items: [
      {
        label: 'Taxonomy & Skills',
        path: '/admin/taxonomy',
        icon: Package,
      },
      {
        label: 'Audit & AI Logs',
        path: '/admin/audit-logs',
        icon: BarChart3,
      },
    ],
  },
  {
    title: 'ECOSYSTEM DISPATCH',
    items: [
      {
        label: 'All Repair Requests',
        path: '/admin/repair-requests',
        icon: Wrench,
      },
      {
        label: 'Donation Network',
        path: '/admin/donations',
        icon: Heart,
      },
    ],
  },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('admin_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('admin_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col antialiased">
      {/* GLOBAL SEARCH DIALOG */}
      <GlobalSearchModal isOpen={searchModalOpen} onClose={() => setSearchModalOpen(false)} />

      {/* TOP HEADER BAR */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-200/90 h-16 px-4 sm:px-6 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-3">
          {/* Mobile drawer trigger (visible only on small displays < md) */}
          <button
            onClick={() => setMobileDrawerOpen(true)}
            className="md:hidden p-2 rounded-xl text-gray-600 hover:bg-gray-100 active:scale-95 transition-all"
            aria-label="Open Admin Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Platform Branding */}
          <Link to="/admin" className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-tr from-primary-700 via-primary-600 to-emerald-500 rounded-xl flex items-center justify-center shadow-md shadow-primary-500/20 text-white font-bold">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-black bg-gradient-to-r from-primary-700 to-emerald-600 bg-clip-text text-transparent tracking-tight">
                  FixTogether
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-gray-900 text-white tracking-wider">
                  Admin Console
                </span>
              </div>
              <span className="text-[10px] text-gray-400 font-semibold -mt-0.5 hidden sm:block">
                Platform Governance & Command Hub
              </span>
            </div>
          </Link>
        </div>

        {/* Right Header Utilities */}
        <div className="flex items-center gap-2.5">
          {/* Global Search Trigger */}
          <button
            onClick={() => setSearchModalOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200/80 text-gray-600 text-xs font-semibold border border-gray-200 transition-colors"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Command Search...</span>
            <kbd className="font-mono text-[10px] bg-white px-1.5 py-0.5 rounded border border-gray-200 text-gray-400">
              Ctrl K
            </kbd>
          </button>

          {/* System Status Indicator */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-full border border-emerald-200/80 text-[11px] font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Systems Normal</span>
          </div>

          {/* Notification Quick Link */}
          <Link
            to="/notifications"
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl relative active:scale-95 transition-all"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
          </Link>

          {/* Exit Admin View to Public Site */}
          <Link
            to="/"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors border border-gray-200"
            title="Return to Public Platform"
          >
            <ExternalLink className="w-3.5 h-3.5 text-gray-500" />
            <span>Public Site</span>
          </Link>
        </div>
      </header>

      <div className="flex flex-1 relative">
        {/* PERSISTENT LEFT-SIDE PANEL FOR LARGER DISPLAYS (>= md: tablets, laptops, desktops) */}
        <aside
          className={`hidden md:flex flex-col bg-white border-r border-gray-200/80 transition-all duration-300 z-20 shrink-0 sticky top-16 h-[calc(100vh-4rem)] ${
            sidebarCollapsed ? 'w-20' : 'w-64'
          }`}
        >
          {/* Collapse/Expand Header Action */}
          <div className="p-3 border-b border-gray-100 flex items-center justify-between">
            {!sidebarCollapsed ? (
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 px-2">
                Navigation Modules
              </span>
            ) : (
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mx-auto">
                Menu
              </span>
            )}
            <button
              onClick={toggleSidebar}
              className={`p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors ${
                sidebarCollapsed ? 'mx-auto' : ''
              }`}
              title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              aria-label={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {sidebarCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Navigation Links Scroll Area */}
          <div className="flex-1 overflow-y-auto p-3 space-y-6">
            {ADMIN_MENU_GROUPS.map((group) => (
              <div key={group.title} className="space-y-1">
                {!sidebarCollapsed && (
                  <p className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-gray-400 mb-1.5">
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
                      className={`relative flex items-center ${
                        sidebarCollapsed ? 'justify-center px-2 py-3' : 'justify-between px-3 py-2.5'
                      } rounded-xl text-xs font-semibold transition-all group ${
                        active
                          ? 'bg-primary-50 text-primary-800 font-bold border border-primary-200/80 border-l-4 border-l-primary-600 shadow-2xs'
                          : 'text-gray-600 hover:bg-gray-100/70 hover:text-gray-900'
                      }`}
                      title={sidebarCollapsed ? `${item.label}${count > 0 ? ` (${count})` : ''}` : undefined}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          className={`w-4 h-4 shrink-0 transition-transform ${
                            active
                              ? 'text-primary-600 scale-110'
                              : 'text-gray-400 group-hover:text-gray-600'
                          }`}
                        />
                        {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                      </div>

                      {/* Badge Counter */}
                      {count > 0 && !sidebarCollapsed && (
                        <span
                          className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full shrink-0 ${
                            item.badgeColor || 'bg-gray-200 text-gray-800'
                          }`}
                        >
                          {count}
                        </span>
                      )}

                      {/* Dot indicator when collapsed */}
                      {count > 0 && sidebarCollapsed && (
                        <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white" />
                      )}
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Admin User Footer Box */}
          <div className="p-3 border-t border-gray-100 bg-gray-50/70">
            {!sidebarCollapsed ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2.5 px-2">
                  <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xs border border-primary-200 shadow-2xs shrink-0">
                    {user?.fullName?.charAt(0) || 'A'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-gray-900 truncate">{user?.fullName}</p>
                    <p className="text-[10px] text-gray-500 capitalize truncate">
                      {user?.adminPermissions?.[0] || 'Super Admin'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold text-danger-600 hover:bg-danger-50 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center p-2 rounded-lg text-danger-600 hover:bg-danger-50 transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </aside>

        {/* MOBILE SLIDE-OVER DRAWER (From the LEFT, for displays < md) */}
        {mobileDrawerOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
              onClick={() => setMobileDrawerOpen(false)}
            />

            {/* Drawer Container (slides in from the left) */}
            <div className="relative w-4/5 max-w-xs bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
              <div className="p-4 bg-gray-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-primary-400" />
                  <span className="font-bold text-sm">Admin Navigation</span>
                </div>
                <button
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-1 rounded-lg hover:bg-white/10 text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {ADMIN_MENU_GROUPS.map((group) => (
                  <div key={group.title} className="space-y-1">
                    <p className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-gray-400 mb-1">
                      {group.title}
                    </p>
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const active = isCurrentActive(item);
                      const count = item.badgeKey ? badgeCounts[item.badgeKey] : 0;

                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => setMobileDrawerOpen(false)}
                          className={`flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-semibold transition-all ${
                            active
                              ? 'bg-primary-50 text-primary-700 font-bold border border-primary-100'
                              : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Icon className={`w-4 h-4 ${active ? 'text-primary-600' : 'text-gray-400'}`} />
                            <span>{item.label}</span>
                          </div>
                          {count > 0 && (
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                                item.badgeColor || 'bg-gray-200 text-gray-800'
                              }`}
                            >
                              {count}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                ))}
              </div>

              <div className="p-4 border-t border-gray-100 bg-gray-50">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-danger-600 bg-danger-50 hover:bg-danger-100 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MAIN ADMIN WORKSPACE CONTENT */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full pb-20 md:pb-8">
          <Outlet />
        </main>
      </div>

      {/* MOBILE BOTTOM NAVIGATION BAR FOR ADMIN (< md screens) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-gray-200/90 z-40 px-2 py-1.5 flex items-center justify-around shadow-lg">
        <Link
          to="/admin"
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all ${
            location.pathname === '/admin' ? 'text-primary-700 font-bold' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px]">Command</span>
        </Link>

        <Link
          to="/admin/review-queue"
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl relative transition-all ${
            location.pathname.startsWith('/admin/review-queue') ? 'text-primary-700 font-bold' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <div className="relative">
            <ClipboardList className="w-5 h-5" />
            {badgeCounts.urgentQueueCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[9px] font-bold px-1 rounded-full min-w-[14px] text-center">
                {badgeCounts.urgentQueueCount}
              </span>
            )}
          </div>
          <span className="text-[10px]">Queue</span>
        </Link>

        <Link
          to="/admin/disputes"
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl relative transition-all ${
            location.pathname.startsWith('/admin/disputes') ? 'text-primary-700 font-bold' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <div className="relative">
            <MessageSquare className="w-5 h-5" />
            {badgeCounts.disputesCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-purple-600 text-white text-[9px] font-bold px-1 rounded-full min-w-[14px] text-center">
                {badgeCounts.disputesCount}
              </span>
            )}
          </div>
          <span className="text-[10px]">Disputes</span>
        </Link>

        <Link
          to="/admin/verifications"
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl relative transition-all ${
            location.pathname.startsWith('/admin/verifications') ? 'text-primary-700 font-bold' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <div className="relative">
            <ShieldCheck className="w-5 h-5" />
            {badgeCounts.verificationsCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-amber-500 text-white text-[9px] font-bold px-1 rounded-full min-w-[14px] text-center">
                {badgeCounts.verificationsCount}
              </span>
            )}
          </div>
          <span className="text-[10px]">Verify</span>
        </Link>

        <button
          onClick={() => setMobileDrawerOpen(true)}
          className="flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl text-gray-500 hover:text-gray-900 transition-all"
          aria-label="Open More Modules"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px]">Menu</span>
        </button>
      </nav>
    </div>
  );
}
