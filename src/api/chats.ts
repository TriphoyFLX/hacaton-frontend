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

export interface Chat {
  id: string;
  createdAt: string;
  updatedAt: string;
  users: Array<{
    id: string;
    userId: string;
    chatId: string;
    createdAt: string;
    user: {
      id: string;
      username: string;
    };
  }>;
  messages: Array<{
    id: string;
    content: string;
    senderId: string;
    receiverId: string;
    chatId: string;
    createdAt: string;
    sender: {
      id: string;
      username: string;
    };
  }>;
}

export interface Message {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  chatId: string;
  createdAt: string;
  sender: {
    id: string;
    username: string;
  };
}

export const chatsApi = {
  getChats: async () => {
    const response = await api.get('/chats');
    return response.data;
  },
  
  getMessages: async (chatId: string) => {
    const response = await api.get(`/chats/${chatId}/messages`);
    return response.data;
  },
  
  createChat: async (receiverId: string) => {
    const response = await api.post('/chats', { receiverId });
    return response.data;
  },
  
  sendMessage: async (chatId: string, content: string) => {
    const response = await api.post(`/chats/${chatId}/messages`, { content });
    return response.data;
  },
};

export default api;
