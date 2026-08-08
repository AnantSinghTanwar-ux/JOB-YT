'use client';

import { useAuthStore } from '@/store/auth.store';

export const useAuth = () => {
  const { user, isAuthenticated, isLoading, login, logout, initialize } = useAuthStore();
  return { user, isAuthenticated, isLoading, login, logout, initialize };
};
