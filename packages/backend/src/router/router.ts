import { Hono } from "hono";
import { auth, GlobalHonoConfig } from "../auth";

import { serve } from "@hono/node-server";
import { createRouter, generator, Prettify } from "better-call";
import fs from "fs/promises";
import { cors } from "hono/cors";
import { ref } from "../hmr";
import { connectionRoutes } from "./connectionRouter";
import { fileRoutes } from "./fileRouter";
import { publicRoutes } from "./publicRouter";

export const makeRouter = () => {
  const router = new Hono<GlobalHonoConfig>();
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
      ],
      allowMethods: ["POST", "GET", "OPTIONS", "PUT", "DELETE"],
      exposeHeaders: ["Content-Length", "Content-Type"],
      maxAge: 600,
    }),
  );

  router.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));
  router.on(["GET", "POST"], "/api/*", (c) => appRouter.handler(c.req.raw));

  // router.route("/api/connection")

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
  },
  {
    basePath: "/api",
    openAPI: {
      path: "/api/openapi",
    },
  },
);

const openApi = await generator(appRouter.endpoints);
await fs.writeFile("openapi.json", JSON.stringify(openApi, null, 2));

export type AppRouter = Prettify<typeof appRouter>;
