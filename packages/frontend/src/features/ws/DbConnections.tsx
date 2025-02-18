import { Center, Flex, Stack, styled } from "#styled-system/jsx";
import { useQuery } from "@tanstack/react-query";
import { PropsWithChildren, useState } from "react";
import { useSelector } from "@xstate/react";
import {
  connectionsActor,
  databasesToTsv,
  WsMachine,
} from "./connectionsMachine";
import { useForm } from "react-hook-form";
import { ActorRefFromLogic } from "xstate";
import { Tooltip } from "../../components/Tooltip";
import { Button, IconButton } from "../../components/Button";
import { Input } from "../../components/Input";
import { XIcon } from "lucide-react";

export const DbConnections = ({ children }: PropsWithChildren<{}>) => {
  const connections = useSelector(
    connectionsActor,
    (state) => state.context.connections,
  );

  const value = useSelector(connectionsActor, (state) => state.value);
  const toAdd = useSelector(connectionsActor, (state) => state.context.toAdd);
  const toRemove = useSelector(
    connectionsActor,
    (state) => state.context.toRemove,
  );
  return (
    <Stack flex="1" p="16px" w="100%">
      <ConnectionForm />
      <Stack w="100%">
        {connections.map((connection) => (
          <Connection
            wsActor={connection}
            gettingRemoved={value === "removing" ? toRemove : null}
            key={connection.id}
          />
        ))}
        {value === "adding" && <DummyConnection name={toAdd ?? ""} />}
      </Stack>
      {children}
    </Stack>
  );
};

const Connection = ({
  wsActor,
  gettingRemoved,
}: {
  wsActor: ActorRefFromLogic<WsMachine>;
  gettingRemoved: number | null;
}) => {
  const value = useSelector(wsActor, (state) => state.value);
  const name = useSelector(wsActor, (state) => state.context.connectionString);
  const id = useSelector(wsActor, (state) => state.context.id);

  const selected = useSelector(
    connectionsActor,
    (state) => state.context.selected,
  );

  const isSelected = selected?.id === wsActor.id;
  const isGettingRemoved = gettingRemoved === id;

  const error = useSelector(wsActor, (state) => state.context.error);

  const color =
    value === "connected"
      ? "green-1"
      : ["connecting", "waitingForTypes"].includes(value)
        ? "yellow-1"
        : "red-1";

  return (
    <Flex alignItems="center" opacity={isGettingRemoved ? 0.5 : 1} maxW="100%">
      <Tooltip content={<styled.div>{error || value}</styled.div>}>
        <styled.div
          flex="0 0 auto"
          bgColor={color}
          borderRadius="50%"
          w="10px"
          h="10px"
          minW="10px"
          minH="10px"
        ></styled.div>
      </Tooltip>
      <styled.div
        flex="1 1 auto"
        cursor="pointer"
        fontWeight={isSelected ? "bold" : "normal"}
        onClick={() =>
          connectionsActor.send({
            type: "SELECT_CONNECTION",
            connection: wsActor,
          })
        }
        mx="8px"
        textOverflow="ellipsis"
        overflow="hidden"
        whiteSpace="nowrap"
      >
        {hidePasswords(name)}
      </styled.div>
      <IconButton
        flex="0 0 auto"
        onClick={() => {
          connectionsActor.send({
            type: "REMOVE_CONNECTION",
            id: id as any,
          });
        }}
      >
        <XIcon />
      </IconButton>
    </Flex>
  );
};

const DummyConnection = ({ name }: { name: string }) => {
  return (
    <Flex alignItems="center">
      <Tooltip content={<styled.div>{"loading"}</styled.div>}>
        <styled.div
          bgColor={"red-1"}
          borderRadius="50%"
          w="10px"
          h="10px"
          minW="10px"
          minH="10px"
          mr="8px"
        ></styled.div>
      </Tooltip>
      <styled.div cursor="pointer" fontWeight={"normal"}>
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
