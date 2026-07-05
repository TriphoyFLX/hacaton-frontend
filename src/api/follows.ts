import api from './client';

export interface FollowUser {
  id: string;
  username: string;
  displayName?: string | null;
  avatar?: string | null;
  followedAt: string;
}

export interface FollowActionResponse {
  success: boolean;
  following: boolean;
  followersCount: number;
  error?: string;
}

export const followsApi = {
  getFollowingIds: async (): Promise<string[]> => {
    const response = await api.get('/follows/following-ids');
    return response.data.ids;
  },

  follow: async (userId: string): Promise<FollowActionResponse> => {
    const response = await api.post(`/follows/${userId}`);
    return response.data;
  },

  unfollow: async (userId: string): Promise<FollowActionResponse> => {
    const response = await api.delete(`/follows/${userId}`);
    return response.data;
  },

  getFollowers: async (userId: string): Promise<FollowUser[]> => {
    const response = await api.get(`/follows/${userId}/followers`);
    return response.data;
  },

  getFollowing: async (userId: string): Promise<FollowUser[]> => {
    const response = await api.get(`/follows/${userId}/following`);
    return response.data;
  },
};
