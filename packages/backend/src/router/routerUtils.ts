import { auth } from "../auth";
import { APIError, createEndpoint, createMiddleware } from "better-call";
import { ENV } from "../envVar";
import fs from "fs/promises";
import path from "path";

const loggedInMiddleware = createMiddleware(async (ctx) => {
  if (!ctx.headers) throw new APIError("FORBIDDEN");

  const session = await auth.api.getSession({ headers: ctx.headers });
  if (!session) throw new APIError("FORBIDDEN");

  return { user: session.user, session };
});

export const createLoggedInEndpoint = createEndpoint.create({
  use: [
    loggedInMiddleware,
    createMiddleware(async (ctx) => {
      const id = ctx.context.user.id as number;
      const userDirectory = `${filesDirectory}/${id}`;

      await fs.mkdir(userDirectory, { recursive: true }).catch(() => {});
    }),
  ],
});

export const createPublicEnpoint = createEndpoint.create({
  use: [],
});

export const filesDirectory = path.resolve(ENV.USER_FILES_DIRECTORY);
export const safelyResolveUserDirPath = (
  userId: string,
  userProvidedPath: string,
) => {
  const userDir = path.join(filesDirectory, userId.toString());

  try {
    const normalizedPath = path
      .normalize(userProvidedPath)
      .replace(/^(\.\.(\/|\\|$))+/, "");

    const absolutePath = path.join(userDir, normalizedPath);

    if (!absolutePath.startsWith(userDir)) {
      throw {};
    }

    return absolutePath;
  } catch (error) {
    throw new APIError("NOT_FOUND");
  }
};
