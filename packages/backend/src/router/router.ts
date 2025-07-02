import { Hono } from "hono";
import { auth } from "../auth.ts";

import { serve } from "@hono/node-server";
import { createRouter } from "better-call";
import { cors } from "hono/cors";
import { ref } from "../hmr.ts";
import { connectionRoutes } from "./connectionRouter.ts";
import { fileRoutes } from "./fileRouter.ts";
import { publicRoutes } from "./publicRouter.ts";
import { llmRoutes } from "./llmRouter.ts";
import { serveStatic } from "@hono/node-server/serve-static";
import { ENV } from "../envVar.ts";

export const makeRouter = ({ port } = { port: 3005 }) => {
  const router = new Hono();
  router.use(
    cors({
      origin: "http://localhost:5173",
      credentials: true,
      allowHeaders: [
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "Accept",
        "Origin",
        "X-Root-Token",
      ],
      allowMethods: ["POST", "GET", "OPTIONS", "PUT", "DELETE"],
      exposeHeaders: ["Content-Length", "Content-Type"],
      maxAge: 600,
    })
  );

  router.use("*", async (c, next) => {
    console.log(`[${c.req.method}] ${c.req.path}`);
    return next();
  });

  router.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));
  router.on(["GET", "POST"], "/api/*", (c) => appRouter.handler(c.req.raw));
  if (ENV.FRONTEND_FOLDER) {
    console.log("Serving static files from:", ENV.FRONTEND_FOLDER);
    router.on(["GET"], "/*", serveStatic({ root: ENV.FRONTEND_FOLDER }));
  }

  ref.router = serve(
    {
      fetch: router.fetch,
      port: port,
    },
    (address) => console.log(`Hono listening on ${address.address}:${address.port}`)
  );

  return ref.router;
};

const appRouter = createRouter(
  {
    ...connectionRoutes,
    ...publicRoutes,
    ...fileRoutes,
    ...llmRoutes,
  },
  {
    basePath: "/api",
    openAPI: {
      path: "/api/openapi",
    },
  }
);

export type AppRouter = typeof appRouter;
