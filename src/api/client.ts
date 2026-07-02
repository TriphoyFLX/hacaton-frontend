import axios from 'axios';

export const API_ORIGIN = import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, '') || 'http://localhost:5002';

export const api = axios.create({
  baseURL: `${API_ORIGIN}/api`,
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

export default api;
