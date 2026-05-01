import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5002/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

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
  media: Media[];
  author: {
    id: string;
    username: string;
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
  
  getPosts: async () => {
    const response = await api.get('/posts');
    return response.data;
  },
};

export default api;
