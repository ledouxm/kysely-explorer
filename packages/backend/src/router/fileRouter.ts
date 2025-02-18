import { createLoggedInEndpoint, filesDirectory } from "./routerUtils";
import fs from "fs/promises";
import { z } from "zod";

const getFiles = createLoggedInEndpoint(
  "/get-files",
  { method: "GET" },
  async (c) => {
    const user = c.context.user!;
    const files = await fs.readdir(`${filesDirectory}/${user.id}`);
    return { files };
  },
);

const getFile = createLoggedInEndpoint(
  "/get-file",
  { method: "GET", query: z.object({ fileName: z.string() }) },
  async (c) => {
    const user = c.context.user!;
    const { fileName } = c.query;
    const file = await fs.readFile(
      `${filesDirectory}/${user.id}/${fileName}`,
      "utf-8",
    );
    return file;
  },
);

const createFile = createLoggedInEndpoint(
  "/create-file",
  {
    method: "POST",
    body: z.object({ fileName: z.string(), content: z.string() }),
  },
  async (c) => {
    const user = c.context.user!;
    const { fileName, content } = c.body;
    await fs.writeFile(`${filesDirectory}/${user.id}/${fileName}`, content);
    return { fileName, content };
  },
);

const removeFile = createLoggedInEndpoint(
  "/remove-file",
  { method: "POST", body: z.object({ fileName: z.string() }) },
  async (c) => {
    const user = c.context.user!;
    const { fileName } = c.body;
    await fs.unlink(`${filesDirectory}/${user.id}/${fileName}`);
    return {};
  },
);

const updateFIle = createLoggedInEndpoint(
  "/update-file",
  {
    method: "POST",
    body: z.object({
      fileName: z.string(),
      targetFileName: z.string().optional(),
      content: z.string(),
    }),
  },
  async (c) => {
    const user = c.context.user!;
    const { fileName, targetFileName, content } = c.body;
    await fs.writeFile(
      `${filesDirectory}/${user.id}/${targetFileName ?? fileName}`,
      content,
    );
    if (fileName !== targetFileName) {
      await fs.unlink(`${filesDirectory}/${user.id}/${fileName}`);
    }
    return { fileName: targetFileName ?? fileName, content };
  },
);

export const fileRoutes = {
  getFiles,
  getFile,
  createFile,
  removeFile,
  updateFIle,
};
