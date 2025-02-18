import {
  CircleCheck,
  ClipboardIcon,
  InfoIcon,
  MessageCircleQuestionIcon,
} from "lucide-react";
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
import { useRef, useState } from "react";
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
import { useMutation } from "@tanstack/react-query";
import { api } from "../../api";
import { CoreMessage } from "ai";
import {
  connectionsActor,
  databasesToTsv,
  WsActor,
} from "../ws/connectionsMachine";
import { format } from "sql-formatter";

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
        <DialogBody>
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
  const selectedConnection = useSelector(
    connectionsActor,
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

  if (!selectedConnection) {
    return (
      <Center>
        <styled.div
          color="yellow-2"
          fontWeight="semibold"
          mt="16px"
          fontSize="18px"
        >
          You must select a connection first
        </styled.div>
      </Center>
    );
  }

  return (
    <ContentWithSelectedFile
      fileActor={selectedFile}
      connectionActor={selectedConnection}
    />
  );
};

const mockId = "mock-id1";
const mockMessages = [
  {
    role: "user",
    content: "write a query returning every achievements",
  },
  {
    role: "assistant",
    content: "SELECT * FROM Achievements",
  },
  {
    role: "user",
    content:
      "can you add the achievement categories for each one? And also only keep the 10 first achievements",
  },
  {
    role: "assistant",
    content:
      "SELECT Achievements.*, AchievementCategories.nameId AS categoryName FROM Achievements LEFT JOIN AchievementCategories ON Achievements.categoryId = AchievementCategories.id LIMIT 10",
  },
] satisfies CoreMessage[];

type LLMForm = {
  apiKey: string;
  fileType: FileType;
  content: string;
};
const ContentWithSelectedFile = ({
  fileActor,
  connectionActor,
}: {
  fileActor: FileActor;
  connectionActor: WsActor;
}) => {
  const fileType = useSelector(fileActor, (state) => state.context.fileType);
  const idRef = useRef(null as string | null);
  const [messages, setMessages] = useState<CoreMessage[]>([]);

  const form = useForm<LLMForm>({
    defaultValues: {
      apiKey: "",
      fileType: fileType,
      content: "",
    },
  });

  const askLlmMutation = useMutation({
    mutationFn: async (values: LLMForm) => {
      form.setValue("content", "");
      const tables = connectionActor.getSnapshot().context.tables;

      const databaseStructure = tables ? databasesToTsv(tables) : "";

      const result = await api("@post/ask-chat-gpt", {
        body: {
          openaiApiKey: values.apiKey,
          message: values.content,
          context: messages?.length
            ? { previousMessages: messages, id: idRef.current! }
            : undefined,
          databaseStructure: databaseStructure,
        },
      });

      idRef.current = result.id;
      setMessages(result.messages);

      return result;
    },
  });

  return (
    <Stack>
      <form
        onSubmit={form.handleSubmit((values) => askLlmMutation.mutate(values))}
      >
        <Stack>
          <styled.label fontWeight={500} htmlFor="openai-api-key">
            OpenAI API Key
          </styled.label>
          <Input
            id="openai-api-key"
            type="password"
            {...form.register("apiKey", { required: true })}
          />
          {/* <OutputRadio form={form} /> */}
          {messages ? (
            <Stack>
              {messages.map((message, index) => {
                const isUser = message.role === "user";
                return (
                  <styled.div
                    key={index}
                    ml={isUser ? "0" : "32px"}
                    mr={isUser ? "32px" : "0"}
                    alignSelf={isUser ? "flex-start" : "flex-end"}
                    alignItems="center"
                    gap="8px"
                    display="flex"
                  >
                    {isUser ? null : (
                      <styled.button
                        type="button"
                        cursor="pointer"
                        _hover={{ transform: "scale(1.1)" }}
                        onClick={() => {
                          navigator.clipboard.writeText(
                            format(message.content.toString()),
                          );
                        }}
                      >
                        <ClipboardIcon />
                      </styled.button>
                    )}
                    <styled.div
                      p="8px"
                      borderRadius="4px"
                      bgColor={
                        isUser ? "background-secondary" : "background-tertiary"
                      }
                    >
                      {message.content.toString()}
                    </styled.div>
                  </styled.div>
                );
              })}
            </Stack>
          ) : null}
          {askLlmMutation.isPending ? (
            <styled.div
              ml={"32px"}
              mr={"0"}
              alignSelf={"flex-end"}
              alignItems="center"
              gap="8px"
              display="flex"
              p="8px"
              borderRadius="4px"
              bgColor={"background-tertiary"}
            >
              Loading...
            </styled.div>
          ) : null}
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
              {...form.register("content", { required: true })}
              id="request-content"
              rows={8}
              placeholder="Write a query for renaming the column 'published_date' to 'published_at' on the 'report' table while filtering out all rows where 'published_date' is null."
            ></Textarea>
          </Stack>
          <styled.div>
            <Button type="submit">Ask ChatGPT</Button>
          </styled.div>
        </Stack>
      </form>
    </Stack>
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
