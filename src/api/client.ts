import axios from 'axios';
import { getAuthToken } from '../lib/authToken';

export const API_ORIGIN = import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, '') || 'http://localhost:5002';

export const api = axios.create({
  baseURL: `${API_ORIGIN}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && getAuthToken()) {
      const { useAuthStore } = await import('../store/authStore');
      useAuthStore.getState().logout();

      const path = window.location.pathname;
      if (!path.startsWith('/login') && !path.startsWith('/register')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
