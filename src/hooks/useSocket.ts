import { useEffect, useRef, useCallback, useState } from 'react';
import { Socket } from 'socket.io-client';
import { appSocket } from '../lib/appSocket';

// Types matching backend
export interface MessageReaction {
  id: string;
  emoji: string;
  userId: string;
  createdAt: Date | string;
  user?: {
    id: string;
    username: string;
  };
}

export interface Message {
  id: string;
  content: string;
  senderId: string;
  receiverId?: string | null;
  chatId: string;
  soundTokId?: string | null;
  replyToId?: string | null;
  imageUrl?: string | null;
  clientMessageId?: string | null;
  status: 'SENT' | 'DELIVERED' | 'READ';
  readAt?: Date | null;
  deletedAt?: Date | string | null;
  editedAt?: Date | string | null;
  createdAt: Date;
  updatedAt: Date;
  sender: {
    id: string;
    username: string;
    displayName?: string | null;
    avatar?: string | null;
  };
  soundTok?: {
    id: string;
    description: string;
    videoUrl: string;
    authorId: string;
    author: {
      id: string;
      username: string;
      displayName?: string | null;
      avatar?: string | null;
    };
  } | null;
  replyTo?: {
    id: string;
    content: string;
    senderId: string;
    deletedAt?: Date | string | null;
    soundTokId?: string | null;
    sender: {
      id: string;
      username: string;
      displayName?: string | null;
    };
  } | null;
  reactions?: MessageReaction[];
}

export interface SocketMessageResponse {
  success: boolean;
  message?: Message;
  error?: string;
  clientMessageId?: string;
}

interface ServerToClientEvents {
  'message:new': (message: Message) => void;
  'message:deleted': (data: { chatId: string; message: Message }) => void;
  'message:edited': (data: { chatId: string; message: Message }) => void;
  'message:reaction': (data: { chatId: string; message: Message }) => void;
  'message:status': (data: { messageId: string; status: string; readAt?: Date }) => void;
  'message:delivered': (data: { clientMessageId: string; messageId: string }) => void;
  'chat:typing': (data: { chatId: string; userId: string; isTyping: boolean }) => void;
  'chat:presence': (data: { chatId: string; userId: string; isOnline: boolean }) => void;
  'user:online': (data: { userId: string; isOnline: boolean }) => void;
  'user:updated': (data: {
    id: string;
    username: string;
    displayName?: string | null;
    avatar?: string | null;
  }) => void;
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
    receiverId?: string | null;
    soundTokId?: string;
    replyToId?: string;
    imageUrl?: string;
  }, callback: (response: SocketMessageResponse) => void) => void;
  'message:read': (data: { messageIds: string[]; chatId: string }) => void;
  'message:deliver': (data: { messageId: string; chatId: string }) => void;
  'chat:join': (chatId: string) => void;
  'chat:leave': (chatId: string) => void;
  'chat:typing': (data: { chatId: string; isTyping: boolean }) => void;
  'user:subscribe': (userId: string) => void;
}

interface UseSocketOptions {
  onMessage?: (message: Message) => void;
  onMessageDeleted?: (data: { chatId: string; message: Message }) => void;
  onMessageEdited?: (data: { chatId: string; message: Message }) => void;
  onMessageReaction?: (data: { chatId: string; message: Message }) => void;
  onMessageDelivered?: (data: { clientMessageId: string; messageId: string }) => void;
  onMessageRead?: (data: { messageId: string; status: string; readAt?: Date }) => void;
  onTyping?: (data: { chatId: string; userId: string; isTyping: boolean }) => void;
  onPresence?: (data: { chatId: string; userId: string; isOnline: boolean }) => void;
  onUserOnline?: (data: { userId: string; isOnline: boolean }) => void;
  onUserUpdated?: (data: {
    id: string;
    username: string;
    displayName?: string | null;
    avatar?: string | null;
  }) => void;
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
    receiverId?: string | null;
    clientMessageId: string;
    soundTokId?: string;
    replyToId?: string;
    imageUrl?: string;
  }) => Promise<SocketMessageResponse>;
  markAsRead: (messageIds: string[], chatId: string) => void;
  sendTyping: (chatId: string, isTyping: boolean) => void;
  subscribeToUser: (userId: string) => void;
}

