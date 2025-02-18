import { Socket } from "socket.io-client";
import {
  ActorRefFromLogic,
  assertEvent,
  assign,
  createActor,
  fromPromise,
  setup,
} from "xstate";
import { api, connectToWSS } from "../../api";

export type WsActor = ActorRefFromLogic<WsMachine>;
export interface TableMetadata {
  readonly name: string;
  readonly isView: boolean;
  readonly columns: ColumnMetadata[];
  readonly schema?: string;
}
export interface ColumnMetadata {
  readonly name: string;
  /**
   * The data type of the column as reported by the database.
   *
   * NOTE: This value is whatever the database engine returns and it will be
   *       different on different dialects even if you run the same migrations.
   *       For example `integer` datatype in a migration will produce `int4`
   *       on PostgreSQL, `INTEGER` on SQLite and `int` on MySQL.
   */
  readonly dataType: string;
  /**
   * The schema this column's data type was created in.
   */
  readonly dataTypeSchema?: string;
  readonly isAutoIncrementing: boolean;
  readonly isNullable: boolean;
  readonly hasDefaultValue: boolean;
  readonly comment?: string;
}

const formatColumnDefinition = (column: ColumnMetadata): string => {
  const parts = [
    column.dataType,
    column.isNullable ? "NULL" : "NOT NULL",
    column.hasDefaultValue ? "DEFAULT" : "",
    column.isAutoIncrementing ? "AUTO_INCREMENT" : "",
    column.comment ? `COMMENT '${column.comment}'` : "",
  ].filter(Boolean);

  return parts.join(" ");
};

const tableToTsv = (table: TableMetadata): string => {
  const header = `Table: ${table.schema ? `${table.schema}.` : ""}${table.name} (${table.isView ? "VIEW" : "TABLE"})`;
  const columnRows = table.columns.map(
    (col) => `${col.name}\t${formatColumnDefinition(col)}`,
  );

  return `${header}\n${columnRows.join("\n")}`;
};

export const databasesToTsv = (tables: TableMetadata[]): string => {
  const tableDefinitions = tables.map(tableToTsv);
  // Add two newlines between tables for better readability
  return tableDefinitions.join("\n\n");
};

