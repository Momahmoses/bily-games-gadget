import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import Cookies from 'js-cookie';
import { User } from '@/types';
import api from '@/lib/api';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setUser: (user: User) => void;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export const useAuthStore = create<AuthState>()(
  immer(
    persist(
      (set, get) => ({
        user: null,
        accessToken: null,
        isAuthenticated: false,
        isLoading: false,

        login: async (email, password) => {
          set((state) => { state.isLoading = true; });
          try {
            const response = await api.post('/auth/login', { email, password }) as any;
            const { user, accessToken, refreshToken } = response.data;

            Cookies.set('accessToken', accessToken, { expires: 7, secure: true, sameSite: 'strict' });
            Cookies.set('refreshToken', refreshToken, { expires: 30, secure: true, sameSite: 'strict' });

            set((state) => {
              state.user = user;
              state.accessToken = accessToken;
              state.isAuthenticated = true;
              state.isLoading = false;
            });
          } catch (error) {
            set((state) => { state.isLoading = false; });
            throw error;
          }
        },

        register: async (data) => {
          set((state) => { state.isLoading = true; });
          try {
            const response = await api.post('/auth/register', data) as any;
            const { user, accessToken, refreshToken } = response.data;

            Cookies.set('accessToken', accessToken, { expires: 7, secure: true, sameSite: 'strict' });
            Cookies.set('refreshToken', refreshToken, { expires: 30, secure: true, sameSite: 'strict' });

            set((state) => {
              state.user = user;
              state.accessToken = accessToken;
              state.isAuthenticated = true;
              state.isLoading = false;
            });
          } catch (error) {
            set((state) => { state.isLoading = false; });
            throw error;
          }
        },

        logout: async () => {
          try {
            const refreshToken = Cookies.get('refreshToken');
            await api.post('/auth/logout', { refreshToken });
          } catch {}
          Cookies.remove('accessToken');
          Cookies.remove('refreshToken');
          set((state) => {
            state.user = null;
            state.accessToken = null;
            state.isAuthenticated = false;
          });
        },

        refreshProfile: async () => {
          try {
            const response = await api.get('/auth/profile') as any;
            set((state) => { state.user = response.data; });
          } catch {
            get().logout();
          }
        },

        setUser: (user) => {
          set((state) => { state.user = user; });
        },
      }),
      {
        name: 'bily-auth',
        partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
      },
    ),
  ),
);
