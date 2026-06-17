import { io } from "socket.io-client";
import { BASE } from "./api";

// Single shared Socket.IO connection to the backend, lazily created in the
// browser. Server-side renders return null (no socket on the server).
let socket = null;

export function getSocket() {
  if (typeof window === "undefined") return null;
  if (!socket) {
    socket = io(BASE, { transports: ["websocket", "polling"] });
  }
  return socket;
}