const MAX_RECONNECT_ATTEMPTS = 5;

export function useSocket(token: string | null, options: UseSocketOptions = {}): UseSocketReturn {
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const optionsRef = useRef(options);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  useEffect(() => {
    if (!token) {
      socketRef.current = null;
      setIsConnected(false);
      return;
    }

    const socket = appSocket.acquire(token) as Socket<ServerToClientEvents, ClientToServerEvents>;
    socketRef.current = socket;
    setIsConnected(socket.connected);

    const onConnect = () => {
      setIsConnected(true);
      setIsReconnecting(false);
      setReconnectAttempts(0);
      optionsRef.current.onConnect?.();
    };

    const onDisconnect = (reason: string) => {
      setIsConnected(false);
      optionsRef.current.onDisconnect?.(reason);

      if (reason === 'io server disconnect' || reason === 'transport close') {
        setIsReconnecting(true);
      }
    };

    const onConnectError = () => {
      setReconnectAttempts((prev) => {
        const next = prev + 1;
        if (next >= MAX_RECONNECT_ATTEMPTS) {
          setIsReconnecting(false);
        }
        return next;
      });
    };

    const onMessageNew = (message: Message) => {
      optionsRef.current.onMessage?.(message);
    };
    const onMessageDeleted = (data: { chatId: string; message: Message }) => {
      optionsRef.current.onMessageDeleted?.(data);
    };
    const onMessageEdited = (data: { chatId: string; message: Message }) => {
      optionsRef.current.onMessageEdited?.(data);
    };
    const onMessageReaction = (data: { chatId: string; message: Message }) => {
      optionsRef.current.onMessageReaction?.(data);
    };
    const onMessageDelivered = (data: { clientMessageId: string; messageId: string }) => {
      optionsRef.current.onMessageDelivered?.(data);
    };
    const onMessageStatus = (data: { messageId: string; status: string; readAt?: Date }) => {
      optionsRef.current.onMessageRead?.(data);
    };
    const onTyping = (data: { chatId: string; userId: string; isTyping: boolean }) => {
      optionsRef.current.onTyping?.(data);
    };
    const onPresence = (data: { chatId: string; userId: string; isOnline: boolean }) => {
      optionsRef.current.onPresence?.(data);
    };
    const onUserOnline = (data: { userId: string; isOnline: boolean }) => {
      optionsRef.current.onUserOnline?.(data);
    };
    const onUserUpdated = (data: {
      id: string;
      username: string;
      displayName?: string | null;
      avatar?: string | null;
    }) => {
      optionsRef.current.onUserUpdated?.(data);
    };
    const onError = (error: { message: string; code: string }) => {
      optionsRef.current.onError?.(error);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('message:new', onMessageNew);
    socket.on('message:deleted', onMessageDeleted);
    socket.on('message:edited', onMessageEdited);
    socket.on('message:reaction', onMessageReaction);
    socket.on('message:delivered', onMessageDelivered);
    socket.on('message:status', onMessageStatus);
    socket.on('chat:typing', onTyping);
    socket.on('chat:presence', onPresence);
    socket.on('user:online', onUserOnline);
    socket.on('user:updated', onUserUpdated);
    socket.on('error', onError);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('message:new', onMessageNew);
      socket.off('message:deleted', onMessageDeleted);
      socket.off('message:edited', onMessageEdited);
      socket.off('message:reaction', onMessageReaction);
      socket.off('message:delivered', onMessageDelivered);
      socket.off('message:status', onMessageStatus);
      socket.off('chat:typing', onTyping);
      socket.off('chat:presence', onPresence);
      socket.off('user:online', onUserOnline);
      socket.off('user:updated', onUserUpdated);
      socket.off('error', onError);
      socketRef.current = null;
      appSocket.release();
    };
  }, [token]);

  const joinChat = useCallback((chatId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('chat:join', chatId);
    }
  }, []);

  const leaveChat = useCallback((chatId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('chat:leave', chatId);
    }
  }, []);

  const sendMessage = useCallback(
    (data: {
      content: string;
      chatId: string;
      receiverId?: string | null;
      clientMessageId: string;
      soundTokId?: string;
      replyToId?: string;
      imageUrl?: string;
    }): Promise<SocketMessageResponse> => {
      return new Promise((resolve) => {
        if (!socketRef.current?.connected) {
          resolve({
            success: false,
            error: 'Not connected to server',
            clientMessageId: data.clientMessageId,
          });
          return;
        }

        const timeout = setTimeout(() => {
          resolve({
            success: false,
            error: 'Server timeout',
            clientMessageId: data.clientMessageId,
          });
        }, 10000);

        socketRef.current.emit('message:send', data, (response: SocketMessageResponse) => {
          clearTimeout(timeout);
          resolve(response);
        });
      });
    },
    []
  );

  const markAsRead = useCallback((messageIds: string[], chatId: string) => {
    if (socketRef.current?.connected && messageIds.length > 0) {
      socketRef.current.emit('message:read', { messageIds, chatId });
    }
  }, []);

  const sendTyping = useCallback((chatId: string, isTyping: boolean) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('chat:typing', { chatId, isTyping });
    }
  }, []);

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

