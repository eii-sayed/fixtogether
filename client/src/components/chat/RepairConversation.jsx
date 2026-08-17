import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { StatusBadge } from '../ui';
import { toast } from 'sonner';
import {
  Send,
  Loader2,
  ArrowLeft,
  ShieldCheck,
  MoreVertical,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Check,
  CheckCheck,
  AlertCircle,
  WifiOff,
  Wrench,
  ExternalLink,
  Package,
  Sparkles,
} from 'lucide-react';

/**
 * Format date for message group dividers ("Today", "Yesterday", "18 Aug 2026")
 */
function formatDateDivider(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((today - target) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return d.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

/**
 * Format time for message metadata ("10:42 AM")
 */
function formatMessageTime(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function RepairConversation({
  repairRequestId,
  onBack,
  showBackButton = false,
  isFullScreen = false,
  customHeight,
}) {
  const { user } = useAuth();
  const { socket, connected, joinChat, leaveChat, emitTyping, emitStopTyping } = useSocket();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Local state
  const draftKey = `fixtogether_chat_draft_${repairRequestId}`;
  const [input, setInput] = useState(() => sessionStorage.getItem(draftKey) || '');
  const [typingUser, setTypingUser] = useState(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMoreOlder, setHasMoreOlder] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [failedMessages, setFailedMessages] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);

  // Refs
  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const textareaRef = useRef(null);
  const typingTimerRef = useRef(null);
  const isTypingRef = useRef(false);
  const cursorRef = useRef(null);
  const isScrolledNearBottomRef = useRef(true);

  // Save draft on change
  const handleInputChange = (e) => {
    const val = e.target.value;
    setInput(val);
    sessionStorage.setItem(draftKey, val);

    // Typing indicator
    if (!isTypingRef.current && val.trim().length > 0) {
      isTypingRef.current = true;
      emitTyping(repairRequestId);
    }

    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      if (isTypingRef.current) {
        isTypingRef.current = false;
        emitStopTyping(repairRequestId);
      }
    }, 2500);
  };

  // Fetch initial messages & metadata
  const {
    data: chatData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['messages', repairRequestId],
    queryFn: () =>
      api.get(`/messages/${repairRequestId}?limit=30`).then((r) => r.data.data),
    enabled: !!repairRequestId,
    staleTime: 5000,
  });

  const messages = useMemo(() => chatData?.messages || [], [chatData?.messages]);
  const otherParticipant = chatData?.otherParticipant;
  const repairContext = chatData?.repairContext;

  // Send Message Mutation
  const sendMutation = useMutation({
    mutationFn: async ({ content, clientTempId }) => {
      const res = await api.post(`/messages/${repairRequestId}`, {
        content,
        clientTempId,
      });
      return res.data.data;
    },
    onMutate: async ({ content, clientTempId }) => {
      // Optimistic update
      const tempMessage = {
        _id: clientTempId,
        clientTempId,
        content,
        repairRequest: repairRequestId,
        sender: {
          _id: user?.userId || user?._id,
          fullName: user?.fullName,
          profileImage: user?.profileImage,
          role: user?.role,
        },
        recipient: otherParticipant?._id,
        messageType: 'text',
        createdAt: new Date().toISOString(),
        isSending: true,
      };

      queryClient.setQueryData(['messages', repairRequestId], (old) => {
        if (!old) return { messages: [tempMessage], hasMore: false, cursor: null };
        return {
          ...old,
          messages: [...old.messages, tempMessage],
        };
      });

      // Clear input & draft
      setInput('');
      sessionStorage.removeItem(draftKey);
      if (textareaRef.current) textareaRef.current.style.height = 'auto';

      scrollToBottom(true);
      return { tempMessage };
    },
    onSuccess: (data, variables) => {
      // Replace optimistic message with confirmed server message
      queryClient.setQueryData(['messages', repairRequestId], (old) => {
        if (!old) return { messages: [data.message], hasMore: false, cursor: null };
        const updated = old.messages.map((m) =>
          m.clientTempId === variables.clientTempId || m._id === variables.clientTempId
            ? data.message
            : m
        );
        // Ensure no duplicate if already added
        if (!updated.some((m) => m._id === data.message._id)) {
          updated.push(data.message);
        }
        return { ...old, messages: updated };
      });

      // Remove from failed list if it was a retry
      setFailedMessages((prev) => prev.filter((id) => id !== variables.clientTempId));
    },
    onError: (err, variables, context) => {
      toast.error(err.response?.data?.message || 'Message could not be sent');
      if (variables.clientTempId) {
        setFailedMessages((prev) => [...prev, variables.clientTempId]);
      }
      queryClient.setQueryData(['messages', repairRequestId], (old) => {
        if (!old) return old;
        return {
          ...old,
          messages: old.messages.map((m) =>
            m.clientTempId === variables.clientTempId ? { ...m, isFailed: true, isSending: false } : m
          ),
        };
      });
    },
  });

  // Mark as read mutation
  const markReadMutation = useMutation({
    mutationFn: () => api.patch(`/messages/${repairRequestId}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries(['unread-messages-count']);
      queryClient.invalidateQueries(['conversations']);
    },
  });

  // Scroll to bottom helper
  const scrollToBottom = useCallback((smooth = true) => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView?.({
        behavior: smooth ? 'smooth' : 'auto',
        block: 'end',
      });
    });
  }, []);

  // Handle scroll detection for "Scroll to bottom" button and older message pagination
  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isScrolledNearBottomRef.current = distanceFromBottom < 100;
    setShowScrollBottom(distanceFromBottom > 200);

    // Upward infinite scroll trigger
    if (el.scrollTop < 60 && hasMoreOlder && !loadingOlder && cursorRef.current) {
      loadOlderMessages();
    }
  };

  // Load older messages upward
  const loadOlderMessages = async () => {
    if (loadingOlder || !hasMoreOlder || !cursorRef.current) return;
    setLoadingOlder(true);

    const el = scrollContainerRef.current;
    const previousScrollHeight = el?.scrollHeight || 0;

    try {
      const res = await api.get(
        `/messages/${repairRequestId}?limit=30&before=${cursorRef.current}`
      );
      const olderData = res.data.data;

      if (olderData.cursor) cursorRef.current = olderData.cursor;
      setHasMoreOlder(olderData.hasMore);

      queryClient.setQueryData(['messages', repairRequestId], (old) => {
        if (!old) return olderData;
        const existingIds = new Set(old.messages.map((m) => m._id));
        const newUniqueOlder = olderData.messages.filter((m) => !existingIds.has(m._id));

        return {
          ...old,
          messages: [...newUniqueOlder, ...old.messages],
          hasMore: olderData.hasMore,
          cursor: olderData.cursor,
        };
      });

      // Retain scroll position relative to previous top
      requestAnimationFrame(() => {
        if (el) {
          el.scrollTop = el.scrollHeight - previousScrollHeight;
        }
      });
    } catch (err) {
      logger.error('Failed to load older messages');
    } finally {
      setLoadingOlder(false);
    }
  };

  // Join/leave socket room
  useEffect(() => {
    if (repairRequestId) {
      joinChat(repairRequestId);
      return () => leaveChat(repairRequestId);
    }
  }, [repairRequestId, joinChat, leaveChat]);

  // Real-time socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg) => {
      if (msg.repairRequest !== repairRequestId) return;

      // Ignore if sent by self and already in cache
      const currentUserId = user?.userId || user?._id;
      const senderId = msg.sender?._id || msg.sender;
      if (senderId === currentUserId) return;

      queryClient.setQueryData(['messages', repairRequestId], (old) => {
        if (!old) return { messages: [msg], hasMore: false, cursor: null };
        if (old.messages.some((m) => m._id === msg._id)) return old;
        return { ...old, messages: [...old.messages, msg] };
      });

      // If user was near bottom, auto-scroll to show incoming message
      if (isScrolledNearBottomRef.current) {
        scrollToBottom(true);
      }

      // Mark as read immediately since user is actively viewing this room
      markReadMutation.mutate();
    };

    const handleTyping = ({ userId: typerId, fullName }) => {
      const currentUserId = user?.userId || user?._id;
      if (typerId !== currentUserId) {
        setTypingUser(fullName || 'Participant');
      }
    };

    const handleStopTyping = ({ userId: typerId }) => {
      const currentUserId = user?.userId || user?._id;
      if (typerId !== currentUserId) {
        setTypingUser(null);
      }
    };

    const handleReadReceipt = ({ readBy, readAt }) => {
      const currentUserId = user?.userId || user?._id;
      if (readBy !== currentUserId) {
        queryClient.setQueryData(['messages', repairRequestId], (old) => {
          if (!old) return old;
          return {
            ...old,
            messages: old.messages.map((m) => {
              const mSenderId = m.sender?._id || m.sender;
              return mSenderId === currentUserId && !m.readAt ? { ...m, readAt } : m;
            }),
          };
        });
      }
    };

    socket.on('chat:message', handleNewMessage);
    socket.on('chat:typing', handleTyping);
    socket.on('chat:stop-typing', handleStopTyping);
    socket.on('chat:read', handleReadReceipt);

    return () => {
      socket.off('chat:message', handleNewMessage);
      socket.off('chat:typing', handleTyping);
      socket.off('chat:stop-typing', handleStopTyping);
      socket.off('chat:read', handleReadReceipt);
    };
  }, [socket, repairRequestId, user, queryClient, scrollToBottom, markReadMutation]);

  // Initial scroll & auto-read on load
  useEffect(() => {
    if (chatData) {
      if (chatData.cursor) cursorRef.current = chatData.cursor;
      setHasMoreOlder(!!chatData.hasMore);

      if (messages.length > 0) {
        scrollToBottom(false);

        const currentUserId = user?.userId || user?._id;
        const hasUnread = messages.some(
          (m) =>
            m.recipient === currentUserId &&
            !m.readAt &&
            (m.sender?._id || m.sender) !== currentUserId
        );
        if (hasUnread) {
          markReadMutation.mutate();
        }
      }
    }
  }, [chatData, repairRequestId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle Send action
  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || sendMutation.isPending) return;

    if (isTypingRef.current) {
      isTypingRef.current = false;
      clearTimeout(typingTimerRef.current);
      emitStopTyping(repairRequestId);
    }

    const clientTempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    sendMutation.mutate({ content: trimmed, clientTempId });
  };

  // Retry failed message
  const handleRetry = (failedMsg) => {
    sendMutation.mutate({
      content: failedMsg.content,
      clientTempId: failedMsg.clientTempId || failedMsg._id,
    });
  };

  // Keyboard controls
  const handleKeyDown = (e) => {
    // Desktop: Enter sends, Shift+Enter inserts newline
    // Mobile: Dedicated send button, Enter inserts newline
    const isMobile = window.innerWidth < 768;
    if (!isMobile && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Group messages chronologically by date and sender
  const groupedTimeline = useMemo(() => {
    const items = [];
    let lastDate = null;
    let lastSenderId = null;

    messages.forEach((msg, idx) => {
      const msgDate = formatDateDivider(msg.createdAt);
      if (msgDate !== lastDate) {
        items.push({ type: 'divider', dateLabel: msgDate, id: `div-${idx}` });
        lastDate = msgDate;
        lastSenderId = null; // reset grouping across date boundaries
      }

      if (msg.messageType === 'system') {
        items.push({ type: 'system', msg, id: msg._id });
        lastSenderId = null;
        return;
      }

      const senderId = (msg.sender?._id || msg.sender)?.toString();
      const currentUserId = (user?.userId || user?._id)?.toString();
      const isSent = senderId === currentUserId;
      const isFirstInGroup = senderId !== lastSenderId;

      items.push({
        type: 'message',
        msg,
        isSent,
        isFirstInGroup,
        id: msg._id || msg.clientTempId,
      });

      lastSenderId = senderId;
    });

    return items;
  }, [messages, user]);

  return (
    <div
      className={`card flex flex-col bg-white border border-gray-200/90 shadow-sm overflow-hidden ${
        isFullScreen
          ? 'h-full min-h-full rounded-none border-0'
          : 'rounded-2xl'
      }`}
      style={{
        height: isFullScreen ? '100%' : customHeight || '620px',
        maxHeight: isFullScreen ? '100%' : 'calc(100dvh - 110px)',
      }}
    >
      {/* ========================================================================= */}
      {/* 1. CONVERSATION HEADER */}
      {/* ========================================================================= */}
      <div className="px-4 py-3 border-b border-gray-100 bg-white/95 backdrop-blur-md flex items-center justify-between gap-3 shrink-0 z-10">
        <div className="flex items-center gap-3 min-w-0">
          {showBackButton && (
            <button
              onClick={onBack || (() => navigate(-1))}
              className="p-2 -ml-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl active:scale-95 transition-all"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          {/* Participant Avatar */}
          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-full bg-primary-100 border border-primary-200 flex items-center justify-center font-bold text-primary-700 text-sm overflow-hidden shadow-inner">
              {otherParticipant?.profileImage?.url ? (
                <img
                  src={otherParticipant.profileImage.url}
                  alt={otherParticipant.fullName}
                  className="w-full h-full object-cover"
                />
              ) : (
                otherParticipant?.fullName?.charAt(0) || 'U'
              )}
            </div>
            {otherParticipant?.role === 'technician' && (
              <span
                className="absolute -bottom-0.5 -right-0.5 bg-white rounded-full p-0.5 shadow-xs"
                title="Verified Technician"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 fill-emerald-100" />
              </span>
            )}
          </div>

          {/* Participant Identity */}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-bold text-sm text-gray-900 truncate">
                {otherParticipant?.professionalName || otherParticipant?.fullName || 'Participant'}
              </h3>
            </div>
            <p className="text-[11px] text-gray-500 truncate flex items-center gap-1.5">
              <span className="capitalize">{otherParticipant?.role || 'User'}</span>
              {otherParticipant?.city && <span>• {otherParticipant.city}</span>}
            </p>
          </div>
        </div>

        {/* Header Actions Menu */}
        <div className="relative shrink-0">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl active:scale-95 transition-all"
            aria-label="Conversation Options"
            aria-expanded={menuOpen}
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-xl ring-1 border border-gray-100 py-1.5 z-30 animate-in fade-in zoom-in-95 text-xs">
                {otherParticipant?._id && otherParticipant.role === 'technician' && (
                  <Link
                    to={`/technicians/${otherParticipant._id}`}
                    className="flex items-center gap-2 px-3.5 py-2 text-gray-700 hover:bg-gray-50"
                    onClick={() => setMenuOpen(false)}
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                    View Technician Profile
                  </Link>
                )}
                <Link
                  to={`/repair-requests/${repairRequestId}`}
                  className="flex items-center gap-2 px-3.5 py-2 text-gray-700 hover:bg-gray-50"
                  onClick={() => setMenuOpen(false)}
                >
                  <Wrench className="w-3.5 h-3.5 text-gray-400" />
                  View Repair Details
                </Link>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. REPAIR CONTEXT STRIP */}
      {/* ========================================================================= */}
      {repairContext && (
        <Link
          to={`/repair-requests/${repairRequestId}`}
          className="px-4 py-2 bg-gray-50/90 hover:bg-gray-100/80 border-b border-gray-100 flex items-center justify-between gap-3 text-xs transition-colors shrink-0 group"
          title="Click to view full repair request"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {repairContext.itemThumbnail ? (
              <img
                src={repairContext.itemThumbnail}
                alt="Item thumbnail"
                className="w-7 h-7 rounded-lg object-cover border border-gray-200 shrink-0"
              />
            ) : (
              <div className="w-7 h-7 rounded-lg bg-gray-200 flex items-center justify-center text-gray-500 shrink-0">
                <Package className="w-3.5 h-3.5" />
              </div>
            )}
            <div className="truncate">
              <span className="font-semibold text-gray-800 group-hover:text-primary-700 truncate">
                {repairContext.itemTitle}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <StatusBadge status={repairContext.requestStatus} />
          </div>
        </Link>
      )}

      {/* ========================================================================= */}
      {/* 3. CONNECTION STATUS BANNER (Offline Notice) */}
      {/* ========================================================================= */}
      {!connected && (
        <div className="bg-amber-500/10 border-b border-amber-200 px-4 py-1.5 flex items-center justify-center gap-2 text-[11px] font-semibold text-amber-800 shrink-0">
          <WifiOff className="w-3.5 h-3.5 text-amber-600" />
          <span>You are currently offline. Reconnecting…</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MESSAGE HISTORY CONTAINER */}
      {/* ========================================================================= */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50/40 relative"
      >
        {/* Loading State Skeleton */}
        {isLoading ? (
          <div className="space-y-4 py-6">
            <div className="flex gap-2 max-w-[70%]">
              <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse shrink-0" />
              <div className="h-10 bg-gray-200 rounded-2xl rounded-tl-none w-48 animate-pulse" />
            </div>
            <div className="flex gap-2 max-w-[70%] ml-auto flex-row-reverse">
              <div className="h-14 bg-primary-100 rounded-2xl rounded-tr-none w-56 animate-pulse" />
            </div>
            <div className="flex gap-2 max-w-[70%]">
              <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse shrink-0" />
              <div className="h-12 bg-gray-200 rounded-2xl rounded-tl-none w-52 animate-pulse" />
            </div>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <AlertCircle className="w-8 h-8 text-danger-500 mb-2" />
            <p className="text-sm font-bold text-gray-800">Messages could not be loaded</p>
            <p className="text-xs text-gray-500 mt-0.5">Check your connection and try again.</p>
            <button onClick={() => refetch()} className="btn-outline btn-sm text-xs mt-3">
              <RotateCcw className="w-3.5 h-3.5" /> Retry
            </button>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12 max-w-sm mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-primary-50 flex items-center justify-center text-primary-600 mb-3 border border-primary-100">
              <Sparkles className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-gray-900 text-sm">No messages yet</h4>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              Start a conversation about this repair request. Never share passwords, PINs, or sensitive credentials.
            </p>
          </div>
        ) : (
          <>
            {/* Load Older Messages Trigger */}
            {hasMoreOlder && (
              <div className="flex justify-center pt-1 pb-2">
                <button
                  onClick={loadOlderMessages}
                  disabled={loadingOlder}
                  className="px-3 py-1 bg-white border border-gray-200 rounded-full text-[11px] font-semibold text-gray-600 hover:bg-gray-50 shadow-xs flex items-center gap-1.5 transition-all"
                >
                  {loadingOlder ? (
                    <Loader2 className="w-3 h-3 animate-spin text-primary-600" />
                  ) : (
                    <ChevronUp className="w-3 h-3 text-gray-400" />
                  )}
                  <span>{loadingOlder ? 'Loading older messages…' : 'Load older messages'}</span>
                </button>
              </div>
            )}

            {/* Timeline Stream */}
            {groupedTimeline.map((item) => {
              // 1. Date Divider
              if (item.type === 'divider') {
                return (
                  <div key={item.id} className="flex items-center gap-3 my-4">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-white/80 px-2.5 py-0.5 rounded-full border border-gray-100">
                      {item.dateLabel}
                    </span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                );
              }

              // 2. System Workflow Event Notice
              if (item.type === 'system') {
                return (
                  <div key={item.id} className="flex justify-center my-3">
                    <div className="bg-gray-100 text-gray-600 text-[11px] font-medium px-3.5 py-1.5 rounded-full border border-gray-200/60 shadow-2xs max-w-sm text-center">
                      {item.msg.content}
                    </div>
                  </div>
                );
              }

              // 3. User Message Bubble (Incoming / Outgoing)
              const msg = item.msg;
              const isSent = item.isSent;

              return (
                <div
                  key={item.id}
                  className={`flex gap-2 group ${isSent ? 'justify-end' : 'justify-start'}`}
                >
                  {/* Incoming Avatar */}
                  {!isSent && item.isFirstInGroup && (
                    <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600 overflow-hidden shrink-0 mt-1 shadow-2xs">
                      {msg.sender?.profileImage?.url ? (
                        <img
                          src={msg.sender.profileImage.url}
                          alt={msg.sender.fullName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        msg.sender?.fullName?.charAt(0) || 'U'
                      )}
                    </div>
                  )}
                  {!isSent && !item.isFirstInGroup && <div className="w-7 shrink-0" />}

                  {/* Message Bubble Body */}
                  <div
                    className={`flex flex-col max-w-[82%] sm:max-w-[75%] ${
                      isSent ? 'items-end' : 'items-start'
                    }`}
                  >
                    {/* Sender Name on first incoming message */}
                    {!isSent && item.isFirstInGroup && (
                      <span className="text-[10px] font-bold text-gray-500 mb-0.5 px-1">
                        {msg.sender?.fullName}
                      </span>
                    )}

                    <div
                      className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words shadow-2xs transition-shadow ${
                        isSent
                          ? msg.isFailed
                            ? 'bg-danger-50 text-danger-900 border border-danger-200 rounded-tr-xs'
                            : 'bg-emerald-600 text-white rounded-tr-xs'
                          : 'bg-white text-gray-800 border border-gray-200/80 rounded-tl-xs'
                      }`}
                      style={{ overflowWrap: 'anywhere' }}
                    >
                      {msg.content}
                    </div>

                    {/* Metadata: Time & Delivery Status */}
                    <div
                      className={`flex items-center gap-1.5 mt-0.5 px-1 text-[10px] text-gray-400 ${
                        isSent ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <span>{formatMessageTime(msg.createdAt)}</span>

                      {isSent && (
                        <>
                          {msg.isSending ? (
                            <span className="text-gray-400 italic">Sending…</span>
                          ) : msg.isFailed ? (
                            <button
                              onClick={() => handleRetry(msg)}
                              className="text-danger-600 font-bold hover:underline flex items-center gap-0.5"
                            >
                              <RotateCcw className="w-2.5 h-2.5" /> Retry
                            </button>
                          ) : msg.readAt ? (
                            <span className="flex items-center gap-0.5 text-emerald-600 font-semibold" title={`Read at ${formatMessageTime(msg.readAt)}`}>
                              <CheckCheck className="w-3.5 h-3.5" /> Read
                            </span>
                          ) : (
                            <span className="flex items-center gap-0.5 text-gray-400" title="Delivered">
                              <Check className="w-3 h-3" />
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            <div ref={messagesEndRef} className="h-px" />
          </>
        )}
      </div>

      {/* Floating Scroll to Latest Button */}
      {showScrollBottom && (
        <button
          onClick={() => scrollToBottom(true)}
          className="absolute right-6 bottom-24 p-2 bg-white/95 text-gray-700 border border-gray-200 shadow-lg rounded-full hover:bg-gray-50 active:scale-95 transition-all z-20 flex items-center gap-1 text-xs font-semibold"
          aria-label="Scroll to latest messages"
        >
          <ChevronDown className="w-4 h-4 text-primary-600" />
        </button>
      )}

      {/* Typing Indicator Bar with Live Region */}
      <div
        aria-live="polite"
        className="min-h-[22px] px-4 py-0.5 text-[11px] text-gray-500 italic flex items-center gap-1.5 bg-white shrink-0 border-t border-gray-50"
      >
        {typingUser ? (
          <>
            <span className="flex items-center gap-1 text-emerald-700 font-medium">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" />
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.4s]" />
            </span>
            <span>{typingUser} is typing…</span>
          </>
        ) : null}
      </div>

      {/* ========================================================================= */}
      {/* 5. MESSAGE COMPOSER */}
      {/* ========================================================================= */}
      <div className="p-3 bg-white border-t border-gray-100 shrink-0 pb-[max(12px,env(safe-area-inset-bottom))]">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative bg-gray-50 border border-gray-200 rounded-2xl focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-500/20 focus-within:bg-white transition-all overflow-hidden">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${otherParticipant?.fullName || 'technician'}…`}
              rows={1}
              maxLength={2000}
              className="w-full px-3.5 py-2.5 bg-transparent border-0 focus:outline-none resize-none text-sm text-gray-900 placeholder:text-gray-400 max-h-32"
              style={{ minHeight: '40px' }}
              onInput={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
              }}
            />

            {/* Approaching Character Count Limit Indicator */}
            {input.length > 1800 && (
              <div className="px-3 pb-1 text-right text-[10px] text-amber-600 font-medium">
                {input.length} / 2000
              </div>
            )}
          </div>

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={!input.trim() || sendMutation.isPending}
            className="p-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white rounded-2xl shadow-sm transition-all active:scale-95 shrink-0 flex items-center justify-center"
            aria-label="Send message"
          >
            {sendMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
