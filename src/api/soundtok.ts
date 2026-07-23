import api from './client';

export interface Comment {
  id: string;
  text: string;
  authorId: string;
  soundTokId: string;
  createdAt: string;
  author: {
    id: string;
    username: string;
    displayName?: string | null;
    avatar?: string | null;
  };
}

export interface SoundTok {
  id: string;
  description: string;
  videoUrl: string;
  authorId: string;
  likes: number;
  commentsCount: number;
  createdAt: string;
  updatedAt: string;
  isLiked?: boolean;
  authorIsFollowed?: boolean;
  author: {
    id: string;
    username: string;
    displayName?: string | null;
    avatar?: string | null;
    role?: string;
  };
  comments?: Comment[];
}

export interface CreateCommentResponse {
  comment: Comment;
  commentsCount: number;
}

export const soundTokApi = {
  createSoundTok: async (description: string, videoFile: File) => {
    const formData = new FormData();
    formData.append('description', description);
    formData.append('video', videoFile);

    const response = await api.post('/soundtok', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  getSoundToks: async (opts?: {
    limit?: number;
    offset?: number;
  }): Promise<{ items: SoundTok[]; total: number; hasMore: boolean; limit: number; offset: number }> => {
    const response = await api.get('/soundtok', {
      params: {
        limit: opts?.limit ?? 20,
        offset: opts?.offset ?? 0,
      },
    });
    const data = response.data;
    if (Array.isArray(data)) {
      return { items: data, total: data.length, hasMore: false, limit: data.length, offset: 0 };
    }
    return data;
  },

  likeSoundTok: async (id: string) => {
    const response = await api.post(`/soundtok/${id}/like`);
    return response.data;
  },

  unlikeSoundTok: async (id: string) => {
    const response = await api.delete(`/soundtok/${id}/like`);
    return response.data;
  },

  getComments: async (soundTokId: string): Promise<Comment[]> => {
    const response = await api.get(`/soundtok/${soundTokId}/comments`);
    return response.data;
  },

  createComment: async (soundTokId: string, text: string): Promise<CreateCommentResponse> => {
    const response = await api.post(`/soundtok/${soundTokId}/comments`, { text });
    return response.data;
  },
};

export default soundTokApi;
