import Editor, { EditorProps, Monaco, useMonaco } from "@monaco-editor/react";
import {
  connectionsActor,
  databasesToTsv,
  WsActor,
} from "../features/connectionsMachine";
import { useSelector } from "@xstate/react";
import { useEffect } from "react";
import { Flex } from "#styled-system/jsx";
import { Button, FileIconButton } from "../components/Button";
import { ClipboardIcon, RefreshCwIcon } from "lucide-react";
import { css } from "#styled-system/css";

export const TypeEditor = () => {
  const monaco = useMonaco();
  const connection = useSelector(
    connectionsActor,
    (state) => state.context.selected,
  );

  return (
    <Flex flexDir="column">
      <Flex
        h="40px"
        w="100%"
        justifyContent="space-between"
        bgColor="background-secondary"
        alignItems="center"
      >
        <FileIconButton
          size="sm"
          h="100%"
          px="8px"
          fontSize="12px"
          disabled={!connection}
          onClick={() => {
            const tables = connection?.getSnapshot().context.tables;
            if (!tables) return;

            const string = databasesToTsv(tables);
            navigator.clipboard.writeText(string);
          }}
        >
          <ClipboardIcon />
          Copy database structure
        </FileIconButton>
        <FileIconButton
          disabled={!connection}
          className={css({ justifySelf: "flex-end" })}
          onClick={() => {
            connection?.send({ type: "REFETCH_TYPES" });
          }}
        >
          <RefreshCwIcon />
        </FileIconButton>
      </Flex>
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
        }}
      />

      {connection ? (
        <>
          <TypeStringUpdater connection={connection} />
          <DbFileUpdater connection={connection} />
        </>
      ) : null}
    </Flex>
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
import { Flex } from '#styled-system/jsx';
  import {
      Kysely,
      ${dialectImport}
  } from "kysely"
  
  const dialect = new ${dialectImport}();
  export const db = new Kysely<DB>({
      dialect,
  })";

  export const output = (data: any) => {}

        `,
      "file:///node_modules/kysely-explorer.ts",
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
  glyphMargin: false,
  lineDecorationsWidth: 0,
  lineNumbersMinChars: 0,
} satisfies EditorProps["options"];
