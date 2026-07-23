import api from './client';

export interface Media {
  id: string;
  type: 'IMAGE' | 'VIDEO' | 'AUDIO';
  url: string;
  createdAt: string;
}

export interface Post {
  id: string;
  content: string;
  authorId: string;
  createdAt: string;
  updatedAt: string;
  likes: number;
  commentsCount: number;
  views: number;
  isLiked: boolean;
  media: Media[];
  author: {
    id: string;
    username: string;
    displayName?: string | null;
    avatar?: string | null;
  };
}

export interface PostComment {
  id: string;
  text: string;
  authorId: string;
  postId: string;
  createdAt: string;
  author: {
    id: string;
    username: string;
    displayName?: string | null;
    avatar?: string | null;
  };
}

export const postsApi = {
  createPost: async (content: string, files: File[]) => {
    const formData = new FormData();
    formData.append('content', content);
    files.forEach(file => formData.append('media', file));
    
    const response = await api.post('/posts', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  
  getPosts: async (
    sort: 'latest' | 'trending' = 'latest',
    tag?: string,
    opts?: { limit?: number; offset?: number },
  ): Promise<{ items: Post[]; total: number; hasMore: boolean; limit: number; offset: number }> => {
    const response = await api.get('/posts', {
      params: {
        sort,
        ...(tag && { tag }),
        limit: opts?.limit ?? 30,
        offset: opts?.offset ?? 0,
      },
    });
    const data = response.data;
    // Backward-compat if an older API still returns a bare array
    if (Array.isArray(data)) {
      return { items: data, total: data.length, hasMore: false, limit: data.length, offset: 0 };
    }
    return data;
  },

  getPost: async (id: string): Promise<Post> => (await api.get(`/posts/${id}`)).data,
  likePost: async (id: string) => (await api.post(`/posts/${id}/like`)).data,
  unlikePost: async (id: string) => (await api.delete(`/posts/${id}/like`)).data,
  recordView: async (id: string): Promise<{ id: string; views: number }> => (await api.post(`/posts/${id}/view`)).data,
  getComments: async (id: string): Promise<PostComment[]> => (await api.get(`/posts/${id}/comments`)).data,
  createComment: async (id: string, text: string): Promise<{ comment: PostComment; commentsCount: number }> =>
    (await api.post(`/posts/${id}/comments`, { text })).data,
  deletePost: async (id: string): Promise<{ success: boolean; id: string }> =>
    (await api.delete(`/posts/${id}`)).data,
  deleteComment: async (
    postId: string,
    commentId: string
  ): Promise<{ success: boolean; id: string; commentsCount: number }> =>
    (await api.delete(`/posts/${postId}/comments/${commentId}`)).data,
};

export default api;
