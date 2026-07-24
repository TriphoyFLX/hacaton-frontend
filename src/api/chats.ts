import api from './client';

export type ChatMemberRole = 'MEMBER' | 'ADMIN';

export interface ChatMember {
  id: string;
  userId: string;
  chatId: string;
  role?: ChatMemberRole;
  pinnedAt?: string | null;
  createdAt: string;
  user: {
    id: string;
    username: string;
    displayName?: string | null;
    avatar?: string | null;
  };
}

export interface Chat {
  id: string;
  type?: 'DIRECT' | 'GROUP';
  name?: string | null;
  avatar?: string | null;
  creatorId?: string | null;
  myRole?: ChatMemberRole;
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
  users: ChatMember[];
  messages: Message[];
}

export interface MessageReaction {
  id: string;
  emoji: string;
  userId: string;
  createdAt: string;
  user?: {
    id: string;
    username: string;
  };
}

export const REACTION_EMOJIS = ['❤️', '👍', '😂', '🔥', '😮', '😢'] as const;

export interface MessageReplyPreview {
  id: string;
  content: string;
  senderId: string;
  deletedAt?: string | null;
  soundTokId?: string | null;
  imageUrl?: string | null;
  sender: {
    id: string;
    username: string;
    displayName?: string | null;
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
  readAt?: string | null;
  deletedAt?: string | null;
  editedAt?: string | null;
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
  replyTo?: MessageReplyPreview | null;
  reactions?: MessageReaction[];
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
  getChats: async (opts?: { limit?: number; offset?: number }) => {
    const response = await api.get('/chats', {
      params: {
        limit: opts?.limit ?? 40,
        offset: opts?.offset ?? 0,
      },
    });
    const data = response.data;
    // Backward-compat if an older API still returns a bare array
    if (Array.isArray(data)) {
      return {
        items: data as Chat[],
        total: data.length,
        hasMore: false,
        limit: data.length,
        offset: 0,
      };
    }
    return data as {
      items: Chat[];
      total: number;
      hasMore: boolean;
      limit: number;
      offset: number;
    };
  },

  getMessages: async (chatId: string, opts?: { limit?: number; cursor?: string }) => {
    const response = await api.get(`/chats/${chatId}/messages`, {
      params: {
        limit: opts?.limit ?? 50,
        ...(opts?.cursor ? { cursor: opts.cursor } : {}),
      },
    });
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
    soundTokId?: string,
    replyToId?: string,
    imageUrl?: string
  ) => {
    const response = await api.post(`/chats/${chatId}/messages`, {
      content,
      receiverId,
      clientMessageId,
      soundTokId,
      replyToId,
      imageUrl,
    });
    return response.data;
  },

  uploadImage: async (chatId: string, file: File): Promise<{ imageUrl: string }> => {
    const formData = new FormData();
    formData.append('image', file);
    const response = await api.post(`/chats/${chatId}/images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  uploadGroupAvatar: async (chatId: string, file: File): Promise<Chat> => {
    const formData = new FormData();
    formData.append('image', file);
    const response = await api.post(`/chats/${chatId}/avatar`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  deleteGroupAvatar: async (chatId: string): Promise<Chat> => {
    const response = await api.delete(`/chats/${chatId}/avatar`);
    return response.data;
  },

  setMemberRole: async (
    chatId: string,
    userId: string,
    role: ChatMemberRole
  ): Promise<Chat> => {
    const response = await api.patch(`/chats/${chatId}/members/${userId}/role`, { role });
    return response.data;
  },

  removeMember: async (
    chatId: string,
    userId: string
  ): Promise<Chat | { success: boolean; left?: boolean }> => {
    const response = await api.delete(`/chats/${chatId}/members/${userId}`);
    return response.data;
  },

  deleteMessage: async (chatId: string, messageId: string): Promise<Message> => {
    const response = await api.delete(`/chats/${chatId}/messages/${messageId}`);
    return response.data;
  },

  editMessage: async (chatId: string, messageId: string, content: string): Promise<Message> => {
    const response = await api.patch(`/chats/${chatId}/messages/${messageId}`, { content });
    return response.data;
  },

  toggleReaction: async (
    chatId: string,
    messageId: string,
    emoji: string
  ): Promise<{ message: Message; added: boolean }> => {
    const response = await api.post(`/chats/${chatId}/messages/${messageId}/reactions`, { emoji });
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
