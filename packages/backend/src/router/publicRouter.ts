import { Hono } from "hono";
import { db } from "../db";
import { ConnectionRoutes } from "./connectionRouter";
import { FileRoutes } from "./fileRouter";

export const publicRouter = new Hono();

const routes = publicRouter.get("/is-first-connection", async (c) => {
  const hasUsers = await db
    .selectFrom("user")
    .select(({ fn }) => [fn.count("id").as("count")])
    .executeTakeFirst();

  return c.text(hasUsers!.count === 0 ? "true" : "false");
});

export type PublicRoutes = typeof routes;
export type AppRouter = PublicRoutes | ConnectionRoutes | FileRoutes;
