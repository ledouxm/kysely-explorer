import { startWsServer } from "./ws/wsServer";
import { initDb } from "./db";
import { makeRouter } from "./router/router";
import { registerViteHmrServerRestart } from "./hmr";
const main = async () => {
  await initDb();
  startWsServer();
  makeRouter();
};

main();
registerViteHmrServerRestart();
