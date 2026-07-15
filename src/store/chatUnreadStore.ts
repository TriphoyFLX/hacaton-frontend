import { create } from 'zustand';
import { chatsApi } from '../api/chats';

interface ChatUnreadState {
  totalUnread: number;
  chatUnread: Record<string, number>;
  loading: boolean;
  refresh: () => Promise<void>;
  setChatUnread: (chatId: string, count: number) => void;
  clearChatUnread: (chatId: string) => void;
}

export const useChatUnreadStore = create<ChatUnreadState>((set, get) => ({
  totalUnread: 0,
  chatUnread: {},
  loading: false,

  refresh: async () => {
    set({ loading: true });
    try {
      const chats = await chatsApi.getChats();
      const chatUnread: Record<string, number> = {};
      let totalUnread = 0;

      chats.forEach((chat: { id: string; unreadCount?: number }) => {
        const count = chat.unreadCount || 0;
        chatUnread[chat.id] = count;
        totalUnread += count;
      });

      set({ chatUnread, totalUnread, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  setChatUnread: (chatId, count) => {
    const prev = get().chatUnread[chatId] || 0;
    const chatUnread = { ...get().chatUnread, [chatId]: count };
    const totalUnread = Math.max(0, get().totalUnread - prev + count);
    set({ chatUnread, totalUnread });
  },

  clearChatUnread: (chatId) => {
    const prev = get().chatUnread[chatId] || 0;
    if (prev === 0) return;
    const chatUnread = { ...get().chatUnread, [chatId]: 0 };
    set({
      chatUnread,
      totalUnread: Math.max(0, get().totalUnread - prev),
    });
  },
}));
