import { Context, Next } from "hono";
import { GlobalHonoConfig } from "../auth";
import fs from "fs/promises";
import path from "path";
import { filesDirectory } from "./fileRouter";

export const assertUserMiddleware = async (
  c: Context<GlobalHonoConfig>,
  next: Next,
) => {
  const user = c.get("user");
  console.log("request", c.req.method, c.req.url);
  if (!user) {
    return new Response("Not allowed", {
      status: 403,
      statusText: "NOT_ALLOWED",
    });
  }
  return next();
};

export const userDirExistsMiddleware = async (
  c: Context<GlobalHonoConfig>,
  next: Next,
) => {
  const user = c.get("user")!;
  await fs.mkdir(path.join(filesDirectory, user.id), { recursive: true });
  return next();
};
