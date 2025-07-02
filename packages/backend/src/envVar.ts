import { z } from "zod/v4";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: "../../.env" });

const envVarSchema = z.object({
  AUTH_DB_PATH: z.string(),
  FIRST_CONNECTION_TOKEN: z.string(),
  USER_FILES_DIRECTORY: z.string(),
  FRONTEND_FOLDER: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      if (val.startsWith("./")) return val;

      const relativePath = path.relative(process.cwd(), val);
      return relativePath.startsWith(".") ? relativePath : `./${relativePath}`;
    }),
  AUTH_SECRET: z.string(),
  NODE_ENV: z.enum(["development", "production"]).default("development"),
});

const result = envVarSchema.safeParse(process.env);

if (result.error) {
  console.error(z.prettifyError(result.error));
  process.exit(1);
}
export const ENV = envVarSchema.parse(process.env);
export const isDev = ENV.NODE_ENV === "development";
