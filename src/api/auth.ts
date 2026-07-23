import api, { API_ORIGIN } from './client';

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),

  register: (username: string, email: string, password: string, birthDate: string) =>
    api.post('/auth/register', { username, email, password, birthDate, agreedToTerms: true }),

  verifyEmail: (email: string, code: string) =>
    api.post('/auth/verify-email', { email, code }),

  resendCode: (email: string) =>
    api.post('/auth/resend-code', { email }),

  getMe: (token?: string) => api.get('/auth/me', token
    ? { headers: { Authorization: `Bearer ${token}` } }
    : undefined),

  getProviders: () => api.get<{ google: boolean; vk: boolean }>('/auth/providers'),

  googleUrl: () => `${API_ORIGIN}/api/auth/google`,
  vkUrl: () => `${API_ORIGIN}/api/auth/vk`,
};

export default api;
