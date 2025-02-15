import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { GlobalHonoConfig } from "../auth";
import { loggedInMiddleware } from "./routerUtils";
import { db } from "../db";

export const connectionRouter = new Hono<GlobalHonoConfig>();
connectionRouter.use("*", loggedInMiddleware);

export const connectionRoutes = connectionRouter
  .post(
    "/create-connection",
    zValidator("json", z.object({ connectionString: z.string() })),
    async (c) => {
      const user = c.get("user")!;
      return c.json({ user });
    },
  )
  .get("/get-connections", async (c) => {
    const user = c.get("user")!;
    const connections = await db
      .selectFrom("connection")
      .where("user_id", "=", user.id)
      .orderBy("created_at", "asc")
      .selectAll()
      .execute();

    return c.json({ connections });
  });

export type ConnectionRoutes = typeof connectionRoutes;
