import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { PageLoader, EmptyState } from '../../components/ui';
import { Bell, Check, CheckCheck } from 'lucide-react';

export default function NotificationsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications?limit=50').then(r => r.data.data),
  });

  const markReadMutation = useMutation({
    mutationFn: (id) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries(['notifications']),
  });

  const markAllMutation = useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onSuccess: () => queryClient.invalidateQueries(['notifications']),
  });

  if (isLoading) return <PageLoader />;

  return (
    <div className="page-container max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-500 mt-1">{data?.unreadCount || 0} unread</p>
        </div>
        {data?.unreadCount > 0 && (
          <button onClick={() => markAllMutation.mutate()} className="btn-ghost text-sm">
            <CheckCheck className="w-4 h-4" /> Mark all read
          </button>
        )}
      </div>

      {data?.notifications?.length === 0 ? (
        <EmptyState icon={Bell} title="No notifications" description="You're all caught up!" />
      ) : (
        <div className="card divide-y divide-gray-100">
          {data?.notifications?.map((n) => (
            <div key={n._id} className={`flex items-start gap-4 p-4 ${!n.read ? 'bg-primary-50/30' : ''}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${!n.read ? 'bg-primary-100' : 'bg-gray-100'}`}>
                <Bell className={`w-5 h-5 ${!n.read ? 'text-primary-600' : 'text-gray-400'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${!n.read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>{n.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
                <p className="text-[10px] text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
              </div>
              {!n.read && (
                <button onClick={() => markReadMutation.mutate(n._id)} className="shrink-0 p-1 hover:bg-primary-100 rounded">
                  <Check className="w-4 h-4 text-primary-500" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
