import Editor, { EditorProps, Monaco, useMonaco } from "@monaco-editor/react";
import { connectionsActor, WsActor } from "../features/connectionsMachine";
import { useSelector } from "@xstate/react";
import { useEffect } from "react";

export const TypeEditor = () => {
  const monaco = useMonaco();
  const connection = useSelector(
    connectionsActor,
    (state) => state.context.selected,
  );

  return (
    <>
      {connection ? (
        <>
          <TypeStringUpdater connection={connection} />
          <DbFileUpdater connection={connection} />
        </>
      ) : null}
      <Editor
        height="100%"
        defaultLanguage="typescript"
        defaultValue={`// Select a database connection to see its types`}
        theme="vs-dark"
        className="type-editor"
        options={editorOptions}
        onChange={(value) => {
          monaco!.languages.typescript.typescriptDefaults.addExtraLib(
            value ?? "",
            "file:///node_modules/types.d.ts",
          );
          console.log("change");
        }}
      />
    </>
  );
};
type DialectName =
  | "bun-sqlite"
  | "kysely-bun-sqlite"
  | "libsql"
  | "mssql"
  | "mysql"
  | "postgres"
  | "sqlite"
  | "worker-bun-sqlite";

const dialects: Record<DialectName, string> = {
  "bun-sqlite": "SqliteDialect",
  "kysely-bun-sqlite": "SqliteDialect",
  libsql: "PostgresDialect",
  mssql: "MssqlDialect",
  mysql: "MysqlDialect",
  postgres: "PostgresDialect",
  sqlite: "SqliteDialect",
  "worker-bun-sqlite": "SqliteDialect",
};

const DbFileUpdater = ({ connection }: { connection: WsActor }) => {
  const monaco = useMonaco();
  const dialect = useSelector(connection, (state) => state.context.dialect);

  useEffect(() => {
    if (!monaco || !dialect) return;
    const dialectImport = dialects[dialect as DialectName];
    monaco.languages.typescript.typescriptDefaults.addExtraLib(
      `import { DB } from "types";
  import {
      Kysely,
      ${dialectImport}
  } from "kysely"
  
  const dialect = new ${dialectImport}();
  export const db = new Kysely<DB>({
      dialect,
  })";

        `,
      "file:///node_modules/db.ts",
    );
    monaco.languages.typescript.typescriptDefaults.addExtraLib(
      `export const output = (data: any) => {}`,
      "file:///node_modules/output.ts",
    );
  }, [monaco, dialect]);

  return null;
};

const TypeStringUpdater = ({ connection }: { connection: WsActor }) => {
  const typeString = useSelector(
    connection,
    (state) => state.context.typeString,
  );

  const monaco = useMonaco();

  const typeEditor = monaco?.editor
    ?.getEditors()
    ?.find((editor) =>
      editor.getDomNode()?.parentElement?.classList.contains("type-editor"),
    );

  useEffect(() => {
    if (!typeEditor) return;
    typeEditor.setValue(typeString ?? "");
  }, [typeString, typeEditor]);

  return null;
};

export const editorOptions = {
  automaticLayout: true,
  minimap: { enabled: false },
  lineNumbers: "off",
} satisfies EditorProps["options"];
