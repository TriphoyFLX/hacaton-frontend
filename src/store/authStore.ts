import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '../api/auth';
import {
  clearAuthSession,
  getAuthToken,
  setAuthToken,
  setAuthUserId,
} from '../lib/authToken';

interface User {
  id: string;
  email: string;
  username: string;
  birthDate: string;
  createdAt: string;
  role?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, birthDate: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

function syncAuthStorage(user: User | null, token: string | null) {
  if (token) {
    setAuthToken(token);
  } else {
    clearAuthSession();
    return;
  }

  if (user?.id) {
    setAuthUserId(user.id);
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,

      login: async (email: string, password: string) => {
        const response = await authApi.login(email, password);
        const { user, token } = response.data;
        syncAuthStorage(user, token);
        set({ user, token });
      },

      register: async (username: string, email: string, password: string, birthDate: string) => {
        const response = await authApi.register(username, email, password, birthDate);
        const { user, token } = response.data;
        syncAuthStorage(user, token);
        set({ user, token });
      },

      logout: () => {
        clearAuthSession();
        set({ user: null, token: null });
      },

      checkAuth: async () => {
        const token = getAuthToken();
        if (!token) {
          clearAuthSession();
          set({ user: null, token: null });
          return;
        }

        try {
          const response = await authApi.getMe();
          syncAuthStorage(response.data, token);
          set({ user: response.data, token });
        } catch {
          clearAuthSession();
          set({ user: null, token: null });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, token: state.token }),
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          syncAuthStorage(state.user, state.token);
        }
      },
    }
  )
);
