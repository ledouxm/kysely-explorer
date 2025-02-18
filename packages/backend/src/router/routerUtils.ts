import { Context, Next } from "hono";
import { auth, GlobalHonoConfig } from "../auth";
import fs from "fs/promises";
import path from "path";
import { APIError, createEndpoint, createMiddleware } from "better-call";
import { ENV } from "../envVar";

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

const loggedInMiddleware = createMiddleware(async (ctx) => {
  if (!ctx.headers) throw new APIError("FORBIDDEN");
  const session = await auth.api.getSession({ headers: ctx.headers });

  if (!session) throw new APIError("FORBIDDEN");
  return { user: session.user, session };
});

export const createLoggedInEndpoint = createEndpoint.create({
  use: [loggedInMiddleware],
});

export const createPublicEnpoint = createEndpoint.create({
  use: [],
});
export const filesDirectory = ENV.USER_FILES_DIRECTORY;
