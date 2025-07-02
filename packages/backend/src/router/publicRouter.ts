import { db } from "../db.ts";
import { createPublicEnpoint } from "./routerUtils.ts";

const isFirstConnection = createPublicEnpoint(
  "/is-first-connection",
  { method: "GET" },
  async () => {
    const hasUsers = await db
      .selectFrom("user")
      .select(({ fn }) => [fn.count("id").as("count")])
      .executeTakeFirst();

    return hasUsers!.count === 0;
  }
);

export const publicRoutes = { isFirstConnection };
