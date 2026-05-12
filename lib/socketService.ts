import { io, Socket } from 'socket.io-client';
import { API_URL } from './config';

let socketInstance: Socket | null = null;

export const getSocket = (): Socket => {
  if (socketInstance) return socketInstance;

  socketInstance = io(API_URL, {
    path: '/ws',
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 20000,
    randomizationFactor: 0.5,
    timeout: 20000,
    autoConnect: false,
  });

  socketInstance.on('connect', () => {
    console.log('[socket] connected:', socketInstance?.id);
  });

  socketInstance.on('disconnect', (reason) => {
    console.log('[socket] disconnected:', reason);
  });

  socketInstance.on('connect_error', (err) => {
    console.error('[socket] connection error:', err.message);
  });

  socketInstance.io.on('reconnect_attempt', (attempt) => {
    console.log(`[socket] reconnect attempt ${attempt}`);
  });

  socketInstance.io.on('reconnect_error', (err) => {
    console.error('[socket] reconnect error:', err.message);
  });

  socketInstance.io.on('upgrade_error', (err) => {
    console.error('[socket] transport upgrade failure:', err.message);
  });

  return socketInstance;
};

export const closeSocket = () => {
  if (!socketInstance) return;
  socketInstance.removeAllListeners();
  socketInstance.io.removeAllListeners();
  socketInstance.disconnect();
  socketInstance = null;
};
