import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { GlobalHonoConfig } from "../auth";
import { loggedInMiddleware } from "./routerUtils";
import { db } from "../db";
import { createEndpoint, createRouter } from "better-call";

const getConnections = createEndpoint(
  "/get-connections",
  {
    method: "GET",
    use: [],
  },
  async (ctx) => {
    return {
      hello: "world",
    };
  },
);
const createConnections = createEndpoint(
  "/create-connections",
  {
    method: "POST",
    use: [],
  },
  async (ctx) => {
    return {
      hello: "world",
    };
  },
);

export const connectionRouter = createRouter({
  getConnections,
  createConnections,
});
// export const connectionRouter = new Hono<GlobalHonoConfig>();
// connectionRouter.use("*", loggedInMiddleware);

// export const connectionRoutes = connectionRouter
//   .post(
//     "/create-connection",
//     zValidator("json", z.object({ connectionString: z.string() })),
//     async (c) => {
//       const user = c.get("user")!;
//       const { connectionString } = c.req.valid("json");

//       const connection = await db
//         .insertInto("connection")
//         .values({ user_id: user.id, connection_string: connectionString })
//         .returningAll()
//         .executeTakeFirst();

//       return c.json({ connection });
//     },
//   )
//   .get("/get-connections", async (c) => {
//     const user = c.get("user")!;
//     const connections = await db
//       .selectFrom("connection")
//       .where("user_id", "=", user.id)
//       .orderBy("created_at", "asc")
//       .selectAll()
//       .execute();

//     return c.json({ connections });
//   })
//   .post(
//     "/remove-connection",
//     zValidator("json", z.object({ connectionId: z.number() })),
//     async (c) => {
//       const { connectionId } = c.req.valid("json");

//       await db
//         .deleteFrom("connection")
//         .where("id", "=", connectionId as any)
//         .execute();

//       return c.json({});
//     },
//   );

// export type ConnectionRoutes = typeof connectionRoutes;
