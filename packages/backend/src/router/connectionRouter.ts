import { z } from "zod";
import { createLoggedInEndpoint } from "./routerUtils";
import { db } from "../db";

export const getConnections = createLoggedInEndpoint(
  "/get-connections",
  { method: "GET" },
  async (c) => {
    const user = c.context.user;

    const connections = await db
      .selectFrom("connection")
      .where("user_id", "=", user.id)
      .orderBy("created_at", "asc")
      .selectAll()
      .execute();

    return { connections };
  },
);

export const createConnection = createLoggedInEndpoint(
  "/create-connection",
  { method: "POST", body: z.object({ connectionString: z.string() }) },
  async (c) => {
    const user = c.context.user;
    const { connectionString } = c.body;

    const connection = await db
      .insertInto("connection")
      .values({ user_id: user.id, connection_string: connectionString })
      .returningAll()
      .executeTakeFirst();

    return { connection };
  },
);

export const removeConnection = createLoggedInEndpoint(
  "/remove-connection",
  { method: "POST", body: z.object({ connectionId: z.number() }) },
  async (c) => {
    const { connectionId } = c.body;

    await db
      .deleteFrom("connection")
      .where("id", "=", connectionId as any)
      .execute();

    return {};
  },
);

export const connectionRoutes = {
  getConnections,
  createConnection,
  removeConnection,
};
