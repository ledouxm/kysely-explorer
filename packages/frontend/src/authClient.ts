import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: "http://localhost:3005",
  fetchOptions: {
    credentials: "include",
  },
});
