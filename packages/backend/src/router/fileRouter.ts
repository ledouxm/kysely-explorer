import { APIError } from "better-call";
import {
  createLoggedInEndpoint,
  filesDirectory,
  safelyResolveUserDirPath,
} from "./routerUtils";
import fs from "fs/promises";
import { z } from "zod";

const getFiles = createLoggedInEndpoint(
  "/get-files",
  { method: "GET" },
  async (c) => {
    const user = c.context.user;
    const files = await fs.readdir(safelyResolveUserDirPath(user.id, ""));
    return { files };
  },
);

const getFile = createLoggedInEndpoint(
  "/get-file",
  { method: "GET", query: z.object({ fileName: z.string() }) },
  async (c) => {
    const user = c.context.user;
    const { fileName } = c.query;

    const path = safelyResolveUserDirPath(user.id, fileName);
    const file = await fs.readFile(path, "utf-8").catch(() => {
      throw new APIError("NOT_FOUND");
    });

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

    const path = safelyResolveUserDirPath(user.id, fileName);
    await fs.writeFile(path, content);

    return { fileName, content };
  },
);

const removeFile = createLoggedInEndpoint(
  "/remove-file",
  { method: "POST", body: z.object({ fileName: z.string() }) },
  async (c) => {
    const user = c.context.user;
    const { fileName } = c.body;

    const path = safelyResolveUserDirPath(user.id, fileName);

    await fs.unlink(path);
    return {};
  },
);

const updateFile = createLoggedInEndpoint(
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

    const newFilePath = safelyResolveUserDirPath(
      user.id,
      targetFileName ?? fileName,
    );

    await fs.writeFile(newFilePath, content);

    if (targetFileName && fileName !== targetFileName) {
      const oldFilePath = safelyResolveUserDirPath(user.id, fileName);
      await fs.unlink(oldFilePath);
    }
    return { fileName: targetFileName ?? fileName, content };
  },
);

export const fileRoutes = {
  getFiles,
  getFile,
  createFile,
  removeFile,
  updateFile,
};
