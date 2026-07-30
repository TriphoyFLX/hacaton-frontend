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

export interface SoundTokAuthor {
  id: string;
  username: string;
  displayName?: string | null;
  avatar?: string | null;
  role?: string;
  plan?: string;
  planExpiresAt?: string | null;
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
  sharesCount?: number;
  createdAt: string;
  updatedAt: string;
  isLiked?: boolean;
  isReposted?: boolean;
  authorIsFollowed?: boolean;
  repostPreview?: SoundTokAuthor[];
  author: SoundTokAuthor;
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
    opts?: {
      soundId?: string;
      signal?: AbortSignal;
      onUploadProgress?: (event: { loaded: number; total?: number }) => void;
    }
  ) => {
    const formData = new FormData();
    formData.append('description', description);
    // Normalize phone MediaRecorder / gallery MIME so multer never rejects the clip
    const rawType = (videoFile.type || '').toLowerCase().split(';')[0].trim();
    const nameLower = (videoFile.name || '').toLowerCase();
    const isMp4 =
      rawType.includes('mp4') ||
      rawType.includes('quicktime') ||
      rawType.includes('m4v') ||
      rawType.includes('3gpp') ||
      /\.(mp4|m4v|mov|3gp|3gpp)$/i.test(nameLower);
    const ext = isMp4
      ? /\.mov$/i.test(nameLower)
        ? 'mov'
        : 'mp4'
      : 'webm';
    const safeMime =
      ext === 'mov'
        ? 'video/quicktime'
        : isMp4
          ? 'video/mp4'
          : 'video/webm';
    const safeName = `soundtok-${Date.now()}.${ext}`;
    const uploadBlob = new File([videoFile], safeName, {
      type: safeMime,
      lastModified: videoFile.lastModified || Date.now(),
    });
    formData.append('video', uploadBlob, safeName);
    if (opts?.soundId) {
      formData.append('soundId', opts.soundId);
    }

    const response = await api.post('/soundtok', formData, {
      // Compress + large phone uploads need a long window
      timeout: 300_000,
      signal: opts?.signal,
      onUploadProgress: opts?.onUploadProgress,
    });
    return response.data as SoundTok;
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

  recordShare: async (id: string): Promise<{ id: string; sharesCount: number }> => {
    const response = await api.post(`/soundtok/${id}/share`);
    return response.data;
  },

  getReposts: async (
    id: string,
    opts?: { limit?: number; offset?: number }
  ): Promise<{
    items: Array<{ id: string; createdAt: string; user: SoundTokAuthor }>;
    total: number;
    hasMore: boolean;
    limit: number;
    offset: number;
  }> => {
    const response = await api.get(`/soundtok/${id}/reposts`, {
      params: {
        limit: opts?.limit ?? 30,
        offset: opts?.offset ?? 0,
      },
    });
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
