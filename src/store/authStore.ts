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
  emailVerified?: boolean;
  displayName?: string | null;
  avatar?: string | null;
}

interface AuthState {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<{ requiresVerification?: boolean; email?: string }>;
  register: (username: string, email: string, password: string, birthDate: string) => Promise<{ requiresVerification: boolean; email: string }>;
  verifyEmail: (email: string, code: string) => Promise<void>;
  resendCode: (email: string) => Promise<void>;
  setSession: (user: User, token: string) => void;
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

      setSession: (user, token) => {
        syncAuthStorage(user, token);
        set({ user, token });
      },

      login: async (email: string, password: string) => {
        try {
          const response = await authApi.login(email, password);
          const { user, token } = response.data;
          syncAuthStorage(user, token);
          set({ user, token });
          return {};
        } catch (err: any) {
          if (err.response?.data?.requiresVerification) {
            return {
              requiresVerification: true,
              email: err.response.data.email || email,
            };
          }
          throw err;
        }
      },

      register: async (username: string, email: string, password: string, birthDate: string) => {
        const response = await authApi.register(username, email, password, birthDate);
        if (response.data.requiresVerification) {
          return { requiresVerification: true, email: response.data.email || email };
        }
        const { user, token } = response.data;
        syncAuthStorage(user, token);
        set({ user, token });
        return { requiresVerification: false, email };
      },

      verifyEmail: async (email: string, code: string) => {
        const response = await authApi.verifyEmail(email, code);
        const { user, token } = response.data;
        syncAuthStorage(user, token);
        set({ user, token });
      },

      resendCode: async (email: string) => {
        await authApi.resendCode(email);
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
