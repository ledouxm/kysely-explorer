import { startWsServer } from "./ws/wsServer";
import { initDb } from "./db";
import { makeRouter } from "./router/router";
import { registerViteHmrServerRestart } from "./hmr";
import fs from "fs/promises";
import { filesDirectory } from "./router/routerUtils";

const main = async () => {
  await initDb();
  await fs.mkdir(filesDirectory, { recursive: true }).catch(() => {});
  startWsServer();
  makeRouter();
};

main();
registerViteHmrServerRestart();
