import { io, Socket } from 'socket.io-client';

export const API_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_API_URL || 'https://niviine.onrender.com';

let socketInstance: Socket | null = null;

export const getSocket = (): Socket => {
  if (socketInstance) {
    return socketInstance;
  }

  socketInstance = io(API_URL, {
    path: '/ws',
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
    timeout: 20000,
    autoConnect: false,
  });

  socketInstance.on('connect', () => {
    console.log('Socket connected');
  });

  socketInstance.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
  });

  socketInstance.on('connect_error', (err) => {
    console.error('Socket connection error:', err);
  });

  return socketInstance;
};

export const closeSocket = () => {
  if (!socketInstance) return;
  socketInstance.removeAllListeners();
  socketInstance.disconnect();
  socketInstance = null;
};
