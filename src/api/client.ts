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
  // Keep default snappy; long uploads override per-request.
  timeout: 20_000,
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
    // Network / timeout / CORS — never treat as "logged out"
    if (!error.response) {
      return Promise.reject(error);
    }

    const requestUrl = String(error.config?.url || '');
    const isCredentialRequest = /\/auth\/(login|register|verify-email|resend-code)$/.test(requestUrl);
    const isAuthProbe = /\/auth\/me$/.test(requestUrl);
    // Only the canonical session probe is allowed to clear global auth.
    // A 401 from an individual action can be endpoint-specific and must not
    // throw the user out in the middle of a swipe, upload, or chat.
    if (error.response.status === 401 && getAuthToken() && !isCredentialRequest && isAuthProbe) {
      const { useAuthStore } = await import('../store/authStore');
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

export default api;
