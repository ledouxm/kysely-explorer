import { Editor } from "@monaco-editor/react";
import { editorOptions } from "./TypeEditor";
import { Button, Flex } from "@chakra-ui/react";
import { useRef, useState } from "react";
import { useSelector } from "@xstate/react";
import { connectionsActor } from "../features/connectionsMachine";
import { useMutation } from "@tanstack/react-query";
import { useSocketEvent } from "../features/useSocketEvent";
import Split from "react-split";
import { styled } from "#styled-system/jsx";
import { KeyCode, KeyMod } from "monaco-editor";

export const CodeEditor = () => {
  const connection = useSelector(
    connectionsActor,
    (state) => state.context.selected,
  );
  const valueRef = useRef<string | undefined>(undefined);

  const [result, setResult] = useState<any>(null);

  useSocketEvent(connection, "ts-result", (data) => {
    console.log(data);
    setResult(data);
  });
  useSocketEvent(connection, "ts-error", (data) => {
    console.log("error", data);
  });

  const executeTsMutation = useMutation({
    mutationFn: async () => {
      if (!valueRef.current) throw new Error("No value to execute");
      if (!connection) throw new Error("No connection selected");

      const socket = connection.getSnapshot().context.socket;
      if (!socket) throw new Error("No socket connection");

      socket.send("execute-ts", valueRef.current);
    },
  });

  return (
    <Split direction="vertical" sizes={[60, 40]}>
      <Flex direction="column">
        <Editor
          height="100%"
          onChange={(value) => (valueRef.current = value)}
          defaultLanguage="typescript"
          defaultValue={`import { db } from "db";\nimport { output } from "output";\n\n// Write your code here\n// and use output(yourResult) to see the result`}
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
              keybindings: [KeyMod.CtrlCmd | KeyCode.KeyP],
              run: (ed) => {
                console.log("new file");
                ed.trigger(
                  "source",
                  "editor.action.preventDefaultHandler",
                  null,
                );
              },
            });
          }}
          options={editorOptions}
        />
        <Button onClick={() => executeTsMutation.mutate()}>Execute</Button>
      </Flex>
      <Flex direction="column" overflowY="auto">
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
