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
      error: any;
    },
    input: {} as string,
    events: {} as
      | { type: "CONNECT" }
      | { type: "DISCONNECT" }
      | { type: "REFETCH_TYPES" }
      | { type: "DB_ERROR"; data: any }
      | { type: "DB_CONNECTED" }
      | { type: "DB_INFO"; data: { typeString: string; dialect: string } },
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

      socket.on("db-types", (data: { typeString: string; dialect: string }) => {
        self.send({ type: "DB_INFO", data });
      });

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
  initial: "connecting",
  context: ({ input }) => ({
    connectionString: input,
    socket: null,
    typeString: null,
    dialect: null,
    error: null,
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
