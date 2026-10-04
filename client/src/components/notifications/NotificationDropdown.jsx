import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, ChevronRight, Sparkles } from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import {
  getNotificationDestination,
  getNotificationMeta,
  formatRelativeTime,
} from '../../utils/notificationLinks';

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Fetch recent notifications
  const { data, isLoading } = useQuery({
    queryKey: ['notifications', 'dropdown'],
    queryFn: () => api.get('/notifications?limit=8').then((r) => r.data.data),
    enabled: isAuthenticated && isOpen,
    staleTime: 15000,
  });

  // Query unread count for the bell badge
  const { data: unreadData } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: () => api.get('/notifications/unread-count').then((r) => r.data.data),
    enabled: isAuthenticated,
    refetchInterval: 30000,
  });

  const unreadCount = unreadData?.count ?? (data?.unreadCount || 0);

  // Mutation: Mark single notification read
  const markReadMutation = useMutation({
    mutationFn: (id) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications']);
      queryClient.invalidateQueries(['notifications-unread-count']);
      queryClient.invalidateQueries(['unread-notifications']);
    },
  });

  // Mutation: Mark all read
  const markAllMutation = useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications']);
      queryClient.invalidateQueries(['notifications-unread-count']);
      queryClient.invalidateQueries(['unread-notifications']);
    },
  });

  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      markReadMutation.mutate(notification._id);
    }
    setIsOpen(false);
    const destination = getNotificationDestination(notification, user?.role);
    navigate(destination);
  };

  const notifications = data?.notifications || [];

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="p-2.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl relative active:scale-95 transition-all focus:outline-hidden"
        aria-label="Notifications"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger-500 px-1 text-[10px] font-extrabold text-white ring-2 ring-white animate-in zoom-in">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl ring-1 border border-gray-100 z-50 animate-in fade-in zoom-in-95 duration-100 overflow-hidden flex flex-col max-h-[520px]">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/70">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-gray-900">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-primary-100 text-primary-700">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllMutation.mutate()}
                disabled={markAllMutation.isPending}
                className="text-xs text-primary-600 hover:text-primary-700 font-semibold flex items-center gap-1 hover:underline active:scale-95"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* Body / Notification List */}
          <div className="overflow-y-auto divide-y divide-gray-50 flex-1 overscroll-contain">
            {isLoading ? (
              <div className="p-8 text-center text-gray-400 text-xs flex flex-col items-center gap-2">
                <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                <span>Loading notifications...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto">
                  <Bell className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-gray-700">No notifications yet</p>
                <p className="text-[11px] text-gray-400">Updates regarding repairs and messages will appear here.</p>
              </div>
            ) : (
              notifications.map((n) => {
                const meta = getNotificationMeta(n);
                const Icon = meta.icon;
                const destination = getNotificationDestination(n, user?.role);

                return (
                  <div
                    key={n._id}
                    onClick={() => handleNotificationClick(n)}
                    className={`group flex items-start gap-3 p-3.5 cursor-pointer transition-all hover:bg-gray-50 active:bg-gray-100/80 ${
                      !n.read ? 'bg-primary-50/25' : ''
                    }`}
                  >
                    {/* Visual Category Icon */}
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${meta.bg} ${meta.color} shadow-2xs group-hover:scale-105 transition-transform`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center justify-between gap-1">
                        <p
                          className={`text-xs truncate ${
                            !n.read ? 'font-bold text-gray-900' : 'font-medium text-gray-700'
                          }`}
                        >
                          {n.title}
                        </p>
                        <span className="text-[10px] text-gray-400 whitespace-nowrap shrink-0">
                          {formatRelativeTime(n.createdAt)}
                        </span>
                      </div>

                      <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed">
                        {n.message}
                      </p>

                      <div className="flex items-center gap-1 text-[10px] text-primary-600 font-semibold pt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span>Go to {meta.category.toLowerCase()}</span>
                        <ChevronRight className="w-3 h-3" />
                      </div>
                    </div>

                    {/* Unread Dot */}
                    {!n.read && (
                      <span className="w-2 h-2 rounded-full bg-primary-600 shrink-0 mt-1.5" />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-100 p-2.5 bg-gray-50/50 text-center">
            <Link
              to="/notifications"
              onClick={() => setIsOpen(false)}
              className="text-xs font-bold text-primary-600 hover:text-primary-700 hover:underline flex items-center justify-center gap-1.5 py-1"
            >
              <span>View all notifications</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
