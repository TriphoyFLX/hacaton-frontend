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

export interface SoundTok {
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
}

export const soundTokApi = {
  createSoundTok: async (description: string, videoFile: File) => {
    const formData = new FormData();
    formData.append('description', description);
    formData.append('video', videoFile);
    
    const response = await api.post('/soundtok', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  
  getSoundToks: async () => {
    const response = await api.get('/soundtok');
    return response.data;
  },
  
  likeSoundTok: async (id: string) => {
    const response = await api.post(`/soundtok/${id}/like`);
    return response.data;
  },
};

export default api;
