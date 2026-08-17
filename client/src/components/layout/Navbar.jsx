import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import {
  Menu,
  X,
  Bell,
  User,
  LogOut,
  ChevronDown,
  Wrench,
  Package,
  ClipboardList,
  Users,
  LayoutDashboard,
  Heart,
  Settings,
  Cog,
  MessageCircle,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';

const roleNavItems = {
  owner: [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'My Items', path: '/items', icon: Package },
    { label: 'Repair Requests', path: '/repair-requests', icon: Wrench },
    { label: 'Messages', path: '/messages', icon: MessageCircle },
    { label: 'Donations', path: '/donations', icon: Heart },
  ],
  technician: [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Repair Requests', path: '/repair-requests', icon: ClipboardList },
    { label: 'My Jobs', path: '/repair-jobs', icon: Wrench },
    { label: 'Messages', path: '/messages', icon: MessageCircle },
  ],
  organization: [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Donations', path: '/donations', icon: Heart },
    { label: 'Messages', path: '/messages', icon: MessageCircle },
  ],
  admin: [
    { label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { label: 'Users', path: '/admin/users', icon: Users },
    { label: 'Verifications', path: '/admin/verifications', icon: Settings },
    { label: 'Safety', path: '/admin/safety', icon: Cog },
  ],
};

export default function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  // Close drawer on route change
  useEffect(() => {
    setMobileDrawerOpen(false);
    setProfileOpen(false);
  }, [location.pathname]);

  // Prevent background scroll when mobile drawer is open
  useEffect(() => {
    if (mobileDrawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileDrawerOpen]);

  // Notifications query
  const { data: notifData } = useQuery({
    queryKey: ['unread-notifications'],
    queryFn: () => api.get('/notifications?unreadOnly=true').then((r) => r.data.data),
    enabled: !!isAuthenticated,
    refetchInterval: 30000,
  });

  const unreadNotifCount = notifData?.notifications?.length || 0;
  const navItems = isAuthenticated ? roleNavItems[user?.role] || roleNavItems.owner : [];

  const handleLogout = async () => {
    setMobileDrawerOpen(false);
    setProfileOpen(false);
    await logout();
    navigate('/login');
  };

  return (
    <nav className="bg-white/95 backdrop-blur-md border-b border-gray-200/80 sticky top-0 z-50 pt-[env(safe-area-inset-top)] shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo & Brand */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0 active:scale-95 transition-transform">
            <div className="w-9 h-9 bg-gradient-to-tr from-primary-700 via-primary-600 to-emerald-400 rounded-xl flex items-center justify-center shadow-md shadow-primary-500/20">
              <Wrench className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg sm:text-xl font-extrabold bg-gradient-to-r from-primary-700 to-emerald-600 bg-clip-text text-transparent tracking-tight">
                FixTogether
              </span>
              <span className="text-[9px] font-semibold text-gray-400 -mt-1 hidden sm:block tracking-wider uppercase">
                Community Repair & Reuse
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          {isAuthenticated && (
            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active =
                  location.pathname === item.path ||
                  (item.path !== '/dashboard' &&
                    item.path !== '/' &&
                    location.pathname.startsWith(item.path));
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
                      active
                        ? 'bg-primary-50 text-primary-700 shadow-sm'
                        : 'text-gray-600 hover:bg-gray-100/80 hover:text-gray-900'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${active ? 'text-primary-600' : 'text-gray-400'}`} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          )}

          {/* Right Header Controls */}
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <>
                {/* Notification Icon */}
                <Link
                  to="/notifications"
                  className="p-2.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl relative active:scale-95 transition-all"
                  aria-label="Notifications"
                >
                  <Bell className="w-5 h-5" />
                  {unreadNotifCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-danger-500 rounded-full ring-2 ring-white animate-pulse" />
                  )}
                </Link>

                {/* Desktop Profile Dropdown */}
                {/* Desktop Profile Dropdown with Full Accessibility */}
                <div className="relative hidden md:block">
                  <button
                    onClick={() => setProfileOpen(!profileOpen)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') setProfileOpen(false);
                    }}
                    aria-haspopup="menu"
                    aria-expanded={profileOpen}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-gray-200/80 hover:bg-gray-50 active:scale-95 transition-all"
                  >
                    <div className="w-7 h-7 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold text-xs overflow-hidden">
                      {user?.profileImage?.url ? (
                        <img src={user.profileImage.url} alt={user.fullName} className="w-full h-full object-cover" />
                      ) : (
                        user?.fullName?.charAt(0) || 'U'
                      )}
                    </div>
                    <span className="text-sm font-semibold text-gray-700 max-w-[110px] truncate">
                      {user?.fullName?.split(' ')[0]}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {profileOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)} />
                      <div
                        role="menu"
                        className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl ring-1 ring-black/5 py-2 z-20 animate-in fade-in zoom-in-95 duration-100 divide-y divide-gray-100"
                      >
                        <div className="px-4 py-3">
                          <p className="text-sm font-bold text-gray-900 truncate">{user?.fullName}</p>
                          <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                          <span className="inline-block px-2 py-0.5 mt-1.5 text-[10px] font-bold uppercase rounded-full bg-primary-100 text-primary-800">
                            {user?.role}
                          </span>
                        </div>

                        <div className="py-1">
                          <Link
                            to="/profile"
                            role="menuitem"
                            className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                            onClick={() => setProfileOpen(false)}
                          >
                            <User className="w-4 h-4 text-gray-400" /> My Profile & Dashboard
                          </Link>

                          {(user?.role === 'technician' || user?.role === 'organization') && (
                            <Link
                              to={user.role === 'technician' ? `/technicians/${user.userId || user._id}` : `/organizations/${user.userId || user._id}`}
                              role="menuitem"
                              className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                              onClick={() => setProfileOpen(false)}
                            >
                              <ShieldCheck className="w-4 h-4 text-primary-600" /> View Public Page
                            </Link>
                          )}
                        </div>

                        <div className="py-1">
                          <button
                            role="menuitem"
                            onClick={handleLogout}
                            className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-danger-600 hover:bg-danger-50 w-full text-left"
                          >
                            <LogOut className="w-4 h-4" /> Sign out
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Mobile Drawer Trigger */}
                <button
                  className="md:hidden p-2.5 text-gray-600 hover:bg-gray-100 rounded-xl active:scale-95 transition-transform"
                  onClick={() => setMobileDrawerOpen(true)}
                  aria-label="Open Navigation Menu"
                >
                  <Menu className="w-6 h-6" />
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="btn-ghost btn-sm font-semibold">
                  Log in
                </Link>
                <Link to="/register" className="btn-primary btn-sm font-semibold shadow-sm">
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MOBILE SLIDE-OVER DRAWER */}
      {mobileDrawerOpen && isAuthenticated && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileDrawerOpen(false)}
          />

          {/* Drawer Container */}
          <div className="relative w-4/5 max-w-xs bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
            {/* Header / User Card */}
            <div className="p-5 bg-gradient-to-br from-primary-700 via-primary-800 to-emerald-900 text-white relative">
              <button
                onClick={() => setMobileDrawerOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mt-2">
                <div className="w-12 h-12 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center font-bold text-lg text-white shadow-inner">
                  {user?.fullName?.charAt(0) || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-bold text-white truncate">{user?.fullName}</p>
                  <p className="text-xs text-emerald-200 truncate">{user?.email}</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="px-2 py-0.5 bg-white/20 rounded-md text-[10px] font-bold uppercase tracking-wider text-emerald-100">
                      {user?.role}
                    </span>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-1.5">
              <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                Navigation
              </p>
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileDrawerOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition-all ${
                      active
                        ? 'bg-primary-50 text-primary-700 shadow-sm'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${active ? 'text-primary-600' : 'text-gray-400'}`} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}

              <div className="pt-4 mt-4 border-t border-gray-100">
                <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                  Account
                </p>
                <Link
                  to="/profile"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  <User className="w-5 h-5 text-gray-400" />
                  Profile Settings
                </Link>
                <Link
                  to="/notifications"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <Bell className="w-5 h-5 text-gray-400" />
                    Notifications
                  </div>
                  {unreadNotifCount > 0 && (
                    <span className="badge-red">{unreadNotifCount} new</span>
                  )}
                </Link>
              </div>
            </div>

            {/* Logout Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50/50">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-danger-600 bg-danger-50 hover:bg-danger-100 active:scale-98 transition-all"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
