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

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  
  register: (username: string, email: string, password: string, birthDate: string) =>
    api.post('/auth/register', { username, email, password, birthDate, agreedToTerms: true }),
  
  getMe: () => api.get('/auth/me'),
};

export default api;
