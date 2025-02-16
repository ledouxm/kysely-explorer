import { Editor, Monaco, useMonaco } from "@monaco-editor/react";
import { editorOptions } from "./TypeEditor";
import { useEffect, useRef, useState, useMemo } from "react";
import { useSelector } from "@xstate/react";
import { connectionsActor } from "../features/ws/connectionsMachine";
import { useMutation } from "@tanstack/react-query";
import { useSocketEvent } from "../features/useSocketEvent";
import Split from "react-split";
import { styled, Flex, Stack } from "#styled-system/jsx";
import { KeyCode, KeyMod } from "monaco-editor";
import { FilesBar } from "../features/FilesBar";
import { Button, IconButton } from "../components/Button";
import { css } from "#styled-system/css";
import { FileActor, filesActor } from "../features/filesMachine";
import { MessageCircleQuestionIcon } from "lucide-react";
import { LLMDialog } from "../features/LLM/LLMDialog";

export const CodeEditor = () => {
  const connection = useSelector(
    connectionsActor,
    (state) => state.context.selected,
  );

  const [result, setResult] = useState<any>(null);

  useSocketEvent(connection, "ts-result", (data) => {
    console.log(data);
    setResult(data);
  });
  useSocketEvent(connection, "ts-error", (data) => {
    console.log("error", data);
  });

  useSocketEvent(connection, "sql-result", (data) => {
    console.log(data);
    setResult(data);
  });
  useSocketEvent(connection, "sql-error", (data) => {
    console.log("error", data);
  });

  const selectedFile = useSelector(filesActor, (state) => {
    return state.context.selected;
  });

  const executeTsMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) throw new Error("No selected file");
      if (!connection) throw new Error("No connection selected");

      const socket = connection.getSnapshot().context.socket;
      if (!socket) throw new Error("No socket connection");

      const { content, fileType } = selectedFile?.getSnapshot().context;

      socket.send(`execute-${fileType}`, content);
    },
  });

  console.log("selectedFile", selectedFile);
  return (
    <Split direction="vertical" sizes={[60, 40]}>
      {/* <Flex direction="column" h="100%"> */}
      <styled.div pos="relative">
        <styled.div
          pos="absolute"
          top="0"
          left="0"
          right="0"
          h="40px"
          zIndex="1"
        >
          <FilesBar executeTs={() => executeTsMutation.mutate()} />
        </styled.div>
        <styled.div pos="absolute" bottom="8px" right="24px" zIndex="1">
          <LLMDialog />
        </styled.div>
        <Editor
          wrapperProps={{
            className: css({
              flex: 1,
              pt: "40px",
            }),
          }}
          className={"code-editor"}
          onChange={(value) => {
            selectedFile?.send({
              type: "UPDATE",
              content: value ?? "",
            });
          }}
          defaultLanguage="typescript"
          defaultValue={`import { db, output } from "kysely-explorer";\n\n// Write your code here\n// and use output(yourResult) to see the result`}
          theme="vs-dark"
          onMount={(e) => {
            e.addAction({
              id: "execute",
              label: "Execute current file",
              keybindings: [KeyMod.CtrlCmd | KeyCode.Enter],
              run: () => executeTsMutation.mutate(),
            });

            e.addAction({
              id: "new file",
              label: "New file",
              keybindings: [KeyMod.CtrlCmd | KeyCode.KeyS],
              run: (ed) => {
                console.log("new file", selectedFile);
                filesActor
                  .getSnapshot()
                  .context.selected?.send({ type: "SAVE" });
                ed.trigger(
                  "source",
                  "editor.action.preventDefaultHandler",
                  null,
                );
              },
            });

            // e.addAction({

            // })
          }}
          options={editorOptions}
        />
        {selectedFile ? <CodeUpdater file={selectedFile} /> : null}
      </styled.div>
      <Flex direction="column" overflowY="auto" bgColor="background-tertiary">
        {result ? (
          <styled.pre>
            {typeof result === "string"
              ? result
              : JSON.stringify(result, null, 2)}
          </styled.pre>
        ) : null}
      </Flex>
    </Split>
  );
};

const CodeUpdater = ({ file }: { file: FileActor }) => {
  const monaco = useMonaco();
  const value = useSelector(file, (state) => state.value);

  useEffect(() => {
    if (value !== "loaded") return;

    const codeEditor = getEditor(monaco, "code-editor");
    if (!codeEditor) return;

    const content = file.getSnapshot().context.content;
    const type = file.getSnapshot().context.fileType;
    const language = type === "sql" ? "sql" : "typescript";

    codeEditor.getModel()?.dispose();
    const model = monaco!.editor.createModel(content ?? "", language);
    codeEditor.setModel(model);
  }, [value, file, monaco]);

  return null;
};

const getEditor = (
  monaco: Monaco | null,
  name: "type-editor" | "code-editor",
) => {
  return monaco?.editor
    ?.getEditors()
    ?.find((editor) =>
      editor.getDomNode()?.parentElement?.classList.contains(name),
    );
};
