import { createAuthClient } from "better-auth/react";
const isDev = import.meta.env.DEV;

export const authClient = createAuthClient({
  baseURL: isDev ? "http://localhost:3005" : "",
  fetchOptions: {
    credentials: "include",
  },
});
