import { Hono } from "hono";
import { GlobalHonoConfig } from "../auth";
import { assertUserMiddleware, userDirExistsMiddleware } from "./routerUtils";
import fs from "fs/promises";
import { ENV } from "../envVar";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

export const fileRouter = new Hono<GlobalHonoConfig>();
export const filesDirectory = ENV.USER_FILES_DIRECTORY;

fileRouter.use("*", assertUserMiddleware, userDirExistsMiddleware);

const routes = fileRouter
  .get("/get-files", async (c) => {
    const user = c.get("user")!;
    const files = await fs.readdir(`${filesDirectory}/${user.id}`);
    console.log(files);
    return c.json({ files });
  })
  .get(
    "/get-file",
    zValidator(
      "query",
      z.object({
        fileName: z.string(),
      }),
    ),
    async (c) => {
      const user = c.get("user")!;
      const { fileName } = c.req.valid("query");

      const file = await fs.readFile(
        `${filesDirectory}/${user.id}/${fileName}`,
        "utf-8",
      );

      return c.text(file);
    },
  )
  .post(
    "/create-file",
    zValidator(
      "json",
      z.object({
        fileName: z.string(),
        content: z.string(),
      }),
    ),
    async (c) => {
      const user = c.get("user")!;
      const { fileName, content } = c.req.valid("json");

      await fs.writeFile(`${filesDirectory}/${user.id}/${fileName}`, content);

      return c.json({
        fileName,
        content,
      });
    },
  )
  .post(
    "/remove-file",
    zValidator(
      "json",
      z.object({
        fileName: z.string(),
      }),
    ),
    async (c) => {
      const user = c.get("user")!;
      const { fileName } = c.req.valid("json");

      await fs.unlink(`${filesDirectory}/${user.id}/${fileName}`);

      return c.json({});
    },
  )
  .post(
    "/update-file",
    zValidator(
      "json",
      z.object({
        fileName: z.string(),
        targetFileName: z.string().optional(),
        content: z.string(),
      }),
    ),
    async (c) => {
      const user = c.get("user")!;
      const { fileName, targetFileName, content } = c.req.valid("json");

      await fs.writeFile(
        `${filesDirectory}/${user.id}/${targetFileName ?? fileName}`,
        content,
      );

      if (fileName !== targetFileName) {
        await fs.unlink(`${filesDirectory}/${user.id}/${fileName}`);
      }

      return c.json({
        fileName: targetFileName ?? fileName,
        content,
      });
    },
  );

export type FileRoutes = typeof routes;
