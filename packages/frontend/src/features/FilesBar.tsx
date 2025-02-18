import { useSelector } from "@xstate/react";
import { filesActor, FileActor } from "./filesMachine";
import { Flex, IconButtonProps } from "@chakra-ui/react";
import {
  ArrowDownIcon,
  ChevronDownIcon,
  FileIcon,
  PlayIcon,
  SaveIcon,
  SearchIcon,
} from "lucide-react";
import { Center, Stack, styled } from "#styled-system/jsx";
import { FileIconButton, IconButton } from "../components/Button";
import {
  MenuContent,
  MenuItem,
  MenuRoot,
  MenuTrigger,
} from "../components/ui/menu";
import { FileType } from "./fileStore";
import { Tooltip } from "../components/Tooltip";
import {
  PopoverBody,
  PopoverContent,
  PopoverRoot,
  PopoverTrigger,
} from "../components/ui/popover";
import { Input } from "../components/Input";
import { ComponentProps, ReactNode, useEffect, useState } from "react";
import { setup } from "xstate";
import { FileSelector } from "./FileSelector";
import { useForm } from "react-hook-form";
import { css } from "#styled-system/css";

export const FilesBar = ({ executeTs }: { executeTs: () => void }) => {
  const files = useSelector(filesActor, (state) => state.context.files);

  useEffect(() => {
    filesActor.send({ type: "LOAD_FILES" });
  }, []);

  return (
    <Flex bgColor="background-secondary" alignItems="center" h="100%">
      <AddFileButton />
      <SearchFileButton />
      <SaveFileButton />
      <Flex
        alignItems="center"
        overflowX="auto"
        h="100%"
        w="100%"
        maxW="100%"
        flexWrap={"nowrap"}
        scrollbar="hidden"
      >
        {files.map((file) => (
          <File key={file.id} fileActor={file} />
        ))}
      </Flex>
      <Tooltip content="Run (Ctrl + Enter)">
        <FileIconButton onClick={() => executeTs()}>
          <PlayIcon />
        </FileIconButton>
      </Tooltip>
    </Flex>
  );
};

const SaveFileButton = () => {
  const selectedFile = useSelector(
    filesActor,
    (state) => state.context.selected,
  );

  if (!selectedFile) return <SaveFileBaseButton />;
  return <SaveFileButtonWithSelected fileActor={selectedFile} />;
};

const SaveFileButtonWithSelected = ({
  fileActor,
}: {
  fileActor: FileActor;
}) => {
  const isDirty = useSelector(fileActor, (state) => state.context.isDirty);
  return (
    <SaveFileBaseButton
      disabled={!isDirty}
      onClick={() => fileActor.send({ type: "SAVE" })}
    />
  );
};

const SaveFileBaseButton = (props: IconButtonProps) => {
  return (
    <FileIconButton disabled {...props}>
      <SaveIcon />
    </FileIconButton>
  );
};

const SearchFileButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <PopoverRoot
      positioning={{ placement: "bottom-start" }}
      open={isOpen}
      onOpenChange={({ open }) => setIsOpen(open)}
    >
      <PopoverTrigger asChild>
        <FileIconButton>
          <SearchIcon />
        </FileIconButton>
      </PopoverTrigger>
      <PopoverContent>
        <PopoverBody p="0" bgColor="background-secondary" borderRadius="4px">
          <FileSelector
            isOpen={isOpen}
            onSelect={(fileActor) => {
              filesActor.send({
                type: "SELECT_FILE",
                fileName: fileActor.getSnapshot().context.fileName,
              });
              setIsOpen(false);
            }}
          />
        </PopoverBody>
      </PopoverContent>
    </PopoverRoot>
  );
};

const AddFileButton = () => {
  return (
    <MenuRoot
      onSelect={({ value }) =>
        filesActor.send({ type: "CREATE_FILE", fileType: value as FileType })
      }
    >
      <MenuTrigger asChild>
        <FileIconButton>
          <FileIcon />
        </FileIconButton>
      </MenuTrigger>
      <MenuContent>
        <MenuItem value="ts" color="white" cursor="pointer">
          TS
        </MenuItem>
        <MenuItem value="sql" color="white" cursor="pointer">
          SQL
        </MenuItem>
      </MenuContent>
    </MenuRoot>
  );
};

const File = ({ fileActor }: { fileActor: FileActor }) => {
  const [isRenaming, setIsRenaming] = useState(false);

  const form = useForm<{ targetFileName: string }>();

  const selected = useSelector(filesActor, (state) => state.context.selected);
  const fileName = useSelector(fileActor, (state) => state.context.fileName);

  const isSelected = selected?.id === fileActor.id;

  return (
    <Center
      _hover={{
        bgColor: "background-secondary",
      }}
      cursor="pointer"
      userSelect="none"
      h="100%"
      justifyContent="space-between"
      bgColor={isSelected ? "background-secondary" : "background-tertiary"}
      pr="8px"
      pl="12px"
      color={isSelected ? "text-primary" : "text-secondary"}
      onClick={() =>
        filesActor.send({
          type: "SELECT_FILE",
          fileName,
        })
      }
    >
      {isRenaming ? (
        <form
          onSubmit={form.handleSubmit((values) => {
            const { targetFileName } = values;
            if (!targetFileName) return;
            if (targetFileName.startsWith(".")) return;
            if (targetFileName.includes("/")) return;

            fileActor.send({
              type: "RENAME",
              targetFileName: values.targetFileName,
            });
            setIsRenaming(false);
          })}
        >
          <Input
            autoFocus
            p="0"
            h="auto"
            color="white"
            bgColor="background-tertiary"
            className={css({
              "&::selection": {
                bgColor: "text-secondary",
              },
            })}
            border="none"
            borderRadius="0"
            {...form.register("targetFileName")}
          />
        </form>
      ) : (
        <styled.div textWrap="nowrap">{fileName}</styled.div>
      )}
      <MenuRoot positioning={{ placement: "bottom-end" }}>
        <MenuTrigger asChild>
          <IconButton
            ml="8px"
            size="sm"
            minWidth="unset !important"
            w="20px"
            h="20px"
            transition="none"
            p="0"
            bgColor={
              isSelected ? "background-secondary" : "background-tertiary"
            }
            _hover={{
              bgColor: isSelected
                ? "background-tertiary"
                : "background-secondary",
            }}
            color="text-primary"
          >
            <ChevronDownIcon />
          </IconButton>
        </MenuTrigger>
        <MenuContent>
          <MenuItem
            value="Rename"
            onClick={(e) => {
              e.stopPropagation();
              form.reset({ targetFileName: removeExtension(fileName) });
              setIsRenaming(true);
            }}
            cursor="pointer"
          >
            Rename
          </MenuItem>

          <MenuItem
            onClick={(e) => {
              e.stopPropagation();
              fileActor.send({ type: "DELETE" });
            }}
            cursor="pointer"
            value="Delete"
          >
            Delete
          </MenuItem>
        </MenuContent>
      </MenuRoot>
    </Center>
  );
};

const removeExtension = (fileName: string) => {
  return fileName;
};
