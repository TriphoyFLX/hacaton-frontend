import api from './client';
import type { SoundTok } from './soundtok';

export interface Sound {
  id: string;
  title: string;
  audioUrl: string;
  duration?: number | null;
  useCount: number;
  authorId: string;
  originalSoundTokId?: string | null;
  createdAt: string;
  isFavorited?: boolean;
  favoritedAt?: string;
  author: {
    id: string;
    username: string;
    displayName?: string | null;
    avatar?: string | null;
  };
}

export const soundsApi = {
  getSound: async (id: string): Promise<Sound> => {
    const response = await api.get(`/sounds/${id}`);
    return response.data;
  },

  fromVideo: async (soundTokId: string): Promise<Sound> => {
    const response = await api.get(`/sounds/from-video/${soundTokId}`);
    return response.data;
  },

  getVideos: async (
    soundId: string,
    opts?: { limit?: number; offset?: number }
  ): Promise<{ items: SoundTok[]; total: number; hasMore: boolean; limit: number; offset: number }> => {
    const response = await api.get(`/sounds/${soundId}/videos`, {
      params: {
        limit: opts?.limit ?? 24,
        offset: opts?.offset ?? 0,
      },
    });
    return response.data;
  },

  getFavorites: async (opts?: {
    limit?: number;
    offset?: number;
  }): Promise<{ items: Sound[]; total: number; hasMore: boolean; limit: number; offset: number }> => {
    const response = await api.get('/sounds/favorites', {
      params: {
        limit: opts?.limit ?? 24,
        offset: opts?.offset ?? 0,
      },
    });
    return response.data;
  },

  favorite: async (id: string) => {
    const response = await api.post(`/sounds/${id}/favorite`);
    return response.data as { soundId: string; isFavorited: boolean };
  },

  unfavorite: async (id: string) => {
    const response = await api.delete(`/sounds/${id}/favorite`);
    return response.data as { soundId: string; isFavorited: boolean };
  },
};

export default soundsApi;
