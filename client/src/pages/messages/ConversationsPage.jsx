import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { EmptyState, StatusBadge } from '../../components/ui';
import {
  MessageCircle,
  Search,
  Check,
  CheckCheck,
  ShieldCheck,
  Package,
  Sparkles,
  Inbox,
  Filter,
} from 'lucide-react';
import RepairConversation from '../../components/chat/RepairConversation';

function formatRelativeTime(dateStr) {
  if (!dateStr) return '';
  const now = new Date();
  const d = new Date(dateStr);
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function ConversationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedRequestId = searchParams.get('id');

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'unread'

  const { data, isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => api.get('/messages/conversations').then((r) => r.data.data),
    refetchInterval: 10000,
  });

  const conversations = data?.conversations || [];

  // Filtered & searched conversations
  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      // 1. Unread filter
      if (activeFilter === 'unread' && c.unreadCount === 0) return false;

      // 2. Text Search
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const participantName = (
        c.otherParticipant?.professionalName ||
        c.otherParticipant?.fullName ||
        ''
      ).toLowerCase();
      const itemTitle = (c.itemTitle || '').toLowerCase();
      const lastMessage = (c.lastMessage?.content || '').toLowerCase();

      return (
        participantName.includes(q) ||
        itemTitle.includes(q) ||
        lastMessage.includes(q)
      );
    });
  }, [conversations, searchQuery, activeFilter]);

  // Active selected conversation ID (defaults to first conversation on desktop if none selected)
  const activeConversationId = useMemo(() => {
    if (selectedRequestId) return selectedRequestId;
    if (conversations.length > 0 && window.innerWidth >= 1024) {
      return conversations[0].repairRequestId;
    }
    return null;
  }, [selectedRequestId, conversations]);

  const handleSelectConversation = (repairRequestId) => {
    // On mobile (< 1024px), navigate to dedicated full-screen page
    if (window.innerWidth < 1024) {
      navigate(`/repair-requests/${repairRequestId}/messages`);
    } else {
      setSearchParams({ id: repairRequestId });
    }
  };

  return (
    <div className="page-container max-w-[1440px] px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
            <MessageCircle className="w-6 h-6 text-primary-600" />
            Messages
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Real-time conversations between item owners and technicians
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeFilter === 'all'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            All Messages
          </button>
          <button
            onClick={() => setActiveFilter('unread')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeFilter === 'unread'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            <span>Unread</span>
            {conversations.filter((c) => c.unreadCount > 0).length > 0 && (
              <span className="w-2 h-2 rounded-full bg-danger-500 animate-pulse" />
            )}
          </button>
        </div>
      </div>

      {/* Main Master-Detail Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)] gap-6 items-start">
        {/* ========================================================================= */}
        {/* LEFT COLUMN: Conversation List & Search */}
        {/* ========================================================================= */}
        <div className="card flex flex-col bg-white border border-gray-200/90 shadow-xs rounded-2xl overflow-hidden h-[calc(100dvh-180px)] min-h-[550px]">
          {/* Search Box */}
          <div className="p-3 border-b border-gray-100 bg-gray-50/50">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search messages, items, names…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
              />
            </div>
          </div>

          {/* List Content */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {isLoading ? (
              <div className="space-y-2 p-3">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="flex gap-3 p-3 animate-pulse">
                    <div className="w-11 h-11 rounded-full bg-gray-200 shrink-0" />
                    <div className="flex-1 space-y-2 py-1">
                      <div className="h-3 bg-gray-200 rounded w-2/3" />
                      <div className="h-2.5 bg-gray-100 rounded w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center justify-center h-full">
                <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400 mb-3">
                  <Inbox className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-gray-800 text-sm">
                  {searchQuery || activeFilter !== 'all'
                    ? 'No matching conversations'
                    : 'No conversations yet'}
                </h4>
                <p className="text-xs text-gray-500 mt-1 max-w-xs leading-relaxed">
                  {searchQuery || activeFilter !== 'all'
                    ? 'Try adjusting your search or filters.'
                    : 'Messages will appear when you discuss repair requests with technicians.'}
                </p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = conv.repairRequestId === activeConversationId;
                const isSentByMe =
                  (conv.lastMessage.senderId?.toString() || '') ===
                  (user?.userId || user?._id)?.toString();

                return (
                  <button
                    key={conv.repairRequestId}
                    onClick={() => handleSelectConversation(conv.repairRequestId)}
                    className={`w-full text-left p-3.5 flex items-start gap-3 transition-colors relative min-h-[72px] ${
                      isSelected
                        ? 'bg-emerald-50/70 hover:bg-emerald-50'
                        : conv.unreadCount > 0
                        ? 'bg-white hover:bg-gray-50 font-medium'
                        : 'bg-white hover:bg-gray-50/80'
                    }`}
                  >
                    {/* Active Left Indicator Bar on Desktop */}
                    {isSelected && (
                      <div className="hidden lg:block absolute left-0 top-0 bottom-0 w-1 bg-emerald-600 rounded-r" />
                    )}

                    {/* Participant Avatar */}
                    <div className="relative shrink-0 mt-0.5">
                      <div className="w-11 h-11 rounded-full bg-primary-100 border border-primary-200 flex items-center justify-center font-bold text-primary-700 text-sm overflow-hidden shadow-inner">
                        {conv.otherParticipant?.profileImage?.url ? (
                          <img
                            src={conv.otherParticipant.profileImage.url}
                            alt={conv.otherParticipant.fullName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          conv.otherParticipant?.fullName?.charAt(0) || 'U'
                        )}
                      </div>
                      {conv.otherParticipant?.role === 'technician' && (
                        <span
                          className="absolute -bottom-0.5 -right-0.5 bg-white rounded-full p-0.5 shadow-xs"
                          title="Verified Technician"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 fill-emerald-100" />
                        </span>
                      )}
                    </div>

                    {/* Conversation Body */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1.5">
                        <span
                          className={`text-xs truncate ${
                            conv.unreadCount > 0
                              ? 'font-bold text-gray-900'
                              : 'font-semibold text-gray-800'
                          }`}
                        >
                          {conv.otherParticipant?.professionalName ||
                            conv.otherParticipant?.fullName ||
                            'User'}
                        </span>
                        <span className="text-[10px] text-gray-400 shrink-0 font-medium">
                          {formatRelativeTime(conv.lastMessage.createdAt)}
                        </span>
                      </div>

                      {/* Item Title */}
                      <p className="text-[11px] text-gray-500 truncate mt-0.5 flex items-center gap-1 font-medium">
                        <Package className="w-3 h-3 text-gray-400 shrink-0" />
                        <span className="truncate">{conv.itemTitle}</span>
                      </p>

                      {/* Last Message Preview & Unread Badge */}
                      <div className="flex items-center justify-between gap-2 mt-1">
                        <p
                          className={`text-[11px] truncate flex items-center gap-1 ${
                            conv.unreadCount > 0
                              ? 'font-semibold text-gray-900'
                              : 'text-gray-500'
                          }`}
                        >
                          {isSentByMe && (
                            <span className="text-gray-400 flex items-center shrink-0">
                              {conv.lastMessage.readAt ? (
                                <CheckCheck className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Check className="w-3 h-3 text-gray-400" />
                              )}
                              <span className="ml-0.5">You:</span>
                            </span>
                          )}
                          <span className="truncate">{conv.lastMessage.content}</span>
                        </p>

                        {conv.unreadCount > 0 && (
                          <span className="min-w-[18px] h-[18px] px-1.5 bg-emerald-600 text-white text-[10px] font-black rounded-full flex items-center justify-center shrink-0 shadow-xs">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: Active Selected Conversation (Desktop ≥ 1024px) */}
        {/* ========================================================================= */}
        <div className="hidden lg:block h-[calc(100dvh-180px)] min-h-[550px]">
          {activeConversationId ? (
            <RepairConversation
              key={activeConversationId}
              repairRequestId={activeConversationId}
              showBackButton={false}
              isFullScreen={false}
              customHeight="100%"
            />
          ) : (
            <div className="card flex flex-col items-center justify-center h-full text-center p-8 bg-gray-50/50 border border-dashed border-gray-200 rounded-2xl">
              <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 border border-emerald-100 shadow-xs">
                <Sparkles className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-gray-900 text-base">Select a conversation</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-sm leading-relaxed">
                Choose a repair request from the left list to view message history, exchange updates, and communicate in real-time.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
