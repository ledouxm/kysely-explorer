import { useEffect } from "react";
import { Socket } from "socket.io-client";
import { WsActor } from "./ws/connectionsMachine";

export const useSocketEvent = (
  connection: WsActor | null,
  event: string,
  callback: (data: any) => any,
) => {
  useEffect(() => {
    const socket = connection?.getSnapshot().context.socket;

    socket?.on(event, callback);

    return () => {
      socket?.off(event, callback);
    };
  }, [connection, event, callback]);

  return null;
};
