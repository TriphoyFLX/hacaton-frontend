import api from './client';

export type NotificationType = 'LIKE' | 'COMMENT' | 'FOLLOW' | 'MESSAGE';

export interface AppNotification {
  id: string;
  type: NotificationType;
  entityType: string | null;
  entityId: string | null;
  readAt: string | null;
  createdAt: string;
  actor: {
    id: string;
    username: string;
    displayName?: string | null;
    avatar?: string | null;
  };
}

export const notificationsApi = {
  getAll: async () => (await api.get<{ items: AppNotification[]; unreadCount: number }>('/notifications')).data,
  getUnreadCount: async () =>
    (await api.get<{ unreadCount: number }>('/notifications/unread-count')).data.unreadCount,
  markRead: async (ids?: string[]) =>
    (await api.patch<{ unreadCount: number }>('/notifications/read', ids ? { ids } : {})).data,
  clear: async () =>
    (await api.delete<{ deletedCount: number; unreadCount: number }>('/notifications')).data,
};
