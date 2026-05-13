import { io, Socket } from 'socket.io-client';
import { SOCKET_PATH, SOCKET_URL } from './config';

let socketInstance: Socket | null = null;

const buildSocket = (): Socket => {
  const socket = io(SOCKET_URL, {
    path: SOCKET_PATH,
    transports: ['polling', 'websocket'],
    upgrade: true,
    reconnection: true,
    reconnectionAttempts: 30,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    randomizationFactor: 0.5,
    timeout: 15000,
    withCredentials: true,
    autoConnect: false,
  });

  socket.on('connect', () => {
    console.info('[socket] connected', {
      id: socket.id,
      transport: socket.io.engine.transport.name,
      url: SOCKET_URL,
      path: SOCKET_PATH,
    });
  });

  socket.on('disconnect', (reason) => {
    console.warn('[socket] disconnected', { reason });
  });

  socket.on('connect_error', (err) => {
    console.error('[socket] connect_error', {
      message: err.message,
      description: err.description,
      context: err.context,
    });
  });

  socket.io.on('reconnect_attempt', (attempt) => {
    console.info('[socket] reconnect_attempt', { attempt });
  });

  socket.io.on('reconnect_failed', () => {
    console.error('[socket] reconnect_failed: max attempts reached');
  });

  socket.io.on('reconnect_error', (err) => {
    console.error('[socket] reconnect_error', { message: err.message });
  });

  socket.io.on('upgrade_error', (err) => {
    console.error('[socket] upgrade_error', { message: err.message });
  });

  socket.io.engine.on('upgrade', (transport) => {
    console.info('[socket] upgraded transport', { to: transport.name });
  });

  return socket;
};

export const getSocket = (): Socket => {
  if (!socketInstance) {
    socketInstance = buildSocket();
  }
  return socketInstance;
};

export const closeSocket = () => {
  if (!socketInstance) return;
  socketInstance.removeAllListeners();
  socketInstance.io.removeAllListeners();
  socketInstance.disconnect();
  socketInstance = null;
};
