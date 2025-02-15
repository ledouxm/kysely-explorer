import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envVarSchema = z.object({
  AUTH_DB_PATH: z.string(),
  FIRST_CONNECTION_TOKEN: z.string(),
});

export const ENV = envVarSchema.parse(process.env);
