import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import {
  LayoutDashboard,
  Package,
  Wrench,
  MessageCircle,
  User,
  Plus,
  Heart,
  ClipboardList,
  Users,
  Settings,
  ShieldAlert,
} from 'lucide-react';

export default function MobileBottomNav() {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  // Live unread message count query
  const { data: unreadData } = useQuery({
    queryKey: ['unread-messages-count'],
    queryFn: () => api.get('/messages/unread-count').then((r) => r.data.data),
    enabled: !!isAuthenticated,
    refetchInterval: 15000,
  });

  if (!isAuthenticated) return null;

  // Hide bottom nav in dedicated full-screen messaging view to prevent composer clash
  if (location.pathname.startsWith('/repair-requests/') && location.pathname.endsWith('/messages')) {
    return null;
  }

  const unreadCount = unreadData?.unreadCount || 0;

  // Role-specific bottom navigation tabs
  const getNavTabs = () => {
    switch (user?.role) {
      case 'technician':
        return [
          { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
          { label: 'Requests', path: '/repair-requests', icon: ClipboardList },
          { label: 'My Jobs', path: '/repair-jobs', icon: Wrench },
          { label: 'Messages', path: '/messages', icon: MessageCircle, badge: unreadCount },
          { label: 'Profile', path: '/profile', icon: User },
        ];
      case 'organization':
        return [
          { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
          { label: 'Donations', path: '/donations', icon: Heart },
          { label: 'Messages', path: '/messages', icon: MessageCircle, badge: unreadCount },
          { label: 'Profile', path: '/profile', icon: User },
        ];
      case 'admin':
        return [
          { label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
          { label: 'Users', path: '/admin/users', icon: Users },
          { label: 'Verify', path: '/admin/verifications', icon: Settings },
          { label: 'Safety', path: '/admin/safety', icon: ShieldAlert },
          { label: 'Profile', path: '/profile', icon: User },
        ];
      case 'owner':
      default:
        return [
          { label: 'Home', path: '/dashboard', icon: LayoutDashboard },
          { label: 'My Items', path: '/items', icon: Package },
          { label: 'New', path: '/repair-requests/new', icon: Plus, isPrimaryAction: true },
          { label: 'Messages', path: '/messages', icon: MessageCircle, badge: unreadCount },
          { label: 'Profile', path: '/profile', icon: User },
        ];
    }
  };

  const tabs = getNavTabs();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-white/95 backdrop-blur-lg border-t border-gray-200/80 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-16 px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive =
            location.pathname === tab.path ||
            (tab.path !== '/dashboard' &&
              tab.path !== '/' &&
              location.pathname.startsWith(tab.path));

          // Center elevated Action button for Owner
          if (tab.isPrimaryAction) {
            return (
              <Link
                key={tab.path}
                to={tab.path}
                className="relative -top-3 flex flex-col items-center group active:scale-95 transition-transform"
                title="New Request"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-primary-600 to-emerald-400 text-white flex items-center justify-center shadow-lg shadow-primary-500/30 border-2 border-white">
                  <Plus className="w-6 h-6 stroke-[2.5]" />
                </div>
                <span className="text-[10px] font-bold text-primary-700 mt-0.5">
                  {tab.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all relative ${
                isActive
                  ? 'text-primary-600 font-semibold'
                  : 'text-gray-500 hover:text-gray-800'
              } active:scale-95`}
            >
              <div className="relative">
                {tab.label === 'Profile' && user?.profileImage?.url ? (
                  <div
                    className={`w-6 h-6 rounded-full overflow-hidden border ${
                      isActive ? 'border-primary-600 ring-2 ring-primary-600/30' : 'border-gray-300'
                    }`}
                  >
                    <img
                      src={user.profileImage.url}
                      alt="Profile"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                ) : (
                  <Icon
                    className={`w-5 h-5 transition-transform ${
                      isActive ? 'scale-110 text-primary-600 stroke-[2.2]' : ''
                    }`}
                  />
                )}
                {tab.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 bg-danger-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 border border-white shadow-sm">
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] mt-1 tracking-tight ${
                  isActive ? 'text-primary-700 font-bold' : 'text-gray-500'
                }`}
              >
                {tab.label}
              </span>
              {isActive && (
                <div className="w-1 h-1 bg-primary-600 rounded-full mt-0.5 animate-pulse" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
