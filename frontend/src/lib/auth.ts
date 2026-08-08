import { tokenStore } from './api';
import { AuthUser, AuthTokens } from '@/types';

const ACCESS_TOKEN_KEY = 'hp_access';
const REFRESH_TOKEN_KEY = 'hp_refresh';

export const authStorage = {
  saveTokens: (tokens: AuthTokens) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
    tokenStore.set(tokens.accessToken);
  },
  getAccessToken: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },
  getRefreshToken: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },
  clearTokens: () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    tokenStore.set(null);
  },
};

export const decodeToken = (token: string): AuthUser | null => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return {
      id: payload.userId,
      email: payload.email ?? null,
      role: payload.role,
      email_verified: payload.email_verified,
    };
  } catch {
    return null;
  }
};

export const initAuth = () => {
  const token = authStorage.getAccessToken();
  if (token) tokenStore.set(token);
};
