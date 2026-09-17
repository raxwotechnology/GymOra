import { io } from "socket.io-client";

const defaultDevUrl = "http://localhost:5000";
const isDev = import.meta.env.DEV;
const SERVER_URL = import.meta.env.VITE_API_URL !== undefined 
  ? import.meta.env.VITE_API_URL 
  : (isDev ? defaultDevUrl : (typeof window !== "undefined" ? window.location.origin : ""));

let socket = null;

export function connectSocket(token) {
  if (socket?.connected) return socket;

  socket = io(SERVER_URL, {
    auth: { token },
    autoConnect: true,
    reconnectionAttempts: 5,
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getSocket() {
  return socket;
}
