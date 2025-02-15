import { Context, Next } from "hono";
import { GlobalHonoConfig } from "../auth";

export const loggedInMiddleware = async (
  c: Context<GlobalHonoConfig>,
  next: Next,
) => {
  const user = c.get("user");
  console.log(user);
  if (!user) {
    return new Response("Not allowed", {
      status: 403,
      statusText: "NOT_ALLOWED",
    });
  }
  return next();
};
