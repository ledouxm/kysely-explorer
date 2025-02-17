import { Hono } from "hono";
import { db } from "../db";
import {
  createEndpoint,
  createMiddleware,
  createRouter,
  Endpoint,
  EndpointContext,
  EndpointOptions,
  InferUse,
  Middleware,
  Prettify,
} from "better-call";
import {
  createEndpointWithContext,
  createIntermediateRouter,
} from "./routerUtils";
import { z } from "zod";
import { createPublicEndpoint } from "./middlewares";

// export const publicRouter = new Hono();

const middleMiddleware = createMiddleware(async (ctx) => {
  console.log("middle");
  return { middle: "set" };
});

const isFirstConnection = createPublicEndpoint(
  "/is-first-connection",
  {
    method: "GET",
    use: [middleMiddleware],
  },
  async (ctx) => {
    return ctx.context;
  },
);

export const publicRouter = createIntermediateRouter({
  isFirstConnection,
});

// export type AppRouter = PublicRoutes | ConnectionRoutes;
