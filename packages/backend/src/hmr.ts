import { Server } from "socket.io";
import { Server as HttpServer } from "http";
import {} from "hono";
import { ServerType } from "@hono/node-server";

export const ref = {} as {
  io: Server;
  httpServer: HttpServer;
  router: ServerType;
};

export async function registerViteHmrServerRestart() {
  const hot = (import.meta as any).hot;
  if (hot) {
    await hot.data.stopping;
    // This is executed on file changed
    let reload = async () => {
      console.info("Performing an HMR reload...");
      ref.io.close();
      ref.httpServer.close();
      ref.router?.close();
    };
    hot.on("vite:beforeFullReload", async () => {
      const stopping = reload();
      reload = () => Promise.resolve();
      if (hot) hot.data.stopping = stopping;
    });
  }
}
