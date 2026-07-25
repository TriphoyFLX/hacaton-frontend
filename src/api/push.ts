import api from './client';

export type PushSubscriptionPayload = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export const pushApi = {
  getVapidPublicKey: async () =>
    (await api.get<{ publicKey: string }>('/push/vapid-public-key')).data.publicKey,

  subscribe: async (subscription: PushSubscriptionPayload) =>
    (await api.post<{ ok: boolean }>('/push/subscribe', subscription)).data,

  unsubscribe: async (endpoint?: string) =>
    (await api.delete<{ ok: boolean }>('/push/subscribe', { data: endpoint ? { endpoint } : {} })).data,
};
