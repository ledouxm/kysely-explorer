import { Kysely, sql } from "kysely";
import { createServer } from "node:http";

import { Server, Socket } from "socket.io";
import { connectAndGetDialect, getTypeString } from "./api";
import { DialectName } from "kysely-codegen";
import { executeTs } from "./ts-executor";

const ref = {} as {
  io: Server;
  httpServer: ReturnType<typeof createServer>;
};

export const startWsServer = () => {
  const httpServer = createServer();
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
    pingInterval: 5000,
    pingTimeout: 5000,
  });

  ref.io = io;
  ref.httpServer = httpServer;

  const handleConnection = async (socket: Socket) => {
    const { auth } = socket.handshake;

    console.log("client connected", socket.id, auth);

    socket.on("disconnect", async () => {
      console.log("client disconnected", socket.id);
      await socket.db?.destroy();
    });

    socket.on("message", async (event: any, ...args: any[]) => {
      console.log("message", event);
      if (event === "execute-ts") {
        const [code] = args;
        try {
          const result = await executeTs({ code, db: socket.db });
          console.log("result", result);
          socket.emit("ts-result", result);
        } catch (e: any) {
          console.error(e);
          socket.emit(
            "ts-error",
            [e.name, e.message].filter(Boolean).join(": "),
          );
        }
      }

      if (event === "execute-sql") {
        const [code] = args;
        try {
          console.log(code);
          // @ts-ignore
          const result = await socket.db?.executeQuery({
            sql: code,
            parameters: [] as any[],
          });

          console.log("result", result);
          socket.emit("sql-result", result.rows);
        } catch (e: any) {
          console.error(e);
          socket.emit(
            "sql-error",
            [e.name, e.message].filter(Boolean).join(": "),
          );
        }
      }
    });

    const getAndSendTypes = async () => {
      try {
        if (!socket.db) {
          const { db, dialect } = await connectAndGetDialect(
            auth.connectionString,
          );
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

  httpServer.listen(3001, () => {
    console.log("listening on *:3001");
  });
};

registerViteHmrServerRestart();
export async function registerViteHmrServerRestart() {
  const hot = (import.meta as any).hot;
  if (hot) {
    await hot.data.stopping;
    // This is executed on file changed
    let reload = async () => {
      console.info("Performing an HMR reload...");
      ref.io.close();
      ref.httpServer.close();
    };
    hot.on("vite:beforeFullReload", async () => {
      const stopping = reload();
      reload = () => Promise.resolve();
      if (hot) hot.data.stopping = stopping;
    });
  }
}

declare module "socket.io" {
  interface Socket {
    db: Kysely<any>;
    typeString: string;
    dialect: DialectName;
  }
}