export const connectionsMachine = setup({
  types: {
    context: {} as {
      connectionStrings: string[];
      connections: WsActor[];
      selected: WsActor | null;
      toAdd: string | null;
      toRemove: number | null;
    },
    events: {} as
      | { type: "SELECT_CONNECTION"; connection: WsActor }
      | { type: "ADD_CONNECTION_STRING"; connectionString: string }
      | { type: "REMOVE_CONNECTION"; id: string },
  },
  actors: {
    getConnections: fromPromise(async () => {
      return api("/get-connections", {});
    }),
    addConnection: fromPromise(
      async ({ input }: { input: { connectionString: string } }) => {
        return api("@post/create-connection", { body: input });
      },
    ),
    removeConnection: fromPromise(
      async ({ input }: { input: { id: number } }) => {
        await api("@post/remove-connection", {
          body: { connectionId: input.id },
        });
        return input.id;
      },
    ),
  },
  actions: {
    selectConnection: assign({
      selected: ({ event }) => {
        assertEvent(event, "SELECT_CONNECTION");
        if (event.connection.getSnapshot().value === "disconnected") {
          event.connection.send({ type: "CONNECT" });
        }
        return event.connection;
      },
    }),
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QAoC2BDAxgCwJYDswBKAOlwgBswBiAQQBF6B9AYQHkA5DgURYBUAkpyYBlPgCUBHAOIBtAAwBdRKAAOAe1i4ALrnX4VIAB6IALACYANCACeicwHYAzCVPyAbOYCsAXx-W0LDxCUnIqanFuAFk2ADVuVk4efiEOBWUkEA0tXX1DEwQATnkSAA4vAEYvTy9rOwQKhwdXLycK7z8AjBwCYjJKGhFuABlePkSuMdT0w2ydPQNMgsLTEnN3au86xFKKkl9OkHx1CDhDQJ6Q2c15vKXEAFp3bYQnw4vgvrCwa5yF-MQFVM7hITnM8jaW1siCcDlWTi8hVhBz8QA */
  initial: "loading",
  context: {
    connectionStrings: [],
    connections: [],
    toAdd: null,
    toRemove: null,
    selected: null,
  },
  states: {
    loading: {
      invoke: {
        id: "getConnections",
        src: "getConnections",
        onDone: {
          target: "idle",
          actions: assign({
            connectionStrings: ({ event }) =>
              event.output.connections.map((conn) => conn.connection_string),
            connections: ({ event, spawn }) =>
              event.output.connections.map((conn) =>
                spawn(wsMachine, {
                  input: {
                    connectionString: conn.connection_string,
                    id: conn.id as any,
                  },
                }),
              ),
          }),
        },
        onError: {
          target: "idle",
        },
      },
    },
    adding: {
      invoke: {
        id: "addConnection",
        src: "addConnection",
        input: ({ context }) => ({ connectionString: context.toAdd! }),
        onDone: {
          target: "idle",
          actions: [
            assign(({ context, event, spawn }) => {
              const { connection_string, id } = event.output.connection!;
              const connection = spawn(wsMachine, {
                input: { connectionString: connection_string, id: id as any },
              });
              connection.send({ type: "CONNECT" });
              context.connections = [...context.connections, connection];

              if (!context.selected) {
                context.selected = connection;
              }

              return context;
            }),
            assign({ toAdd: null }),
          ],
        },
        onError: {
          target: "idle",
          actions: assign({ toAdd: null }),
        },
      },
    },
    removing: {
      invoke: {
        id: "removeConnection",
        src: "removeConnection",
        input: ({ context }) => ({ id: context.toRemove! }),
        onDone: {
          target: "idle",
          actions: assign(({ context, event }) => {
            const id = event.output as any;
            const connection = context.connections.find(
              (connection) => connection.getSnapshot().context.id === id,
            );

            connection?.send({ type: "DISCONNECT" });

            context.connections = context.connections.filter(
              (conn) => conn !== connection,
            );

            if (context.selected?.getSnapshot().context.id === id) {
              context.selected = null;
            }

            context.toRemove = null;

            return context;
          }),
        },
        onError: {
          target: "idle",
          actions: assign({ toRemove: null }),
        },
      },
    },
    idle: {
      on: {
        ADD_CONNECTION_STRING: {
          target: "adding",
          actions: assign({
            toAdd: ({ event }) => event.connectionString,
          }),
          guard: ({ context, event }) => {
            return !context.connections.some(
              (connection) =>
                connection.getSnapshot().context.connectionString ===
                event.connectionString,
            );
          },
        },
        REMOVE_CONNECTION: {
          target: "removing",
          actions: assign({
            toRemove: ({ event }) => event.id as any,
          }),
        },
        SELECT_CONNECTION: {
          actions: "selectConnection",
        },
      },
    },
  },
});

export const connectionsActor = createActor(connectionsMachine);
connectionsActor.start();

const wsMachine = setup({
  types: {
    context: {} as {
      connectionString: string;
      socket: Socket | null;
      typeString: string | null;
      dialect: string | null;
      tables: TableMetadata[];
      error: any;
      id: number;
    },
    input: {} as { connectionString: string; id: number },
    events: {} as
      | { type: "CONNECT" }
      | { type: "STOP" }
      | { type: "DISCONNECT" }
      | { type: "REFETCH_TYPES" }
      | { type: "DB_ERROR"; data: any }
      | { type: "DB_CONNECTED" }
      | {
          type: "DB_INFO";
          data: {
            typeString: string;
            dialect: string;
            tables: TableMetadata[];
          };
        },
  },
  actions: {
    disconnect: ({ context }) => {
      context.socket?.removeAllListeners();
      context.socket?.disconnect();

      return context;
    },
    connect: assign(({ context, self }) => {
      const socket = connectToWSS(context.connectionString);

      socket.on("connect", () => {
        self.send({ type: "DB_CONNECTED" });
      });

      socket.on("connect_error", (error) => {
        self.send({ type: "DB_ERROR", data: error });
      });

      socket.on("error", (error) => {
        self.send({ type: "DB_ERROR", data: error });
      });

      socket.on(
        "db-types",
        (data: {
          typeString: string;
          dialect: string;
          tables: TableMetadata[];
        }) => {
          self.send({ type: "DB_INFO", data });
        },
      );

      socket.on("disconnect", () => {
        self.send({ type: "DISCONNECT" });
      });

      socket.connect();
      context.socket = socket;

      return context;
    }),
    refetchTypes: ({ context }) => {
      context.socket?.send("get-types");
    },
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QAoC2BDAxgCwJYDswBKAYgGEB5AOSoFEyAVAbQAYBdRUABwHtZcALrh75OIAB6IALACYANCACeiGQFYWAOgBsAdgCcWgBw7VAX1MK0WPIVIARAJIBlSjXrN2Y3vyEixkhFkFZUDZDVVDVT0AZhNzSwwcAmISOwAhAH1aACVsimzWDiQQb0FhUWKAoKVEaKktbWiZQwBGNXiQKyTbDUwRQkwhfChUzNc6Rlo7Qq8+Mr9K2r0WjRNglT1VDSkWLXaLTsSbYg0Ad3Qy4YAxHgAnBkUuOFGMhyorihni0t8K0CqwiwWqo9qp1ghWuEOl1jkRev0wINICRsrQrrQGGQABIZBgATQACrQnF9uHNfv5apC1OCWjodNtVNE2mYDjDknCILhYH18AMBMj0hlxu4pqSSuTypSENFlqswTUZZFtCwYnEOvgeBA4GJ2bZZj4pYsEABaLTgs3Qo4c+F8xFDKAG+Z-CQqFhSDR6XY0xVqTQ7UFW6w286XKA3e6PHXfSULf6IVQ6Qzbb0KkIyFjJlgyAzGVkJYM9Xn8yBOinGmRSD1aEE+kItFqaaKqwybQzRDudqRB7onLk8hFIiBlo3xhAyRueiKdmdd8GxBmNtWs8xAA */
  initial: "disconnected",
  context: ({ input }) => ({
    connectionString: input.connectionString,
    id: input.id,
    socket: null,
    typeString: null,
    dialect: null,
    error: null,
    tables: [],
  }),
  states: {
    connecting: {
      entry: "connect",
      on: {
        DB_CONNECTED: "waitingForTypes",
      },
    },
    waitingForTypes: {
      on: {
        DB_INFO: {
          actions: assign({
            typeString: ({ event }) => event.data.typeString,
            dialect: ({ event }) => event.data.dialect,
            tables: ({ event }) => event.data.tables,
          }),
          target: "connected",
        },
      },
    },
    connected: {
      on: {
        REFETCH_TYPES: {
          target: "waitingForTypes",
          actions: "refetchTypes",
        },
      },
    },
    disconnected: {
      on: {
        DB_CONNECTED: "waitingForTypes",
      },
    },
    stopped: {
      type: "final",
    },
  },
  on: {
    CONNECT: { actions: "disconnect", target: ".connecting" },
    DISCONNECT: { actions: "disconnect", target: ".disconnected" },
    DB_ERROR: {
      actions: assign({
        error: ({ event }) => event.data,
      }),
      target: ".disconnected",
    },
    STOP: {
      actions: "disconnect",
      target: ".stopped",
    },
  },
});

export type WsMachine = typeof wsMachine;
