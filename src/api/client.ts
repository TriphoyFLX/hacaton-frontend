import axios from 'axios';
import { getAuthToken } from '../lib/authToken';

const configuredApiOrigin = import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, '');

const defaultApiOrigin = import.meta.env.DEV
  ? 'http://localhost:5002'
  : (typeof window !== 'undefined' ? window.location.origin : '');

export const API_ORIGIN = configuredApiOrigin
  || defaultApiOrigin;
export const SOCKET_ORIGIN = import.meta.env.VITE_SOCKET_URL?.replace(/\/$/, '')
  || API_ORIGIN;

export const api = axios.create({
  baseURL: `${API_ORIGIN}/api`,
  timeout: 60_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token && !config.headers.Authorization) {
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
    const requestUrl = String(error.config?.url || '');
    const isCredentialRequest = /\/auth\/(login|register|verify-email|resend-code)$/.test(requestUrl);
    if (error.response?.status === 401 && getAuthToken() && !isCredentialRequest) {
      const { useAuthStore } = await import('../store/authStore');
      useAuthStore.getState().logout();

      const path = window.location.pathname;
      if (!path.startsWith('/login') && !path.startsWith('/register')) {
        const next = encodeURIComponent(`${path}${window.location.search || ''}`);
        window.location.href = `/login?next=${next}`;
      }
    }
    return Promise.reject(error);
  }
);

export default api;
