import { startWsServer } from "./ws/wsServer.ts";
import { initDb } from "./db.ts";
import { makeRouter } from "./router/router.ts";
import { registerViteHmrServerRestart } from "./hmr.ts";
import fs from "fs/promises";
import { filesDirectory } from "./router/routerUtils.ts";

const main = async () => {
  await initDb();
  await fs.mkdir(filesDirectory, { recursive: true }).catch(() => {});
  const router = makeRouter();
  startWsServer({ httpInstance: router });
};

main();
registerViteHmrServerRestart();
