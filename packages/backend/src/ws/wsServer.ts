import type { Kysely } from "kysely";

import type { DialectName } from "kysely-codegen";
import { Server, Socket } from "socket.io";
import { ref } from "../hmr.ts";
import { executeTs } from "./ts-executor.ts";
import { connectAndGetDialect, getTypeString } from "./ws.ts";
import type { ServerType } from "@hono/node-server";

export const startWsServer = ({ httpInstance }: { httpInstance: ServerType }) => {
  const io = new Server(httpInstance, {
    cors: {
      origin: "*",
    },
    pingInterval: 5000,
    pingTimeout: 5000,
  });

  ref.io = io;
  ref.httpInstance = httpInstance;

  const handleConnection = async (socket: Socket) => {
    const { auth } = socket.handshake;

    console.log("client connected", socket.id, auth);

    socket.on("disconnect", async () => {
      console.log("client disconnected", socket.id);
      await socket.db?.destroy();
    });

    socket.on("message", async (event: any, ...args: any[]) => {
      if (event === "execute-ts") {
        const [code] = args;
        try {
          const result = await executeTs({ code, db: socket.db });
          socket.emit("ts-result", result);
        } catch (e: any) {
          console.error(e);
          socket.emit("ts-error", [e.name, e.message].filter(Boolean).join(": "));
        }
      }

      if (event === "execute-sql") {
        const [code] = args;
        try {
          // @ts-ignore
          const result = await socket.db?.executeQuery({
            sql: code,
            parameters: [] as any[],
          });

          socket.emit("sql-result", result.rows);
        } catch (e: any) {
          console.error(e);
          socket.emit("sql-error", [e.name, e.message].filter(Boolean).join(": "));
        }
      }
    });

    const getAndSendTypes = async () => {
      try {
        if (!socket.db) {
          const { db, dialect } = await connectAndGetDialect(auth.connectionString);
          socket.db = db;
          socket.dialect = dialect;
        }

        socket.typeString = await getTypeString(socket.db, socket.dialect);

        const tables = await socket.db.introspection.getTables();

        socket.emit("db-types", {
          typeString: socket.typeString,
          tables,
          dialect: socket.dialect,
        });
      } catch (e: any) {
        if (e.name || e.message) {
          socket.emit("error", [e.name, e.message].join(": "));
        }
        socket.disconnect();
      }
    };

    socket.on("get-types", getAndSendTypes);

    getAndSendTypes();
  };

  io.on("connection", handleConnection);
};

declare module "socket.io" {
  interface Socket {
    db: Kysely<any>;
    typeString: string;
    dialect: DialectName;
  }
}
