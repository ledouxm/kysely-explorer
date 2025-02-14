import { Socket } from "socket.io-client";
import {
  ActorRefFromLogic,
  assertEvent,
  assign,
  createActor,
  setup,
} from "xstate";
import { connectToWSS } from "../api";

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

export const connectionsMachine = setup({
  types: {
    context: {} as { connections: WsActor[]; selected: WsActor | null },
    events: {} as
      | { type: "SELECT_CONNECTION"; connection: WsActor }
      | { type: "ADD_CONNECTION_STRING"; connectionString: string }
      | { type: "REMOVE_CONNECTION"; id: string },
  },
  actions: {
    addConnectionString: assign(({ context, spawn, event }) => {
      assertEvent(event, "ADD_CONNECTION_STRING");
      const connection = spawn(wsMachine, { input: event.connectionString });
      context.connections = [...context.connections, connection];

      if (!context.selected) {
        context.selected = connection;
      }

      return context;
    }),
    removeConnection: assign(({ context, event }) => {
      assertEvent(event, "REMOVE_CONNECTION");

      const connection = context.connections.find(
        (connection) => connection.id === event.id,
      );

      connection?.send({ type: "DISCONNECT" });

      context.connections = context.connections.filter(
        (connection) => connection.id !== event.id,
      );

      if (context.selected?.id === event.id) {
        context.selected = null;
      }

      return context;
    }),
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
  initial: "idle",
  context: {
    connections: [],
    selected: null,
  },
  states: {
    idle: {
      on: {
        ADD_CONNECTION_STRING: {
          actions: "addConnectionString",
          guard: ({ context, event }) => {
            return !context.connections.some(
              (connection) =>
                connection.getSnapshot().context.connectionString ===
                event.connectionString,
            );
          },
        },
        REMOVE_CONNECTION: {
          actions: "removeConnection",
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
    },
    input: {} as string,
    events: {} as
      | { type: "CONNECT" }
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
        console.log("connected");
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
  initial: "connecting",
  context: ({ input }) => ({
    connectionString: input,
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
  },
});

export type WsMachine = typeof wsMachine;
