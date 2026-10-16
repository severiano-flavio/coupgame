import { io, type Socket } from 'socket.io-client';

/**
 * Cliente Socket.IO singleton. O cliente apenas envia intenções e recebe
 * snapshots; nunca determina resultado de jogo (ver constituição §4).
 */
const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3001';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SERVER_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 500,
      reconnectionDelayMax: 5000,
      transports: ['websocket'],
    });
  }
  return socket;
}
