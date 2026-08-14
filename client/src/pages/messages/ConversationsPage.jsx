import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { PageLoader, EmptyState, StatusBadge } from '../../components/ui';
import { MessageCircle, ArrowRight } from 'lucide-react';

function formatRelativeTime(dateStr) {
  const now = new Date();
  const d = new Date(dateStr);
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function ConversationsPage() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => api.get('/messages/conversations').then((r) => r.data.data),
  });

  if (isLoading) return <PageLoader />;

  const conversations = data?.conversations || [];

  return (
    <div className="page-container max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
        <p className="text-sm text-gray-500 mt-1">
          Your repair request conversations
        </p>
      </div>

      {conversations.length === 0 ? (
        <EmptyState
          icon={MessageCircle}
          title="No conversations yet"
          description="Messages will appear here when you start communicating with technicians or item owners about repair requests."
        />
      ) : (
        <div className="card divide-y divide-gray-100">
          {conversations.map((conv) => (
            <Link
              key={conv.repairRequestId}
              to={`/repair-requests/${conv.repairRequestId}`}
              className="flex items-start gap-4 p-4 hover:bg-gray-50 transition-colors group"
            >
              {/* Avatar */}
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${
                  conv.unreadCount > 0
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {conv.otherParticipant?.fullName?.charAt(0)?.toUpperCase() ||
                  '?'}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p
                    className={`text-sm truncate ${
                      conv.unreadCount > 0
                        ? 'font-semibold text-gray-900'
                        : 'font-medium text-gray-700'
                    }`}
                  >
                    {conv.otherParticipant?.fullName || 'User'}
                  </p>
                  <span className="text-[10px] text-gray-400 shrink-0">
                    {formatRelativeTime(conv.lastMessage.createdAt)}
                  </span>
                </div>

                <p className="text-xs text-gray-500 mt-0.5 truncate">
                  {conv.itemTitle}
                </p>

                <div className="flex items-center justify-between gap-2 mt-1">
                  <p
                    className={`text-xs truncate ${
                      conv.unreadCount > 0 ? 'text-gray-700 font-medium' : 'text-gray-400'
                    }`}
                  >
                    {conv.lastMessage.senderId === user?.userId ? (
                      <span className="text-gray-400">You: </span>
                    ) : null}
                    {conv.lastMessage.content}
                  </p>

                  <div className="flex items-center gap-2 shrink-0">
                    {conv.unreadCount > 0 && (
                      <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-primary-600 text-white text-[10px] font-bold rounded-full">
                        {conv.unreadCount}
                      </span>
                    )}
                    <StatusBadge status={conv.requestStatus} />
                  </div>
                </div>
              </div>

              {/* Arrow */}
              <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-400 shrink-0 mt-3 transition-colors" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
