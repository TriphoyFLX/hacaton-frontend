import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';

// Types matching backend
export interface Message {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  chatId: string;
  clientMessageId?: string | null;
  status: 'SENT' | 'DELIVERED' | 'READ';
  readAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  sender: {
    id: string;
    username: string;
    displayName?: string | null;
    avatar?: string | null;
  };
}

export interface SocketMessageResponse {
  success: boolean;
  message?: Message;
  error?: string;
  clientMessageId?: string;
}

interface ServerToClientEvents {
  'message:new': (message: Message) => void;
  'message:status': (data: { messageId: string; status: string; readAt?: Date }) => void;
  'message:delivered': (data: { clientMessageId: string; messageId: string }) => void;
  'chat:typing': (data: { chatId: string; userId: string; isTyping: boolean }) => void;
  'user:online': (data: { userId: string; isOnline: boolean }) => void;
  'error': (error: { message: string; code: string }) => void;
  'connect': () => void;
  'disconnect': (reason: string) => void;
  'connect_error': (error: Error) => void;
}

interface ClientToServerEvents {
  'message:send': (data: {
    content: string;
    chatId: string;
    clientMessageId: string;
    receiverId: string;
  }, callback: (response: SocketMessageResponse) => void) => void;
  'message:read': (data: { messageIds: string[]; chatId: string }) => void;
  'message:deliver': (data: { messageId: string }) => void;
  'chat:join': (chatId: string) => void;
  'chat:leave': (chatId: string) => void;
  'chat:typing': (data: { chatId: string; isTyping: boolean }) => void;
  'user:subscribe': (userId: string) => void;
}

interface UseSocketOptions {
  onMessage?: (message: Message) => void;
  onMessageDelivered?: (data: { clientMessageId: string; messageId: string }) => void;
  onMessageRead?: (data: { messageId: string; status: string; readAt?: Date }) => void;
  onTyping?: (data: { chatId: string; userId: string; isTyping: boolean }) => void;
  onUserOnline?: (data: { userId: string; isOnline: boolean }) => void;
  onError?: (error: { message: string; code: string }) => void;
  onConnect?: () => void;
  onDisconnect?: (reason: string) => void;
}

interface UseSocketReturn {
  socket: Socket<ServerToClientEvents, ClientToServerEvents> | null;
  isConnected: boolean;
  isReconnecting: boolean;
  reconnectAttempts: number;
  joinChat: (chatId: string) => void;
  leaveChat: (chatId: string) => void;
  sendMessage: (data: {
    content: string;
    chatId: string;
    receiverId: string;
  }) => Promise<SocketMessageResponse>;
  markAsRead: (messageIds: string[], chatId: string) => void;
  sendTyping: (chatId: string, isTyping: boolean) => void;
  subscribeToUser: (userId: string) => void;
}

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5002';
const MAX_RECONNECT_ATTEMPTS = 5;

