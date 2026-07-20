import axios from 'axios';
import { getAuthToken } from '../lib/authToken';

const configuredApiOrigin = import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, '');

// In production the API is reverse-proxied by Nginx under the same domain.
// Falling back to the current origin avoids requests from a visitor's phone
// being sent to its own localhost:5002.
export const API_ORIGIN = configuredApiOrigin
  || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5002');

export const api = axios.create({
  baseURL: `${API_ORIGIN}/api`,
  timeout: 60_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // FormData must keep its multipart boundary — never force application/json
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    const headers = config.headers as { delete?: (k: string) => void; set?: (k: string, v: unknown) => void } & Record<string, unknown>;
    if (typeof headers.delete === 'function') {
      headers.delete('Content-Type');
      headers.delete('content-type');
    } else {
      delete headers['Content-Type'];
      delete headers['content-type'];
    }
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
