import api from './client';

export interface Comment {
  id: string;
  text: string;
  authorId: string;
  soundTokId: string;
  parentId?: string | null;
  createdAt: string;
  likes?: number;
  dislikes?: number;
  isLiked?: boolean;
  isDisliked?: boolean;
  isHidden?: boolean;
  author: {
    id: string;
    username: string;
    displayName?: string | null;
    avatar?: string | null;
    role?: string;
    plan?: string;
    planExpiresAt?: string | null;
  };
}

export interface SoundTok {
  id: string;
  description: string;
  videoUrl: string;
  authorId: string;
  soundId?: string | null;
  likes: number;
  commentsCount: number;
  views?: number;
  repostsCount?: number;
  createdAt: string;
  updatedAt: string;
  isLiked?: boolean;
  isReposted?: boolean;
  authorIsFollowed?: boolean;
  author: {
    id: string;
    username: string;
    displayName?: string | null;
    avatar?: string | null;
    role?: string;
    plan?: string;
    planExpiresAt?: string | null;
  };
  sound?: {
    id: string;
    title: string;
    audioUrl: string;
    useCount: number;
    authorId: string;
    author?: {
      id: string;
      username: string;
      displayName?: string | null;
      avatar?: string | null;
    };
  } | null;
  comments?: Comment[];
}

export interface CreateCommentResponse {
  comment: Comment;
  commentsCount: number;
}

export const soundTokApi = {
  createSoundTok: async (
    description: string,
    videoFile: File,
    opts?: { soundId?: string }
  ) => {
    const formData = new FormData();
    formData.append('description', description);
    formData.append('video', videoFile);
    if (opts?.soundId) {
      formData.append('soundId', opts.soundId);
    }

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

  getSoundTok: async (id: string): Promise<SoundTok> => {
    const response = await api.get(`/soundtok/${id}`);
    return response.data;
  },

  likeSoundTok: async (id: string) => {
    const response = await api.post(`/soundtok/${id}/like`);
    return response.data;
  },

  unlikeSoundTok: async (id: string) => {
    const response = await api.delete(`/soundtok/${id}/like`);
    return response.data;
  },

  deleteSoundTok: async (id: string): Promise<{ success: boolean; id: string }> => {
    const response = await api.delete(`/soundtok/${id}`);
    return response.data;
  },

  repostSoundTok: async (id: string) => {
    const response = await api.post(`/soundtok/${id}/repost`);
    return response.data;
  },

  unrepostSoundTok: async (id: string) => {
    const response = await api.delete(`/soundtok/${id}/repost`);
    return response.data;
  },

  recordView: async (id: string, guestKey?: string) => {
    const response = await api.post(
      `/soundtok/${id}/view`,
      guestKey ? { guestKey } : {}
    );
    return response.data;
  },

  getComments: async (soundTokId: string): Promise<Comment[]> => {
    const response = await api.get(`/soundtok/${soundTokId}/comments`);
    return response.data;
  },

  createComment: async (
    soundTokId: string,
    text: string,
    parentId?: string | null,
  ): Promise<CreateCommentResponse> => {
    const response = await api.post(`/soundtok/${soundTokId}/comments`, {
      text,
      ...(parentId ? { parentId } : {}),
    });
    return response.data;
  },

  deleteComment: async (
    soundTokId: string,
    commentId: string,
  ): Promise<{ success: boolean; id: string; commentsCount: number }> => {
    const response = await api.delete(`/soundtok/${soundTokId}/comments/${commentId}`);
    return response.data;
  },

  likeComment: async (
    soundTokId: string,
    commentId: string,
  ): Promise<{ id: string; likes: number; dislikes: number; isLiked: boolean; isDisliked: boolean; isHidden: boolean; text: string }> => {
    const response = await api.post(`/soundtok/${soundTokId}/comments/${commentId}/like`);
    return response.data;
  },

  dislikeComment: async (
    soundTokId: string,
    commentId: string,
  ): Promise<{ id: string; likes: number; dislikes: number; isLiked: boolean; isDisliked: boolean; isHidden: boolean; text: string }> => {
    const response = await api.post(`/soundtok/${soundTokId}/comments/${commentId}/dislike`);
    return response.data;
  },
};

export default soundTokApi;
