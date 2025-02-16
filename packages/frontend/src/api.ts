import { io, Socket } from "socket.io-client";
import { hc } from "hono/client";
import { ApiRouter } from "../../backend/src/router/router";
import { createClient } from "better-call/client";

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

// export const api = hc<AppRouter>("http://localhost:3005/api", {
//   init: { credentials: "include", mode: "cors" },
// });

export const api = createClient<ApiRouter>({
  baseURL: "http://localhost:3005/api",
});
