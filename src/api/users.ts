import api from './client';

export const usersApi = {
  getPresence: async (userId: string) => {
    const response = await api.get(`/users/${userId}/presence`);
    return response.data as { isOnline: boolean };
  },
};
