'use client';

import { useEffect } from 'react';
import { connectSocket, disconnectSocket, getSocket } from '@/lib/socket';
import { useAuthStore } from '@/store/auth.store';
import { authStorage } from '@/lib/auth';

export const useSocket = () => {
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    const onTokenInvalid = () => {
      useAuthStore.getState().logout();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('auth:token-invalid', onTokenInvalid as EventListener);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('auth:token-invalid', onTokenInvalid as EventListener);
      }
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      disconnectSocket();
      return;
    }

    // Read token at effect time (after auth is confirmed) to avoid race condition
    const token = authStorage.getAccessToken();
    connectSocket(token);

    return () => {
      disconnectSocket();
    };
  }, [isAuthenticated]);

  return getSocket();
};
