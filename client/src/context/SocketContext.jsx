import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user?.userId) {
      // Disconnect if logged out
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setConnected(false);
      }
      return;
    }

    // Prevent duplicate connections — if socket is already connected for same user, skip
    if (socketRef.current?.connected) {
      return;
    }

    // Create socket connection with auth token
    const token = localStorage.getItem('accessToken');
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      auth: {
        token,
      },
    });

    socketRef.current = socket;

    const onConnect = () => {
      setConnected(true);
      // NOTE: Server auto-joins user to `user:<userId>` room in the connection handler.
      // No need to emit a redundant 'join' event here.
    };

    const onDisconnect = () => {
      setConnected(false);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      // Clean up named listeners to prevent stacking on remount (React StrictMode)
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [isAuthenticated, user?.userId]);

  const joinChat = useCallback((repairRequestId) => {
    if (socketRef.current?.connected && repairRequestId) {
      socketRef.current.emit('chat:join', repairRequestId);
    }
  }, []);

  const leaveChat = useCallback((repairRequestId) => {
    if (socketRef.current?.connected && repairRequestId) {
      socketRef.current.emit('chat:leave', repairRequestId);
    }
  }, []);

  const emitTyping = useCallback((repairRequestId) => {
    if (socketRef.current?.connected && repairRequestId && user) {
      socketRef.current.emit('chat:typing', {
        repairRequestId,
        userId: user.userId,
        fullName: user.fullName,
      });
    }
  }, [user]);

  const emitStopTyping = useCallback((repairRequestId) => {
    if (socketRef.current?.connected && repairRequestId && user) {
      socketRef.current.emit('chat:stop-typing', {
        repairRequestId,
        userId: user.userId,
      });
    }
  }, [user]);

  const value = {
    socket: socketRef.current,
    connected,
    joinChat,
    leaveChat,
    emitTyping,
    emitStopTyping,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useSocket must be used within SocketProvider');
  return context;
};
