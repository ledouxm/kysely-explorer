import type { Server } from "socket.io";
import type { ServerType } from "@hono/node-server";

export const ref = {} as {
  io: Server;
  httpInstance: ServerType;
  router: ServerType;
};

export async function registerViteHmrServerRestart() {
  // @ts-ignore
  const hot = (import.meta as any).hot;
  if (hot) {
    await hot.data.stopping;
    // This is executed on file changed
    let reload = async () => {
      console.info("Performing an HMR reload...");
      ref.io?.close();
      ref.httpInstance?.close();
      ref.router?.close();
    };
    hot.on("vite:beforeFullReload", async () => {
      const stopping = reload();
      reload = () => Promise.resolve();
      if (hot) hot.data.stopping = stopping;
    });
  }
}
