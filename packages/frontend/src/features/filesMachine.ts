import {
  Actor,
  ActorRefFromLogic,
  assertEvent,
  assign,
  fromPromise,
  setup,
} from "xstate";
import {
  getFileNames,
  getFileContent,
  saveFile,
  deleteFile,
  FileType,
  getInitialFileContent,
} from "./fileStore";
import { api } from "../api";

const filesMachine = setup({
  types: {
    context: {} as {
      files: FileActor[];
      selected: FileActor | null;
    },
    events: {} as
      | { type: "SELECT_FILE"; fileName: string }
      | { type: "CREATE_FILE"; fileName?: string; fileType: FileType }
      | { type: "DELETED"; id: string },
  },
  actions: {},
  actors: {
    loadFilesAndSelect: fromPromise(async () => {
      return api("/get-files", {});
    }),
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QAoC2BDAxgCwJYDswBKAOgBsB7dCAqAMVzLgGIILCSCA3CgazBJoseQqUrVaDJrATcKmdABdc7ANoAGALobNiUAAcKsXMvZ6QAD0QAmAJwBGEuvsBWAGwBmNwBZf6hwAcADQgAJ423rYk3nYA7OrWsS4BsQG26m4AvpkhQjgExJwQTMwAwgBKAKIAggAqlQD6dACSADKVOuaGxqb45lYILvYeTq4+3uqxHt4BniHhCPaxsdEuHsPWbnYett5r2bkY+aJFJQDKle2ltU1tHVpdRiYqfUiWiEMjtrFuyWsBAXsAS880QgJILmyORA+AoEDg5jyImIjx6L36iAAtG5QQhsQcQEiCmIqDR8PRGAi3t1nmY3gMYrjrN4Vr8tj94tYAepZgSiSdcMUwKjaa9QAM1uoIfEPIkkik0vYmalohlNi5rMlUukslCgA */
  context: {
    files: [],
    selected: null,
  },
  initial: "loadingFiles",
  states: {
    loadingFiles: {
      invoke: {
        src: "loadFilesAndSelect",
        onDone: {
          target: "idle",
          actions: assign(({ context, event, spawn }) => {
            const initialFiles =
              event.output.files?.length > 0
                ? event.output.files
                : ["unnamed-1.ts"];

            const files = initialFiles.map((fileName) => {
              const splitted = fileName.split(".");
              const fileType = splitted[splitted.length - 1] as FileType;
              const actor = spawn(fileMachine, {
                input: { fileName, type: fileType.toLowerCase() as FileType },
              });

              return actor;
            });

            context.files = files;
            context.selected = files[0];
            context.selected.send({ type: "LOAD" });

            return context;
          }),
        },
      },
    },
    idle: {
      on: {
        CREATE_FILE: {
          actions: assign(({ context, spawn, event }) => {
            assertEvent(event, "CREATE_FILE");
            const fileName =
              event.fileName || getNewFileName(context.files, event.fileType);
            const file = spawn(fileMachine, {
              input: { fileName, type: event.fileType },
            });
            file.send({ type: "LOAD" });

            context.files = [...context.files, file];
            context.selected = file;

            return context;
          }),
        },
        SELECT_FILE: {
          actions: assign({
            selected: ({ context, event }) => {
              assertEvent(event, "SELECT_FILE");
              const file =
                context.files.find(
                  (file) =>
                    file.getSnapshot().context.fileName === event.fileName,
                ) || null;

              file?.send({ type: "LOAD" });

              return file;
            },
          }),
        },
        DELETED: {
          actions: assign({
            files: ({ context, event }) => {
              assertEvent(event, "DELETED");
              return context.files.filter((file) => file.id !== event.id);
            },
            selected: ({ context, event }) => {
              assertEvent(event, "DELETED");

              const wasSelected = context.selected?.id === event.id;
              const nextSelected = wasSelected
                ? (context.files.find((file) => file.id !== event.id) ?? null)
                : context.selected;

              return nextSelected;
            },
          }),
        },
      },
    },
  },
});

export type FileActor = ActorRefFromLogic<typeof fileMachine>;
export type FileContext = {
  fileName: string;
  fileType: FileType;
  content: string | null;
  targetFileName: string | null;
  isDirty: boolean;
};

const getNewFileName = (files: FileActor[], fileType: FileType) => {
  const existingNames = files.map(
    (file) => file.getSnapshot().context.fileName,
  );
  let i = 1;
  while (existingNames.includes(`unnamed-${i}.${fileType.toLowerCase()}`)) {
    i++;
  }
  return `unnamed-${i}.${fileType.toLowerCase()}`;
};

const fileMachine = setup({
  types: {
    input: {} as { fileName: string; type: FileType },
    context: {} as FileContext,
    events: {} as
      | { type: "UPDATE"; content: string }
      | { type: "SAVE" }
      | { type: "RENAME"; targetFileName: string }
      | { type: "DELETE" }
      | { type: "LOAD" },
  },
  actions: {
    notifyParent: ({ self }) => {
      self._parent?.send({ type: "DELETED", id: self.id });
    },
  },
  actors: {
    loadFile: fromPromise(
      async ({
        input,
      }: {
        input: { fileName: string; fileType: FileType };
      }) => {
        const existingFileContent = await api("/get-file", {
          query: { fileName: input.fileName },
        });

        if (existingFileContent !== null && existingFileContent !== undefined) {
          return existingFileContent;
        }

        const initialContent = getInitialFileContent(input.fileType);

        await api("@post/create-file", {
          body: { fileName: input.fileName, content: initialContent },
        });
        return initialContent;
      },
    ),
    renameFile: fromPromise(
      async ({
        input,
      }: {
        input: { fileName: string; targetFileName: string; content: string };
      }) => {
        const hasExtension = [".sql", ".ts"].some((suffix) =>
          input.targetFileName.endsWith(suffix),
        );
        const extension = hasExtension
          ? ""
          : `.${input.fileName.split(".").pop()}`;
        input.targetFileName += extension;

        console.log("rename", input.fileName, input.targetFileName);

        await api("@post/update-file", {
          body: {
            fileName: input.fileName,
            targetFileName: input.targetFileName,
            content: input.content,
          },
        });

        return input.targetFileName;
      },
    ),
    deleteFile: fromPromise(
      async ({ input }: { input: { fileName: string } }) => {
        await api("@post/remove-file", { body: { fileName: input.fileName } });
      },
    ),
    saveFile: fromPromise(
      async ({ input }: { input: { fileName: string; content: string } }) => {
        await api("@post/update-file", {
          body: { fileName: input.fileName, content: input.content },
        });
      },
    ),
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QAoC2BDAxgCwJYDswBKAOlwgBswBiAGQHkBBAEQG0AGAXUVAAcB7WLgAuufvh4gAHogC0AdgCsAGhABPOQA4AnAF9dqtFjyFSFfuggEo1COLBl8AN34BrB0ZwFiJc5esIBC6Y6KLiHJwRkgJCYRJI0nJKqhoIsjr6hhhepr4WVvg2YABOxfzFJLwUoQBm5agkniY+fgVQgc78IXERUQkxImLxoDJpyepaegYgTd5m+ZDUAEoAogByjACyK318goPikqMKKhNpGdOzua2LzCu0KwAqO1zR+3FHSaep6VNZxnM8pZFgBlRgANRe3H67yGnzG30mmRm2Wa82BEGoAFUAArMRjPXYgAYfBLHcY-C7-HI+YpgfDoVDWWz2RwudyNVGAukMpmFDrBUJDXqvGGxOFkr4pJGXLm5HmM5klMoVKq1eqcgHy+mK-lBLpC8JcIkkiUjKVnX7Iq4+WDoJzMuyENluDxy232gL67rC42ivbiw6ShHS85-FFaj0OwrUZXlSrVYR1YoNG2kO3R9rew34EXQgMHYaJEOWqkRmmkCBgKiiGNOhz6jlpkhVmtezo+o2Rf3E2FB80lynh5utsC1oqleNqpMakfVsftwU9P353uBovkxFh63u0hx4p0JhsHum-vFk6hq3I-D8KvwBJpt7r+GyACMACYAMyX1-yABsJCKDukakOQVBPoWL4Uogn4ACyfsBFZAm0EGkgOF5nLB8jyIB7B4a+ijvoomjyDo7B-ohaLIZAqFmue0EIH+ijaCQeF4Z+7CKL+iika+lHcjqfJQLRZ6bqG8jaJ+uHsZx3G8fxuQZtYIkbhaqTaEorFsRxXFKPJsogS287jipUFbq+BEAYo2myXpmh8QZSH7qZwYYakr6fp+mhaTJuk8fZCk+KOwg0WKkGuQxr5Ye+0nsDpckBfouhAA */
  context: ({ input }) => {
    return {
      fileName: input.fileName,
      fileType: input.type,
      content: null,
      targetFileName: null,
      isDirty: false,
    };
  },
  initial: "idle",
  states: {
    idle: {
      on: {
        LOAD: {
          target: "loading",
        },
      },
    },
    loading: {
      invoke: {
        src: "loadFile",
        input: ({ context }) => ({
          fileName: context.fileName,
          fileType: context.fileType,
        }),
        onDone: {
          target: "loaded",
          actions: assign({
            content: ({ event }) => event.output.toString(),
          }),
        },
        onError: {
          target: "error",
        },
      },
    },
    loaded: {
      on: {
        RENAME: {
          target: "renaming",
          actions: assign({
            targetFileName: ({ event }) => event.targetFileName,
          }),
        },
        DELETE: {
          target: "deleting",
        },
        SAVE: {
          target: "saving",
        },
        UPDATE: {
          actions: assign({
            content: ({ event }) => event.content,
            isDirty: ({ event, context }) => event.content !== context.content,
          }),
        },
      },
    },
    renaming: {
      invoke: {
        src: "renameFile",
        input: ({ context }) => ({
          fileName: context.fileName,
          content: context.content!,
          targetFileName: context.targetFileName!,
        }),
        onDone: {
          target: "loaded",
          actions: assign({
            fileName: ({ event }) => event.output,
            targetFileName: () => null,
            fileType: ({ event }) => event.output.split(".").pop() as FileType,
          }),
        },
        onError: {
          target: "error",
          actions: assign({
            targetFileName: () => null,
          }),
        },
      },
    },
    saving: {
      invoke: {
        src: "saveFile",
        input: ({ context }) => ({
          fileName: context.fileName,
          content: context.content!,
        }),
        onDone: {
          target: "loaded",
          actions: assign({
            isDirty: false,
          }),
        },
        onError: {
          target: "error",
        },
      },
    },
    deleting: {
      invoke: {
        src: "deleteFile",
        input: ({ context }) => ({ fileName: context.fileName }),
        onDone: {
          target: "deleted",
          actions: "notifyParent",
        },
        onError: {
          target: "error",
        },
      },
    },
    error: {
      on: {
        LOAD: {
          target: "loading",
        },
      },
    },
    deleted: {
      type: "final",
    },
  },
});

export const filesActor = new Actor(filesMachine);
filesActor.start();
