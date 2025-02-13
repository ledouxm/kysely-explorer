import { io, Socket } from "socket.io-client";

const sockets = new Map<string, Socket>();

export const connectToWSS = (connectionString: string) => {
  const socket = io("http://localhost:3001", {
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
