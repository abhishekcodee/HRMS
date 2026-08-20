import { io, Socket } from 'socket.io-client';

const SOCKET_URL = `${window.location.protocol}//${window.location.hostname}:4000`;

let socket: Socket | null = null;

export function getChatSocket(): Socket {
  if (!socket) {
    const token = localStorage.getItem('hrms_auth_token') || localStorage.getItem('hrms_token') || localStorage.getItem('token') || '';
    socket = io(SOCKET_URL, {
      auth: { token },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
  }
  return socket;
}

export function disconnectChatSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
