import { InfoIcon, MessageCircleQuestionIcon } from "lucide-react";
import { Button, IconButton } from "../../components/Button";
import {
  DialogBackdrop,
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTrigger,
} from "../../components/ui/dialog";
import { css } from "#styled-system/css";
import { Tooltip } from "../../components/Tooltip";
import { Actor, assertEvent, assign, setup } from "xstate";
import { Center, Divider, Stack, styled } from "#styled-system/jsx";
import { useState } from "react";
import { Input } from "../../components/Input";
import { Textarea } from "@chakra-ui/react";
import {
  RadioCardItem,
  RadioCardLabel,
  RadioCardRoot,
} from "../../components/ui/radio-card";
import { useSelector } from "@xstate/react";
import { FileActor, filesActor } from "../filesMachine";
import { useForm, UseFormReturn, useWatch } from "react-hook-form";
import { FileType } from "../fileStore";
import { OpenAI } from "openai";

export const LLMDialog = () => {
  return (
    <DialogRoot>
      <DialogBackdrop />
      <DialogTrigger asChild>
        <IconButton
          borderRadius="50%"
          bgColor="transparent"
          _hover={{
            bgColor: "transparent",
            transform: "scale(1.3)",
          }}
          p="0"
          w="unset"
          h="unset"
          minH="unset"
          minW="unset"
        >
          <MessageCircleQuestionIcon
            className={css({
              width: "34px",
              height: "34px",
            })}
            fill="white"
          />
        </IconButton>
      </DialogTrigger>
      <DialogContent>
        <DialogCloseTrigger />
        <DialogHeader>
          <styled.h2 fontSize="24px" fontWeight={500} color="white">
            Ask ChatGPT
          </styled.h2>
        </DialogHeader>
        <DialogBody p="0">
          <LLMDialogContent />
        </DialogBody>
      </DialogContent>
    </DialogRoot>
  );
};

const LLMDialogContent = () => {
  const selectedFile = useSelector(
    filesActor,
    (state) => state.context.selected,
  );

  if (!selectedFile) {
    return (
      <Center>
        <styled.div
          color="yellow-2"
          fontWeight="semibold"
          mt="16px"
          fontSize="18px"
        >
          You must select a file first
        </styled.div>
      </Center>
    );
  }

  return <ContentWithSelectedFile fileActor={selectedFile} />;
};

type LLMForm = {
  apiKey: string;
  fileType: FileType;
  content: string;
};
const ContentWithSelectedFile = ({ fileActor }: { fileActor: FileActor }) => {
  const fileType = useSelector(fileActor, (state) => state.context.fileType);
  const apiKeyForm = useForm<{ apiKey: string }>();

  const form = useForm<LLMForm>({
    defaultValues: {
      apiKey: "",
      fileType: fileType,
      content: "",
    },
  });

  const isReady = useSelector(llmActor, (state) => state.value === "ready");

  return (
    <Stack>
      <styled.form
        p="16px"
        onSubmit={apiKeyForm.handleSubmit((values) =>
          llmActor.send({ type: "SET_API_KEY", apiKey: values.apiKey }),
        )}
      >
        <Stack>
          <styled.label fontWeight={500} htmlFor="openai-api-key">
            OpenAI API Key
          </styled.label>
          <Input
            id="openai-api-key"
            type="password"
            {...apiKeyForm.register("apiKey")}
          />
          <styled.div>
            <Button type="submit">
              {isReady ? "Change API key" : "Set API key"}
            </Button>
          </styled.div>
        </Stack>
      </styled.form>
      <Divider />

      <form onSubmit={form.handleSubmit((values) => console.log(values))}>
        <Stack pos="relative">
          {isReady ? null : (
            <styled.div
              zIndex="10"
              pos="absolute"
              inset="0"
              top="-8px"
              bgColor="black"
              pointerEvents="none"
              opacity="0.8"
            ></styled.div>
          )}
          <Stack px="16px" pb="8px">
            <OutputRadio form={form} />

            <Stack gap="4px">
              <styled.label fontWeight={500} htmlFor="request-content">
                Request
              </styled.label>
              <styled.div
                color="yellow-2"
                display="flex"
                fontSize="12px"
                alignItems="center"
                gap="8px"
              >
                <InfoIcon size="14px" />
                ChatGPT already knows the structure of the current database
              </styled.div>
              <Textarea
                {...form.register("content")}
                id="request-content"
                rows={8}
                placeholder="Write a query for renaming the column 'published_date' to 'published_at' on the 'report' table while filtering out all rows where 'published_date' is null."
              ></Textarea>
            </Stack>
          </Stack>
        </Stack>
      </form>
    </Stack>
  );
};

const OutputRadio = ({ form }: { form: UseFormReturn<LLMForm> }) => {
  const value = useWatch({
    control: form.control,
    name: "fileType",
  });
  return (
    <RadioCardRoot
      value={value}
      onValueChange={({ value }) =>
        form.setValue("fileType", value as FileType)
      }
    >
      <RadioCardLabel>Output type</RadioCardLabel>
      <RadioCardItem label="Kysely" value="ts" key="ts" />
      <RadioCardItem label="SQL" value="sql" key="sql" />
    </RadioCardRoot>
  );
};

const llmMachine = setup({
  types: {
    context: {} as {
      apiKey: string | null;
      openAi: OpenAI | null;
    },
    events: {} as { type: "SET_API_KEY"; apiKey: string },
  },
  actions: {
    setApiKey: assign(({ context, event }) => {
      assertEvent(event, "SET_API_KEY");
      return {
        ...context,
        apiKey: event.apiKey,
        openAi: new OpenAI({ apiKey: event.apiKey }),
      };
    }),
  },
}).createMachine({
  context: {
    apiKey: null,
    openAi: null,
  },
  initial: "waitingForApiKey",
  states: {
    waitingForApiKey: {
      on: {
        SET_API_KEY: {
          actions: "setApiKey",
          target: "ready",
        },
      },
    },
    ready: {
      on: {
        SET_API_KEY: {
          actions: "setApiKey",
        },
      },
    },
  },
});

const llmActor = new Actor(llmMachine);
llmActor.start();
