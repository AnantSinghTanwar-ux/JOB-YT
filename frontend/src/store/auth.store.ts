'use client';

import { create } from 'zustand';
import { AuthUser } from '@/types';
import { authStorage, decodeToken } from '@/lib/auth';
import { api, tokenStore } from '@/lib/api';
import { signOut } from 'next-auth/react';

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  loading: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;

  setUser: (user: AuthUser | null) => void;
  setTokens: (accessToken: string | null, refreshToken: string | null) => void;
  setLoading: (loading: boolean) => void;
  setSession: (accessToken: string, refreshToken: string, user: AuthUser) => void;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => void;
  logoutWithApi: () => Promise<void>;
  initialize: () => Promise<void>;
}

type AuthMePayload = {
  id: string;
  userId?: string;
  email: string | null;
  role: AuthUser['role'];
  email_verified?: boolean;
};

const isAuthMePayload = (value: unknown): value is AuthMePayload => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<AuthMePayload>;
  const hasValidEmail = candidate.email === null || typeof candidate.email === 'string';
  const hasId = typeof candidate.id === 'string' || typeof candidate.userId === 'string';

  return (
    hasId &&
    typeof candidate.role === 'string' &&
    hasValidEmail
  );
};

const extractAuthUser = (payload: unknown): AuthUser | null => {
  // Supports: { data: { user } }, { user }, and { data: { userId, email, role } }.
  const wrapped = payload as { data?: { user?: unknown } | unknown; user?: unknown };
  const candidate =
    (wrapped?.data as { user?: unknown } | undefined)?.user ??
    wrapped?.user ??
    wrapped?.data;
  if (!isAuthMePayload(candidate)) return null;

  return {
    id: candidate.id || candidate.userId || '',
    email: candidate.email,
    role: candidate.role,
    email_verified: candidate.email_verified,
  };
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  loading: true,
  isLoading: false,
  isAuthenticated: false,

  setUser: (user) => {
    set({ user, isAuthenticated: Boolean(user) });
  },

  setTokens: (accessToken, refreshToken) => {
    tokenStore.set(accessToken);
    set({ accessToken, refreshToken });
  },

  setLoading: (loading) => {
    set({ loading });
  },

  setSession: (accessToken, refreshToken, user) => {
    authStorage.saveTokens({ accessToken, refreshToken });
    tokenStore.set(accessToken);
    set({
      user,
      accessToken,
      refreshToken,
      isAuthenticated: true,
    });
  },

  initialize: async () => {
    const { setUser, setTokens, logout, setLoading } = useAuthStore.getState();
    setLoading(true);

    try {
      const accessToken = authStorage.getAccessToken();
      const refreshToken = authStorage.getRefreshToken();

      if (!accessToken) {
        setTokens(null, refreshToken);
        setUser(null);
        return;
      }

      setTokens(accessToken, refreshToken);

      const fallbackUser = decodeToken(accessToken);
      if (fallbackUser) {
        setUser({
          id: fallbackUser.id,
          email: fallbackUser.email ?? null,
          role: fallbackUser.role,
          email_verified: fallbackUser.email_verified,
        });
        set({ loading: false });
      }

      const res = await api.get<{ user: AuthUser }>('/auth/me');
      const hydratedUser = extractAuthUser(res);

      if (!hydratedUser) {
        throw new Error('Invalid /auth/me response');
      }

      setUser(hydratedUser);
    } catch {
      logout();
    } finally {
      setLoading(false);
    }
  },

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const res = await api.post<{ accessToken: string; refreshToken: string; user: AuthUser }>(
        '/auth/login',
        { email, password }
      );
      const payload = res.data;
      if (!payload) {
        throw new Error('Invalid login response');
      }
      authStorage.saveTokens({ accessToken: payload.accessToken, refreshToken: payload.refreshToken });
      tokenStore.set(payload.accessToken);
      set({
        user: payload.user,
        accessToken: payload.accessToken,
        refreshToken: payload.refreshToken,
        isAuthenticated: true,
      });
      return payload.user;
    } finally {
      set({ isLoading: false });
    }
  },

  logout: () => {
    authStorage.clearTokens();
    const { user } = useAuthStore.getState();
    const wasEmployer = user?.role === 'recruiter' || user?.role === 'admin';
    
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    });

    if (typeof window !== 'undefined') {
      signOut({ redirect: false }).catch(() => {});
      
      const pathname = window.location.pathname;
      const PUBLIC_ROUTES = [
        '/',
        '/jobs',
        '/internships',
        '/login',
        '/register',
        '/employer/login',
        '/employer/register'
      ];
      
      const isPublic = PUBLIC_ROUTES.some(route => 
        pathname === route || (route !== '/' && pathname.startsWith(`${route}/`))
      );

      if (!isPublic) {
        const loginRoute = wasEmployer ? '/employer/login' : '/login';
        const currentPath = window.location.pathname + window.location.search;
        window.location.href = `${loginRoute}?redirect=${encodeURIComponent(currentPath)}`;
      }
    }
  },

  logoutWithApi: async () => {
    const refreshToken = authStorage.getRefreshToken();

    try {
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken });
      }
    } catch {
      // Local logout should still proceed if API logout fails.
    } finally {
      useAuthStore.getState().logout();
    }
  },
}));
