import { z } from "zod";
import { createLoggedInEndpoint } from "./routerUtils";
import { CoreMessage, coreMessageSchema, generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

const askChatGPT = createLoggedInEndpoint(
  "/ask-chat-gpt",
  {
    method: "POST",
    body: z.object({
      openaiApiKey: z.string(),
      message: z.string(),
      databaseStructure: z.string(),
      context: z
        .object({
          previousMessages: z.array(coreMessageSchema),
          id: z.string(),
        })
        .optional(),
    }),
  },
  async (c) => {
    const { message, databaseStructure, openaiApiKey, context } = c.body;

    const openai = createOpenAI({
      apiKey: openaiApiKey,
      compatibility: "strict",
    });

    const messages: CoreMessage[] = [
      ...(context?.previousMessages ?? []),
      {
        role: "user",
        content: message,
      },
    ];

    const result = await generateObject({
      model: openai("gpt-3.5-turbo"),
      messages: messages,
      system: `You are an SQL expert. You have a database with the following structure:\n\n${databaseStructure}`,
      schema: z.object({
        query: z.string(),
      }),
    });

    const id = context?.id ?? crypto.randomUUID();

    if (context?.id) {
      // update llm_chat table
    } else {
      // create llm_chat table
    }

    return {
      result,
      id,
      messages: [
        ...messages,
        {
          role: "assistant",
          content: result.object.query,
        } satisfies CoreMessage,
      ],
    };
  },
);

export const llmRoutes = {
  askChatGPT,
};

/***
 * 
      messages: [{
        content: `You are an SQL expert. You have a database with the following structure:\n\n${databaseStructure}`,
        role: "system",
      }, {
        content: message,
        role: "user",
      }]
 */
