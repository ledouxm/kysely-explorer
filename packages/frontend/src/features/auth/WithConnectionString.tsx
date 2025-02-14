import { Center, Flex, Stack, styled } from "#styled-system/jsx";
import { useQuery } from "@tanstack/react-query";
import { PropsWithChildren, useState } from "react";
import { useSelector } from "@xstate/react";
import { connectionsActor, WsMachine } from "../connectionsMachine";
import { useForm } from "react-hook-form";
import { ActorRefFromLogic } from "xstate";
import { Tooltip } from "../../components/Tooltip";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";

export const DbConnections = ({ children }: PropsWithChildren<{}>) => {
  const connections = useSelector(
    connectionsActor,
    (state) => state.context.connections,
  );

  return (
    <Stack flex="1" p="16px">
      <ConnectionForm />
      <Stack>
        {connections.map((connection) => (
          <Connection wsActor={connection} key={connection.id} />
        ))}
      </Stack>
      {children}
    </Stack>
  );
};

const Connection = ({ wsActor }: { wsActor: ActorRefFromLogic<WsMachine> }) => {
  const value = useSelector(wsActor, (state) => state.value);
  const name = useSelector(wsActor, (state) => state.context.connectionString);

  const selected = useSelector(
    connectionsActor,
    (state) => state.context.selected,
  );

  const isSelected = selected?.id === wsActor.id;

  const error = useSelector(wsActor, (state) => state.context.error);

  const color =
    value === "connected"
      ? "green-1"
      : ["connecting", "waitingForTypes"].includes(value)
        ? "yellow-1"
        : "red-1";

  return (
    <Flex alignItems="center">
      <Tooltip content={<styled.div>{error || value}</styled.div>}>
        <styled.div
          bgColor={color}
          borderRadius="50%"
          w="10px"
          h="10px"
          minW="10px"
          minH="10px"
          mr="8px"
        ></styled.div>
      </Tooltip>
      <styled.div
        cursor="pointer"
        fontWeight={isSelected ? "bold" : "normal"}
        onClick={() =>
          connectionsActor.send({
            type: "SELECT_CONNECTION",
            connection: wsActor,
          })
        }
      >
        {hidePasswords(name)}
      </styled.div>
    </Flex>
  );
};

const ConnectionForm = () => {
  const form = useForm<{ connectionString: string }>();

  const onSubmit = (values: { connectionString: string }) => {
    connectionsActor.send({
      type: "ADD_CONNECTION_STRING",
      connectionString: values.connectionString,
    });

    form.reset();
  };

  return (
    <styled.form
      w="100%"
      display="flex"
      flexDirection="column"
      onSubmit={form.handleSubmit(onSubmit)}
    >
      <Input
        {...form.register("connectionString")}
        placeholder="postgres://..."
        id="connection-string"
        type="text"
      />
      <Button type="submit" mt="8px">
        Add connection
      </Button>
    </styled.form>
  );
};

const hidePasswords = (str: string) => {
  // URL-style connections (PostgreSQL, MySQL, LibSQL)
  if (str.includes("://")) {
    return (
      str
        .replace(/\/\/([^:]+):([^@]+)@/, "//$1:****@")
        //  LibSQL auth token
        .replace(/authToken=([^&]+)/, "authToken=****")
    );
  }

  // MSSQL connection string
  if (str.includes("Server=")) {
    return str.replace(/Password=([^;]+)/, "Password=****");
  }

  return str;
};
