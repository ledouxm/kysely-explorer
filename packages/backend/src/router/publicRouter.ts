import { Hono } from "hono";
import { db } from "../db";
import { createEndpoint, createRouter } from "better-call";

// export const publicRouter = new Hono();

const isFirstConnection = createEndpoint(
  "/public/is-first-connection",
  {
    method: "GET",
    use: [],
  },
  async (ctx) => {
    const hasUsers = await db
      .selectFrom("user")
      .select(({ fn }) => [fn.count("id").as("count")])
      .executeTakeFirst();

    return {
      isFirstConnection: hasUsers!.count === 0,
    };
  },
);

export const publicRouter = createRouter({ isFirstConnection });
// export type AppRouter = PublicRoutes | ConnectionRoutes;
