import { createStore, del, keys, set, get } from "idb-keyval";

const fileStore = createStore("kysely-explorer-files", "files");
export const fileCache = new Map<string, string>();

export const saveFile = async (fileName: string, content: string) => {
  await set(fileName, content, fileStore);
  // fileCache.set(fileName, content);
};

export const deleteFile = async (fileName: string) => {
  await del(fileName, fileStore);
  // fileCache.delete(fileName);
};

export const getFileNames = async () => {
  return keys(fileStore) as Promise<string[]>;
};

export const getFileContent = async (fileName: string) => {
  // if (fileCache.has(fileName)) {
  //   return fileCache.get(fileName);
  // }

  const fromDb = await get(fileName, fileStore);

  console.log("red from db", fromDb);

  return fromDb;
};

export type FileType = "ts" | "sql";

export const getInitialFileContent = (type: FileType) => {
  if (type === "ts") {
    return initialTsFileContent;
  }
  if (type === "sql") {
    return initialSqlFileContent;
  }
  return "";
};

const initialTsFileContent = `import { db, output } from "kysely-explorer";

// Use the db object to query the database
// and the output function to return the result
// const result = await db.selectFrom("table").selectAll().execute();
// output(result);
`;

const initialSqlFileContent = "";
