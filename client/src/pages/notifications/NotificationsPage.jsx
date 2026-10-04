import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { PageLoader, EmptyState } from '../../components/ui';
import { Bell, Check, CheckCheck, ArrowRight, ExternalLink, Filter } from 'lucide-react';
import {
  getNotificationDestination,
  getNotificationMeta,
  formatRelativeTime,
} from '../../utils/notificationLinks';

export default function NotificationsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('all');

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications?limit=60').then((r) => r.data.data),
  });

  const markReadMutation = useMutation({
    mutationFn: (id) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications']);
      queryClient.invalidateQueries(['notifications-unread-count']);
      queryClient.invalidateQueries(['unread-notifications']);
    },
  });

  const markAllMutation = useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications']);
      queryClient.invalidateQueries(['notifications-unread-count']);
      queryClient.invalidateQueries(['unread-notifications']);
    },
  });

  const handleNotificationClick = (n) => {
    if (!n.read) {
      markReadMutation.mutate(n._id);
    }
    const destination = getNotificationDestination(n, user?.role);
    navigate(destination);
  };

  if (isLoading) return <PageLoader />;

  const allNotifications = data?.notifications || [];

  // Filter logic
  const filteredNotifications = allNotifications.filter((n) => {
    if (activeTab === 'unread') return !n.read;
    if (activeTab === 'repairs') {
      return (
        n.type?.startsWith('repair_') ||
        n.type?.startsWith('quotation_') ||
        n.type?.startsWith('appointment_') ||
        ['RepairRequest', 'RepairJob', 'Quotation', 'Appointment', 'Part', 'Warranty'].includes(
          n.relatedEntityType
        )
      );
    }
    if (activeTab === 'messages') {
      return n.type === 'new_message' || n.relatedEntityType === 'Message';
    }
    if (activeTab === 'community') {
      return (
        n.type?.startsWith('forum_') ||
        n.type?.startsWith('donation_') ||
        n.type?.startsWith('impact_') ||
        ['Thread', 'DonationOffer', 'CommunityNeed'].includes(n.relatedEntityType)
      );
    }
    return true;
  });

  const unreadCount = data?.unreadCount || 0;

  const tabs = [
    { id: 'all', label: 'All', count: allNotifications.length },
    { id: 'unread', label: 'Unread', count: unreadCount },
    { id: 'repairs', label: 'Repairs & Jobs' },
    { id: 'messages', label: 'Messages' },
    { id: 'community', label: 'Community & Forum' },
  ];

  return (
    <div className="page-container max-w-3xl py-6 sm:py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-100">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            Notifications
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Click any notification to jump directly to the relevant repair, chat, or request.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={() => markAllMutation.mutate()}
            disabled={markAllMutation.isPending}
            className="btn-secondary btn-sm self-start sm:self-auto flex items-center gap-1.5 font-bold shadow-2xs hover:bg-primary-50 hover:text-primary-700 hover:border-primary-200 transition-colors"
          >
            <CheckCheck className="w-4 h-4 text-primary-600" />
            <span>Mark all as read</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === tab.id
                ? 'bg-primary-600 text-white shadow-sm shadow-primary-500/20'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && tab.count > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                  activeTab === tab.id
                    ? 'bg-white/20 text-white'
                    : tab.id === 'unread'
                    ? 'bg-danger-100 text-danger-700'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Notification Cards List */}
      {filteredNotifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title={activeTab === 'unread' ? 'No unread notifications' : 'No notifications found'}
          description={
            activeTab === 'unread'
              ? "You're all caught up! There are no unread updates at this moment."
              : 'Notifications for your repairs, quotes, messages, and platform updates will appear here.'
          }
        />
      ) : (
        <div className="space-y-2.5">
          {filteredNotifications.map((n) => {
            const meta = getNotificationMeta(n);
            const Icon = meta.icon;
            const destination = getNotificationDestination(n, user?.role);

            return (
              <div
                key={n._id}
                onClick={() => handleNotificationClick(n)}
                className={`group relative flex items-start gap-4 p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer ${
                  !n.read
                    ? 'bg-primary-50/20 hover:bg-primary-50/40 border-primary-200/70 shadow-xs'
                    : 'bg-white hover:bg-gray-50/80 border-gray-100 hover:border-gray-200 hover:shadow-xs'
                }`}
              >
                {/* Category Icon */}
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${meta.bg} ${meta.color} shadow-2xs group-hover:scale-105 transition-transform`}
                >
                  <Icon className="w-5 h-5" />
                </div>

                {/* Body Content */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-gray-900 group-hover:text-primary-600 transition-colors">
                        {n.title}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200/60">
                        {meta.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] text-gray-400 font-medium">
                        {formatRelativeTime(n.createdAt)}
                      </span>

                      {!n.read && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            markReadMutation.mutate(n._id);
                          }}
                          title="Mark as read"
                          className="p-1 rounded-lg hover:bg-primary-100 text-primary-600 transition-colors"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-gray-600 leading-relaxed line-clamp-2 sm:line-clamp-3">
                    {n.message}
                  </p>

                  {/* Redirection Hint */}
                  <div className="pt-1.5 flex items-center gap-1.5 text-xs font-semibold text-primary-600 group-hover:text-primary-700">
                    <span>Open details</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                {/* Unread Accent Indicator */}
                {!n.read && (
                  <span className="w-2.5 h-2.5 rounded-full bg-primary-600 shrink-0 mt-2 ring-4 ring-primary-100 animate-pulse" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
