import api from './client';

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  
  register: (username: string, email: string, password: string, birthDate: string) =>
    api.post('/auth/register', { username, email, password, birthDate, agreedToTerms: true }),
  
  getMe: () => api.get('/auth/me'),
};

export default api;
