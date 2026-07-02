import api from './client';

export interface SearchResult {
  users: Array<{
    id: string;
    username: string;
    displayName?: string | null;
    avatar?: string | null;
    bio?: string | null;
    createdAt: string;
  }>;
  posts: Array<{
    id: string;
    content: string;
    authorId: string;
    createdAt: string;
    updatedAt: string;
    media: Array<{
      id: string;
      type: 'IMAGE' | 'VIDEO' | 'AUDIO';
      url: string;
      createdAt: string;
      postId: string;
    }>;
    author: {
      id: string;
      username: string;
    };
  }>;
  soundToks: Array<{
    id: string;
    description: string;
    videoUrl: string;
    authorId: string;
    likes: number;
    createdAt: string;
    updatedAt: string;
    author: {
      id: string;
      username: string;
    };
  }>;
}

export const searchApi = {
  search: async (query: string, type?: 'users' | 'posts' | 'soundtoks') => {
    const params = new URLSearchParams();
    params.append('q', query);
    if (type) params.append('type', type);
    
    const response = await api.get(`/search?${params}`);
    return response.data;
  },
};

export default api;
