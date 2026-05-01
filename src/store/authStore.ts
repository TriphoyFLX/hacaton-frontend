import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '../api/auth';

interface User {
  id: string;
  email: string;
  username: string;
  birthDate: string;
  createdAt: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, birthDate: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      
      login: async (email: string, password: string) => {
        const response = await authApi.login(email, password);
        const { user, token } = response.data;
        set({ user, token });
        localStorage.setItem('token', token);
      },
      
      register: async (username: string, email: string, password: string, birthDate: string) => {
        const response = await authApi.register(username, email, password, birthDate);
        const { user, token } = response.data;
        set({ user, token });
        localStorage.setItem('token', token);
      },
      
      logout: () => {
        set({ user: null, token: null });
        localStorage.removeItem('token');
      },
      
      checkAuth: async () => {
        const token = localStorage.getItem('token');
        if (token) {
          try {
            const response = await authApi.getMe();
            set({ user: response.data, token });
          } catch (error) {
            set({ user: null, token: null });
            localStorage.removeItem('token');
          }
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, token: state.token }),
    }
  )
);
