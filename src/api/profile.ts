import api from './client';

export interface UserProfile {
  id: string;
  username: string;
  email?: string;
  displayName?: string | null;
  avatar?: string | null;
  bio?: string | null;
  usernameChangeAvailableAt?: string | null;
  likedSoundToksPublic?: boolean;
  birthDate?: string;
  role?: string;
  createdAt: string;
  updatedAt?: string;
  postsCount?: number;
  soundToksCount?: number;
  likedSoundToksCount?: number;
  followersCount?: number;
  followingCount?: number;
  isFollowing?: boolean;
  battleElo?: number;
  battleWins?: number;
  battleLosses?: number;
  battleDraws?: number;
  battleGames?: number;
  rankId?: string;
  rankLabel?: string;
  rankMin?: number;
  rankMax?: number;
  nextRankLabel?: string | null;
  nextRankMin?: number | null;
  progressInRank?: number;
  scaleProgress?: number;
}

export interface UpdateProfileData {
  username?: string;
  displayName?: string;
  bio?: string;
  likedSoundToksPublic?: boolean;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface UpdateProfileResponse {
  success: boolean;
  user?: UserProfile;
  errors?: ValidationError[];
  error?: string;
}

export interface ProfileSearchUser {
  id: string;
  username: string;
  displayName?: string | null;
  avatar?: string | null;
  bio?: string;
}

export const profileApi = {
  getMyProfile: async (): Promise<UserProfile> => {
    const response = await api.get('/profile');
    return response.data;
  },

  getPublicProfile: async (identifier: string): Promise<UserProfile> => {
    const response = await api.get(`/profile/${encodeURIComponent(identifier)}`);
    return response.data;
  },

  updateProfile: async (data: UpdateProfileData): Promise<UpdateProfileResponse> => {
    const response = await api.patch('/profile', data);
    return response.data;
  },

  uploadAvatar: async (file: File): Promise<{ avatar: string }> => {
    const formData = new FormData();
    formData.append('avatar', file);

    const response = await api.post('/profile/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  deleteAvatar: async (): Promise<{ message: string }> => {
    const response = await api.delete('/profile/avatar');
    return response.data;
  },

  searchUsers: async (query: string, limit: number = 10): Promise<ProfileSearchUser[]> => {
    const response = await api.get(`/profile/search?q=${encodeURIComponent(query)}&limit=${limit}`);
    return response.data;
  },

  getUserSoundToks: async (
    identifier: string,
    opts?: { limit?: number; offset?: number }
  ) => {
    const response = await api.get(`/profile/${encodeURIComponent(identifier)}/soundtoks`, {
      params: {
        limit: opts?.limit ?? 24,
        offset: opts?.offset ?? 0,
      },
    });
    return response.data as {
      userId: string;
      items: import('./soundtok').SoundTok[];
      total: number;
      limit: number;
      offset: number;
      hasMore: boolean;
    };
  },

  getUserLikedSoundToks: async (
    identifier: string,
    opts?: { limit?: number; offset?: number }
  ) => {
    const response = await api.get(`/profile/${encodeURIComponent(identifier)}/liked-soundtoks`, {
      params: {
        limit: opts?.limit ?? 24,
        offset: opts?.offset ?? 0,
      },
    });
    return response.data as {
      userId: string;
      items: import('./soundtok').SoundTok[];
      total: number;
      limit: number;
      offset: number;
      hasMore: boolean;
    };
  },
};

export default profileApi;
