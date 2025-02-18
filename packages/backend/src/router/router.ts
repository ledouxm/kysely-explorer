import { Hono } from "hono";
import { auth } from "../auth";

import { serve } from "@hono/node-server";
import { createRouter } from "better-call";
import { cors } from "hono/cors";
import { ref } from "../hmr";
import { connectionRoutes } from "./connectionRouter";
import { fileRoutes } from "./fileRouter";
import { publicRoutes } from "./publicRouter";
import { llmRoutes } from "./llmRouter";

export const makeRouter = () => {
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
    }),
  );

  // router.use("*", async (c, next) => {
  //   const session = await auth.api.getSession({ headers: c.req.raw.headers });
  //   return next();
  // });

  router.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));
  router.on(["GET", "POST"], "/api/*", (c) => appRouter.handler(c.req.raw));

  ref.router = serve(
    {
      fetch: router.fetch,
      port: 3005,
    },
    (address) =>
      console.log(`Hono listening on ${address.address}:${address.port}`),
  );
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
  },
);

export type AppRouter = typeof appRouter;
