import { io, Socket } from 'socket.io-client';
import { API_BASE } from '@/constants';
import { authStorage } from '@/lib/auth';

let socket: Socket | null = null;

const SERVER_URL = API_BASE.replace('/api/v1', '');

export const connectSocket = (token?: string | null): Socket | null => {
  // Don't connect if no auth token — backend will reject anyway
  const authToken = token || authStorage.getAccessToken();
  if (!authToken) return null;

  // Reuse existing connection if already connected with same token
  if (socket?.connected) return socket;

  // Disconnect stale socket before creating a new one
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  socket = io(SERVER_URL, {
    auth: (cb) => {
      const latestToken = authStorage.getAccessToken() || authToken;
      cb({ token: latestToken });
    },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 2000,
    reconnectionAttempts: 5,
  });

  socket.on('connect', () => console.log('[Socket] Connected'));
  socket.on('disconnect', () => console.log('[Socket] Disconnected'));
  // Only warn — not an error — so the console stays clean
  socket.on('connect_error', (err) => {
    console.warn('[Socket] Connection failed:', err.message);

    // Avoid endless reconnect loops with an invalid/expired token.
    if (err.message === 'Invalid token' || err.message === 'Authentication required') {
      socket?.disconnect();
      socket = null;
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:token-invalid'));
      }
    }
  });

  return socket;
};

export const disconnectSocket = () => {
  socket?.disconnect();
  socket = null;
};

export const getSocket = () => socket;

export const joinConversation = (conversationId: string) => {
  socket?.emit('join_conversation', conversationId);
};

export const leaveConversation = (conversationId: string) => {
  socket?.emit('leave_conversation', conversationId);
};
