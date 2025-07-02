import { z } from "zod";
import { createLoggedInEndpoint } from "./routerUtils.ts";
import { db } from "../db.ts";
import crypto from "node:crypto";
import { ENV } from "../envVar.ts";

export const getConnections = createLoggedInEndpoint(
  "/get-connections",
  { method: "GET" },
  async (c) => {
    const user = c.context.user;

    const connections = await db
      .selectFrom("connection")
      .where("user_id", "=", user.id)
      .orderBy("created_at", "asc")
      .selectAll()
      .execute();

    return {
      connections: connections.map((connection) => ({
        ...connection,
        connection_string: decrypt(connection.connection_string),
      })),
    };
  }
);

export const createConnection = createLoggedInEndpoint(
  "/create-connection",
  { method: "POST", body: z.object({ connectionString: z.string() }) },
  async (c) => {
    const user = c.context.user;
    const { connectionString } = c.body;

    const encryptedConnectionString = encrypt(connectionString);

    const connection = await db
      .insertInto("connection")
      .values({ user_id: user.id, connection_string: encryptedConnectionString })
      .returningAll()
      .executeTakeFirst();

    return {
      connection: { ...connection, connection_string: decrypt(connection!.connection_string) },
    };
  }
);

export const removeConnection = createLoggedInEndpoint(
  "/remove-connection",
  { method: "POST", body: z.object({ connectionId: z.number() }) },
  async (c) => {
    const { connectionId } = c.body;

    await db
      .deleteFrom("connection")
      .where("id", "=", connectionId as any)
      .execute();

    return {};
  }
);

export const connectionRoutes = {
  getConnections,
  createConnection,
  removeConnection,
};

const encryptionKey = simpleKeyDerivation(ENV.AUTH_SECRET);
function simpleKeyDerivation(password: string) {
  return crypto.createHash("sha256").update(password).digest();
}

function encrypt(text: string) {
  const algorithm = "aes-256-gcm";
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv(algorithm, encryptionKey, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  // Combine iv, authTag, and encrypted data
  return iv.toString("hex") + ":" + authTag.toString("hex") + ":" + encrypted;
}

function decrypt(encryptedData: string) {
  const algorithm = "aes-256-gcm";
  const parts = encryptedData.split(":");

  const iv = Buffer.from(parts[0], "hex");
  const authTag = Buffer.from(parts[1], "hex");
  const encrypted = parts[2];

  const decipher = crypto.createDecipheriv(algorithm, encryptionKey, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
