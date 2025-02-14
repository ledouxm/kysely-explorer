import { useSelector } from "@xstate/react";
import { FileActor, FileContext, filesActor } from "./filesMachine";
import { Flex, Stack, styled } from "#styled-system/jsx";
import { Input } from "../components/Input";
import { ComponentProps, useEffect, useMemo, useRef, useState } from "react";
import { Actor, assign, setup } from "xstate";

export const FileSelector = ({
  isOpen,
  onSelect,
}: {
  isOpen: boolean;
  onSelect: (file: FileActor) => any;
}) => {
  const [inputValue, setInputValue] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  const files = useSelector(filesActor, (state) => state.context.files);

  const selectedIndex = useSelector(
    fileSelectionActor,
    (state) => state.context.selectedIndex,
  );

  // refresh when component is opened
  const mappedFiles = useMemo(() => {
    return files.map((file) => ({
      ...file.getSnapshot().context,
      actorId: file.id,
    }));
  }, [isOpen, files]);

  const filteredFiles = mappedFiles.filter((file) =>
    file.fileName.includes(inputValue),
  );

  // sync files with fileSelectionActor
  useEffect(() => {
    fileSelectionActor.send({ type: "SET_FILES", files: filteredFiles });
  }, [filteredFiles.map((file) => file.fileName).join("/")]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const selectedFile = files.find(
      (file) => file.id === filteredFiles[selectedIndex].actorId,
    );
    if (!selectedFile) return;
    onSelect(selectedFile);
    setInputValue("");
  };
  return (
    <styled.form
      ref={formRef}
      display="flex"
      flexDirection="column"
      onSubmit={handleSubmit}
    >
      <styled.div p="8px">
        <Input
          placeholder="Search files"
          value={inputValue}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown")
              fileSelectionActor.send({ type: "DOWN_ARROW" });
            if (e.key === "ArrowUp")
              fileSelectionActor.send({ type: "UP_ARROW" });
          }}
          onChange={(e) => setInputValue(e.target.value)}
        />
      </styled.div>
      <Flex flexDir="column" role="listbox">
        {filteredFiles.map((file, index) => (
          <styled.div
            key={file.fileName}
            cursor="pointer"
            textWrap="nowrap"
            p="4px 8px"
            bgColor={
              selectedIndex === index ? "background-light" : "transparent"
            }
            onMouseOver={() =>
              fileSelectionActor.send({ type: "SET_SELECTED", index })
            }
            onClick={() => handleSubmit()}
          >
            {file.fileName}
          </styled.div>
        ))}
      </Flex>
    </styled.form>
  );
};

const fileSelectionMachine = setup({
  types: {
    context: {} as { files: FileContext[]; selectedIndex: number },
    events: {} as
      | { type: "SET_FILES"; files: FileContext[] }
      | { type: "UP_ARROW" }
      | { type: "DOWN_ARROW" }
      | { type: "SET_SELECTED"; index: number },
  },
}).createMachine({
  initial: "idle",
  context: {
    selectedIndex: 0,
    files: [],
  },
  states: {
    idle: {
      on: {
        SET_FILES: {
          actions: assign({
            files: ({ event }) => event.files,
            selectedIndex: () => 0,
          }),
        },
        UP_ARROW: {
          actions: assign({
            selectedIndex: ({ context }) => {
              return Math.max(0, context.selectedIndex - 1);
            },
          }),
        },
        DOWN_ARROW: {
          actions: assign({
            selectedIndex: ({ context }) => {
              return Math.min(
                context.files.length - 1,
                context.selectedIndex + 1,
              );
            },
          }),
        },
        SET_SELECTED: {
          actions: assign({
            selectedIndex: ({ event }) => event.index,
          }),
        },
      },
    },
  },
});

const fileSelectionActor = new Actor(fileSelectionMachine);
fileSelectionActor.start();