export function useChatSocket(
  chatId: string | undefined,
  token: string | null,
  otherUserId: string | undefined,
  options: {
    onMessage?: (message: Message) => void;
    onMessageDeleted?: (data: { chatId: string; message: Message }) => void;
    onMessageEdited?: (data: { chatId: string; message: Message }) => void;
    onMessageReaction?: (data: { chatId: string; message: Message }) => void;
    onMessageDelivered?: (data: { clientMessageId: string; messageId: string }) => void;
    onMessageRead?: (data: { messageId: string; status: string; readAt?: Date }) => void;
    onTyping?: (isTyping: boolean, userId: string) => void;
    onPresence?: (isOnline: boolean) => void;
    onOtherUserOnline?: (isOnline: boolean) => void;
    onUserUpdated?: (data: {
      id: string;
      username: string;
      displayName?: string | null;
      avatar?: string | null;
    }) => void;
    onError?: (error: { message: string; code: string }) => void;
  } = {}
) {
  const { isConnected, joinChat, leaveChat, sendMessage, markAsRead, sendTyping, subscribeToUser } = useSocket(
    token,
    {
      onMessage: (message) => {
        if (message.chatId === chatId) {
          options.onMessage?.(message);
        }
      },
      onMessageDeleted: (data) => {
        if (data.chatId === chatId) {
          options.onMessageDeleted?.(data);
        }
      },
      onMessageEdited: (data) => {
        if (data.chatId === chatId) {
          options.onMessageEdited?.(data);
        }
      },
      onMessageReaction: (data) => {
        if (data.chatId === chatId) {
          options.onMessageReaction?.(data);
        }
      },
      onMessageDelivered: (data) => {
        options.onMessageDelivered?.(data);
      },
      onMessageRead: (data) => {
        options.onMessageRead?.(data);
      },
      onTyping: (data) => {
        if (data.chatId === chatId) {
          options.onTyping?.(data.isTyping, data.userId);
        }
      },
      onPresence: (data) => {
        if (data.chatId === chatId && otherUserId && data.userId === otherUserId) {
          options.onPresence?.(data.isOnline);
        }
      },
      onUserOnline: (data) => {
        if (otherUserId && data.userId === otherUserId) {
          options.onOtherUserOnline?.(data.isOnline);
          options.onPresence?.(data.isOnline);
        }
      },
      onUserUpdated: (data) => {
        options.onUserUpdated?.(data);
      },
      onError: (error) => {
        options.onError?.(error);
      },
    }
  );

  useEffect(() => {
    if (!chatId || !isConnected) return;

    joinChat(chatId);

    return () => {
      leaveChat(chatId);
    };
  }, [chatId, isConnected, joinChat, leaveChat]);

  useEffect(() => {
    if (!otherUserId || !isConnected) return;
    subscribeToUser(otherUserId);
  }, [otherUserId, isConnected, subscribeToUser]);

  const sendChatMessage = useCallback(
    async (
      content: string,
      receiverId: string | undefined,
      clientMessageId: string,
      opts?: { soundTokId?: string; replyToId?: string; imageUrl?: string }
    ) => {
      if (!chatId) {
        return { success: false, error: 'No chat selected', clientMessageId };
      }
      return sendMessage({
        content,
        chatId,
        receiverId,
        clientMessageId,
        soundTokId: opts?.soundTokId,
        replyToId: opts?.replyToId,
        imageUrl: opts?.imageUrl,
      });
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
