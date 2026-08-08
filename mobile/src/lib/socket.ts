import { io, Socket } from 'socket.io-client';
import { API_URL } from '../constants';
import { authStorage } from './auth';

let socket: Socket | null = null;

export const getSocket = async (): Promise<Socket> => {
  if (socket) return socket;

  const serverUrl = API_URL.replace('/api/v1', '');
  const token = await authStorage.getAccessToken();

  socket = io(serverUrl, {
    auth: {
      token,
    },
    autoConnect: false,
    transports: ['websocket'], // Native RN recommends websocket transport explicitly
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
