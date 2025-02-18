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
