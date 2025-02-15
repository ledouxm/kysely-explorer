import { betterAuth } from "better-auth";
import { db } from "./db";
import { ENV } from "./envVar";

export const auth = betterAuth({
  database: {
    db: db,
    type: "sqlite",
  },
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    {
      id: "root-user",
      onRequest: async (request) => {
        if (request.url.includes("/api/auth/sign-up")) {
          const token = request.headers.get("X-Root-Token");
          if (!token || token !== ENV.FIRST_CONNECTION_TOKEN) {
            return {
              response: new Response("Not allowed", {
                status: 403,
                statusText: "NOT_ALLOWED",
              }),
            };
          }
        }

        return { request: request };
      },
    },
  ],
});

export type GlobalHonoConfig = {
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  };
};