export function useSocket(token: string | null, options: UseSocketOptions = {}): UseSocketReturn {
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const optionsRef = useRef(options);

  // Keep options ref up to date
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  // Initialize socket
  useEffect(() => {
    if (!token) {
      // Disconnect if token is removed
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      randomizationFactor: 0.5,
      timeout: 10000,
    });

    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      console.log('[Socket] Connected');
      setIsConnected(true);
      setIsReconnecting(false);
      setReconnectAttempts(0);
      optionsRef.current.onConnect?.();
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      setIsConnected(false);
      optionsRef.current.onDisconnect?.(reason);

      // Reconnecting on specific errors
      if (reason === 'io server disconnect' || reason === 'transport close') {
        setIsReconnecting(true);
      }
    });

    socket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error.message);
      setReconnectAttempts(prev => prev + 1);
      
      if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        setIsReconnecting(false);
      }
    });

    // Message events
    socket.on('message:new', (message) => {
      console.log('[Socket] New message:', message.id);
      optionsRef.current.onMessage?.(message);
    });

    socket.on('message:delivered', (data) => {
      console.log('[Socket] Message delivered:', data);
      optionsRef.current.onMessageDelivered?.(data);
    });

    socket.on('message:status', (data) => {
      console.log('[Socket] Message status:', data);
      optionsRef.current.onMessageRead?.(data);
    });

    // Typing events
    socket.on('chat:typing', (data) => {
      optionsRef.current.onTyping?.(data);
    });

    // User status events
    socket.on('user:online', (data) => {
      optionsRef.current.onUserOnline?.(data);
    });

    // Error events
    socket.on('error', (error) => {
      console.error('[Socket] Error:', error);
      optionsRef.current.onError?.(error);
    });

    // Cleanup on unmount
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, reconnectAttempts]);

  // Join chat room
  const joinChat = useCallback((chatId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('chat:join', chatId);
    }
  }, []);

  // Leave chat room
  const leaveChat = useCallback((chatId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('chat:leave', chatId);
    }
  }, []);

  // Send message with acknowledgment
  const sendMessage = useCallback(
    (data: { content: string; chatId: string; receiverId: string }): Promise<SocketMessageResponse> => {
      return new Promise((resolve) => {
        if (!socketRef.current?.connected) {
          resolve({
            success: false,
            error: 'Not connected to server',
          });
          return;
        }

        const clientMessageId = `${data.chatId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Set timeout for acknowledgment
        const timeout = setTimeout(() => {
          resolve({
            success: false,
            error: 'Server timeout',
            clientMessageId,
          });
        }, 10000);

        socketRef.current.emit(
          'message:send',
          {
            ...data,
            clientMessageId,
          },
          (response: SocketMessageResponse) => {
            clearTimeout(timeout);
            resolve(response);
          }
        );
      });
    },
    []
  );

  // Mark messages as read
  const markAsRead = useCallback((messageIds: string[], chatId: string) => {
    if (socketRef.current?.connected && messageIds.length > 0) {
      socketRef.current.emit('message:read', { messageIds, chatId });
    }
  }, []);

  // Send typing indicator
  const sendTyping = useCallback((chatId: string, isTyping: boolean) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('chat:typing', { chatId, isTyping });
    }
  }, []);

  // Subscribe to user status
  const subscribeToUser = useCallback((userId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('user:subscribe', userId);
    }
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    isReconnecting,
    reconnectAttempts,
    joinChat,
    leaveChat,
    sendMessage,
    markAsRead,
    sendTyping,
    subscribeToUser,
  };
}

// Hook for managing a specific chat's socket state
export function useChatSocket(
  chatId: string | undefined,
  token: string | null,
  options: {
    onMessage?: (message: Message) => void;
    onTyping?: (isTyping: boolean, userId: string) => void;
    onOtherUserOnline?: (isOnline: boolean) => void;
  } = {}
) {
  const { socket, isConnected, joinChat, leaveChat, sendMessage, markAsRead, sendTyping, subscribeToUser } = useSocket(
    token,
    {
      onMessage: (message) => {
        // Only handle messages for this chat
        if (message.chatId === chatId) {
          options.onMessage?.(message);
        }
      },
      onTyping: (data) => {
        if (data.chatId === chatId) {
          options.onTyping?.(data.isTyping, data.userId);
        }
      },
      onUserOnline: (data) => {
        // Could check if this is the other user in the chat
        options.onOtherUserOnline?.(data.isOnline);
      },
    }
  );

  // Auto join/leave chat
  useEffect(() => {
    if (!chatId || !isConnected) return;

    joinChat(chatId);

    return () => {
      leaveChat(chatId);
    };
  }, [chatId, isConnected, joinChat, leaveChat]);

  const sendChatMessage = useCallback(
    async (content: string, receiverId: string) => {
      if (!chatId) {
        return { success: false, error: 'No chat selected' };
      }
      return sendMessage({ content, chatId, receiverId });
    },
    [chatId, sendMessage]
  );

  const markChatAsRead = useCallback(
    (messageIds: string[]) => {
      if (chatId) {
        markAsRead(messageIds, chatId);
      }
    },
    [chatId, markAsRead]
  );

  const sendChatTyping = useCallback(
    (isTyping: boolean) => {
      if (chatId) {
        sendTyping(chatId, isTyping);
      }
    },
    [chatId, sendTyping]
  );

  return {
    isConnected,
    sendChatMessage,
    markChatAsRead,
    sendChatTyping,
    subscribeToUser,
  };
}
