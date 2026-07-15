import api from './client';

export interface BlockStatus {
  blockedByMe: boolean;
  blockedByOther: boolean;
  isBlocked: boolean;
}

export const blocksApi = {
  getBlockedIds: async () => {
    const response = await api.get('/blocks');
    return response.data.ids as string[];
  },

  checkStatus: async (userId: string) => {
    const response = await api.get(`/blocks/check/${userId}`);
    return response.data as BlockStatus;
  },

  blockUser: async (userId: string) => {
    const response = await api.post(`/blocks/${userId}`);
    return response.data;
  },

  unblockUser: async (userId: string) => {
    const response = await api.delete(`/blocks/${userId}`);
    return response.data;
  },
};
