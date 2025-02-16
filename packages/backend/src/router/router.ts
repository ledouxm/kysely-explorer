import { Hono } from "hono";
import { auth, GlobalHonoConfig } from "../auth";
import { toNodeHandler } from "better-auth/node";

import { serve } from "@hono/node-server";
import { cors } from "hono/cors";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { ref } from "../hmr";
import { connectionRouter, connectionRoutes } from "./connectionRouter";
import { createMiddleware, createRouter, Endpoint, Router } from "better-call";
import { publicRouter, publicRoutes } from "./publicRouter";

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

  router.use("*", async (c, next) => {
    console.log(c.req.method, c.req.url);
    const session = await auth.api.getSession({ headers: c.req.raw.headers });

    if (!session) {
      c.set("user", null);
      c.set("session", null);
      return next();
    }

    c.set("user", session.user);
    c.set("session", session.session);
    return next();
  });

  router.on(["GET", "POST"], "/api/private/*", (c) =>
    privateRouter.handler(c.req.raw),
  );
  router.on(["GET", "POST"], "/api/public/*", (c) =>
    publicRouter.handler(c.req.raw),
  );
  router.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));

  ref.router = serve(
    {
      fetch: router.fetch,
      port: 3005,
    },
    (address) =>
      console.log(`Hono listening on ${address.address}:${address.port}`),
  );
};

const loggedInMiddleware = createMiddleware(async (ctx) => {
  return {
    hello: true,
  };
});

const privateRouter = createRouter(
  {
    ...connectionRouter.endpoints,
    // ...userRouter.endpoints,
  },
  {
    basePath: "/api/private/",
    routerMiddleware: [
      { path: "/api/private/**", middleware: loggedInMiddleware },
    ],
  },
);

export type ApiRouter = WithPrefixedPath<typeof connectionRouter, "/private"> &
  WithPrefixedPath<typeof publicRouter, "/public">;

type WithPrefixedPath<T extends Router, Prefix extends string> = Omit<
  T,
  "endpoints"
> & {
  endpoints: {
    [K in keyof T["endpoints"]]: T["endpoints"][K] extends Endpoint<
      infer Path,
      infer Options
    >
      ? Endpoint<`${Prefix}${Path}`, Options>
      : never;
  };
};

type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};
