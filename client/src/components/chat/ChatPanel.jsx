import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import ChatBubble from './ChatBubble';
import { Send, MessageCircle, Loader2, ChevronUp } from 'lucide-react';

function formatDateDivider(dateStr) {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function ChatPanel({ repairRequestId }) {
  const { user } = useAuth();
  const { socket, joinChat, leaveChat, emitTyping, emitStopTyping } = useSocket();
  const queryClient = useQueryClient();

  const [input, setInput] = useState('');
  const [typingUser, setTypingUser] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);
  const cursorRef = useRef(null);
  const hasMoreRef = useRef(true);

  // Fetch initial messages
  const { data, isLoading } = useQuery({
    queryKey: ['messages', repairRequestId],
    queryFn: () =>
      api.get(`/messages/${repairRequestId}?limit=30`).then((r) => r.data.data),
    enabled: !!repairRequestId,
    onSuccess: (data) => {
      if (data.cursor) cursorRef.current = data.cursor;
      hasMoreRef.current = data.hasMore;
    },
  });

  const messages = data?.messages || [];

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: (content) =>
      api.post(`/messages/${repairRequestId}`, { content }).then((r) => r.data.data),
    onSuccess: (data) => {
      // Optimistically add message to cache
      queryClient.setQueryData(['messages', repairRequestId], (old) => {
        if (!old) return { messages: [data.message], hasMore: false, cursor: null };
        return {
          ...old,
          messages: [...old.messages, data.message],
        };
      });
      setInput('');
      scrollToBottom();
    },
  });

  // Mark as read mutation
  const markReadMutation = useMutation({
    mutationFn: () => api.patch(`/messages/${repairRequestId}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries(['messages-unread']);
    },
  });

  // Load older messages
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMoreRef.current || !cursorRef.current) return;
    setLoadingMore(true);

    try {
      const res = await api.get(
        `/messages/${repairRequestId}?limit=30&before=${cursorRef.current}`
      );
      const olderData = res.data.data;

      if (olderData.cursor) cursorRef.current = olderData.cursor;
      hasMoreRef.current = olderData.hasMore;

      queryClient.setQueryData(['messages', repairRequestId], (old) => {
        if (!old) return olderData;
        return {
          ...old,
          messages: [...olderData.messages, ...old.messages],
          hasMore: olderData.hasMore,
          cursor: olderData.cursor,
        };
      });
    } catch (err) {
      // silently fail
    } finally {
      setLoadingMore(false);
    }
  }, [repairRequestId, loadingMore, queryClient]);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  }, []);

  // Join/leave chat room
  useEffect(() => {
    if (repairRequestId) {
      joinChat(repairRequestId);
      return () => leaveChat(repairRequestId);
    }
  }, [repairRequestId, joinChat, leaveChat]);

  // Listen for real-time messages
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg) => {
      if (msg.repairRequest !== repairRequestId) return;
      // Don't add if we sent it (already added optimistically)
      if (msg.sender?._id === user?.userId || msg.sender === user?.userId) return;

      queryClient.setQueryData(['messages', repairRequestId], (old) => {
        if (!old) return { messages: [msg], hasMore: false, cursor: null };
        // Prevent duplicates
        if (old.messages.some((m) => m._id === msg._id)) return old;
        return { ...old, messages: [...old.messages, msg] };
      });
      scrollToBottom();

      // Auto-mark as read since we're viewing the chat
      markReadMutation.mutate();
    };

    const handleTyping = ({ userId: typerId, fullName }) => {
      if (typerId !== user?.userId) {
        setTypingUser(fullName);
      }
    };

    const handleStopTyping = ({ userId: typerId }) => {
      if (typerId !== user?.userId) {
        setTypingUser(null);
      }
    };

    const handleRead = ({ readBy, readAt }) => {
      if (readBy !== user?.userId) {
        // Other person read our messages
        queryClient.setQueryData(['messages', repairRequestId], (old) => {
          if (!old) return old;
          return {
            ...old,
            messages: old.messages.map((m) =>
              m.sender?._id === user?.userId && !m.readAt
                ? { ...m, readAt }
                : m
            ),
          };
        });
      }
    };

    socket.on('chat:message', handleNewMessage);
    socket.on('chat:typing', handleTyping);
    socket.on('chat:stop-typing', handleStopTyping);
    socket.on('chat:read', handleRead);

    return () => {
      socket.off('chat:message', handleNewMessage);
      socket.off('chat:typing', handleTyping);
      socket.off('chat:stop-typing', handleStopTyping);
      socket.off('chat:read', handleRead);
    };
  }, [socket, repairRequestId, user?.userId, queryClient, scrollToBottom, markReadMutation]);

  // Mark messages as read when panel opens
  useEffect(() => {
    if (repairRequestId && messages.length > 0) {
      const hasUnread = messages.some(
        (m) => m.recipient === user?.userId && !m.readAt && m.sender?._id !== user?.userId
      );
      if (hasUnread) {
        markReadMutation.mutate();
      }
    }
  }, [repairRequestId, messages.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to bottom on initial load
  useEffect(() => {
    if (messages.length > 0 && !isLoading) {
      scrollToBottom();
    }
  }, [isLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update cursor from query data
  useEffect(() => {
    if (data) {
      if (data.cursor) cursorRef.current = data.cursor;
      hasMoreRef.current = data.hasMore;
    }
  }, [data]);

  // Handle typing indicator
  const handleInputChange = (e) => {
    setInput(e.target.value);

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      emitTyping(repairRequestId);
    }

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      emitStopTyping(repairRequestId);
    }, 2000);
  };

  // Handle send
  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || sendMutation.isPending) return;

    isTypingRef.current = false;
    clearTimeout(typingTimeoutRef.current);
    emitStopTyping(repairRequestId);
    sendMutation.mutate(trimmed);
  };

  // Handle key down
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Group messages by date
  const groupedMessages = [];
  let lastDate = null;
  messages.forEach((msg, idx) => {
    const msgDate = new Date(msg.createdAt).toDateString();
    if (msgDate !== lastDate) {
      groupedMessages.push({ type: 'divider', date: msg.createdAt, key: `div-${idx}` });
      lastDate = msgDate;
    }

    // Should show avatar if it's from a different sender than the previous message
    const prevMsg = messages[idx - 1];
    const showAvatar =
      !prevMsg ||
      new Date(prevMsg.createdAt).toDateString() !== msgDate ||
      (prevMsg.sender?._id || prevMsg.sender) !== (msg.sender?._id || msg.sender);

    groupedMessages.push({ type: 'message', msg, showAvatar, key: msg._id });
  });

  return (
    <div className="card flex flex-col" style={{ height: '460px' }}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2 shrink-0">
        <MessageCircle className="w-4 h-4 text-primary-500" />
        <h3 className="font-semibold text-gray-900 text-sm">Messages</h3>
        {messages.length > 0 && (
          <span className="text-[10px] text-gray-400 ml-auto">
            {messages.length} message{messages.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Messages Area */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5"
        style={{ minHeight: 0 }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-primary-400" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageCircle className="w-10 h-10 text-gray-200 mb-3" />
            <p className="text-sm font-medium text-gray-500">No messages yet</p>
            <p className="text-xs text-gray-400 mt-1">
              Start the conversation below
            </p>
          </div>
        ) : (
          <>
            {/* Load more button */}
            {hasMoreRef.current && (
              <div className="flex justify-center mb-3">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="btn-ghost btn-sm text-xs text-gray-500"
                >
                  {loadingMore ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <ChevronUp className="w-3 h-3" />
                  )}
                  {loadingMore ? 'Loading...' : 'Load older messages'}
                </button>
              </div>
            )}

            {groupedMessages.map((item) => {
              if (item.type === 'divider') {
                return (
                  <div key={item.key} className="flex items-center gap-3 my-3">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-[10px] text-gray-400 font-medium">
                      {formatDateDivider(item.date)}
                    </span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                );
              }

              const isSent =
                (item.msg.sender?._id || item.msg.sender) === user?.userId;

              return (
                <ChatBubble
                  key={item.key}
                  message={item.msg}
                  isSent={isSent}
                  showAvatar={item.showAvatar}
                />
              );
            })}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Typing indicator */}
      {typingUser && (
        <div className="px-4 py-1.5 text-xs text-gray-400 italic shrink-0">
          {typingUser} is typing…
        </div>
      )}

      {/* Input */}
      <div className="px-3 py-3 border-t border-gray-100 shrink-0">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className="input resize-none !py-2 !rounded-xl text-sm"
            style={{
              minHeight: '38px',
              maxHeight: '100px',
              height: 'auto',
            }}
            onInput={(e) => {
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sendMutation.isPending}
            className="btn-primary !p-2.5 !rounded-xl shrink-0"
          >
            {sendMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
