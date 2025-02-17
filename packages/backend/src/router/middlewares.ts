import { APIError, createEndpoint, createMiddleware } from "better-call";
import { createMiddlewareContext } from "./routerUtils";
import { auth } from "../auth";

const publicMiddleware = createMiddleware(async (ctx) => {
  console.log("public");
  return { user: null };
});

const privateMiddleware = createMiddleware(async (ctx) => {
  if (!ctx.headers) throw new APIError("FORBIDDEN");

  const session = await auth.api.getSession({ headers: ctx.headers });
  if (!session) throw new APIError("FORBIDDEN");

  return { user: session?.user, session };
});

// export const privateContext = createMiddlewareContext([privateMiddleware]);
// export const publicContext = createMiddlewareContext([publicMiddleware]);

export const createPrivateEndpoint = createEndpoint.create({
  use: [privateMiddleware],
});
export const createPublicEndpoint = createEndpoint.create({
  use: [publicMiddleware],
});
