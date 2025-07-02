import { io, Socket } from "socket.io-client";
import { AppRouter } from "../../backend/src/router/router";
import { createClient } from "better-call/client";

const sockets = new Map<string, Socket>();
const isDev = import.meta.env.DEV;

export const connectToWSS = (connectionString: string) => {
  const socket = io(isDev ? "http://localhost:3005" : "/", {
    auth: {
      connectionString,
    },
    retries: 0,
    autoConnect: false,
  });

  sockets.set(connectionString, socket);

  return socket;
};

export const cleanup = () => {
  for (const socket of sockets.values()) {
    socket.disconnect();
  }
};

export const api = createClient<AppRouter>({
  baseURL: isDev ? "http://localhost:3005/api" : "/api",
  throw: true,
  credentials: "include",
});
