import api from './client';

export interface Chat {
  id: string;
  type?: 'DIRECT' | 'GROUP';
  name?: string | null;
  createdAt: string;
  updatedAt: string;
  unreadCount?: number;
  isPinned?: boolean;
  pinnedAt?: string | null;
  memberCount?: number;
  otherUser?: {
    id: string;
    username: string;
    displayName?: string | null;
    avatar?: string | null;
  } | null;
  users: Array<{
    id: string;
    userId: string;
    chatId: string;
    pinnedAt?: string | null;
    createdAt: string;
    user: {
      id: string;
      username: string;
      displayName?: string | null;
      avatar?: string | null;
    };
  }>;
  messages: Array<{
    id: string;
    content: string;
    senderId: string;
    receiverId?: string | null;
    chatId: string;
    soundTokId?: string | null;
    clientMessageId?: string | null;
    status: 'SENT' | 'DELIVERED' | 'READ';
    readAt?: string | null;
    createdAt: string;
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
  }>;
}

export interface Message {
  id: string;
  content: string;
  senderId: string;
  receiverId?: string | null;
  chatId: string;
  soundTokId?: string | null;
  clientMessageId?: string | null;
  status: 'SENT' | 'DELIVERED' | 'READ';
  readAt?: string | null;
  createdAt: string;
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
}

export interface PinChatResponse {
  success: boolean;
  pinned: boolean;
  isPinned: boolean;
  pinnedAt: string | null;
}

export function resolveChatPinState(
  chat: Pick<Chat, 'isPinned' | 'pinnedAt' | 'users'>,
  userId?: string
): { isPinned: boolean; pinnedAt: string | null } {
  const membership = userId
    ? chat.users.find((cu) => cu.userId === userId)
    : undefined;
  const membershipPinnedAt = membership?.pinnedAt ?? null;

  if (typeof chat.isPinned === 'boolean') {
    const pinnedAt = chat.pinnedAt ?? membershipPinnedAt;
    return {
      isPinned: chat.isPinned,
      pinnedAt: pinnedAt ? String(pinnedAt) : null,
    };
  }

  return {
    isPinned: !!membershipPinnedAt,
    pinnedAt: membershipPinnedAt ? String(membershipPinnedAt) : null,
  };
}

export const chatsApi = {
  getChats: async () => {
    const response = await api.get('/chats');
    return response.data;
  },

  getMessages: async (chatId: string) => {
    const response = await api.get(`/chats/${chatId}/messages`);
    return response.data;
  },

  createGroup: async (name: string, memberIds: string[]) => {
    const response = await api.post('/chats/group', { name, memberIds });
    return response.data;
  },

  pinChat: async (chatId: string, pinned: boolean): Promise<PinChatResponse> => {
    const response = await api.patch(`/chats/${chatId}/pin`, { pinned });
    return response.data;
  },

  createChat: async (receiverId: string) => {
    const response = await api.post('/chats', { receiverId });
    return response.data;
  },

  sendMessage: async (
    chatId: string,
    content: string,
    receiverId?: string,
    clientMessageId?: string,
    soundTokId?: string
  ) => {
    const response = await api.post(`/chats/${chatId}/messages`, {
      content,
      receiverId,
      clientMessageId,
      soundTokId,
    });
    return response.data;
  },

  markAsRead: async (chatId: string, messageIds: string[]) => {
    const response = await api.post(`/chats/${chatId}/read`, { messageIds });
    return response.data;
  },

  searchUsers: async (query: string) => {
    const response = await api.get(`/chats/users/search?q=${encodeURIComponent(query)}`);
    return response.data;
  },

  getUnreadTotal: async () => {
    const response = await api.get('/chats/unread/total');
    return response.data.total as number;
  },
};
