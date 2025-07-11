import { css } from "#styled-system/css";
import { Monaco, useMonaco } from "@monaco-editor/react";
import { queryOptions, useQueries } from "@tanstack/react-query";
import { useEffect } from "react";
import Split from "react-split";
import { DbConnections } from "../features/ws/DbConnections";
import { CodeEditor } from "./CodeEditor";
import { TypeEditor } from "./TypeEditor";

export const MainEditor = () => {
  const monaco = useMonaco();

  useLibrariesTypes(monaco);

  return (
    <Split
      className={css({
        display: "flex",
        h: "100%",
        w: "100%",
        "& .gutter": {
          cursor: "col-resize",
          bgImage:
            "url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAeCAYAAADkftS9AAAAIklEQVQoU2M4c+bMfxAGAgYYmwGrIIiDjrELjpo5aiZeMwF+yNnOs5KSvgAAAABJRU5ErkJggg==')",
          bgColor: "background-secondary",
          bgRepeat: "no-repeat",
          bgPosition: "50%",
        },
      })}
      sizes={[10, 30, 60]}
      minSize={200}
      gutterSize={8}
      snapOffset={0}
    >
      <DbConnections />
      <TypeEditor />
      <CodeEditor />
    </Split>
  );
};

const libraries = ["kysely@0.27.2"];

const useLibrariesTypes = (monaco: Monaco | null) => {
  const typesQueries = useQueries({
    queries: libraries.map((lib) =>
      queryOptions({
        queryKey: ["types", lib],
        enabled: !!monaco,
        gcTime: Infinity,

        queryFn: async () => {
          const manifest = await fetch(
            `https://data.jsdelivr.com/v1/package/npm/${lib}/flat`,
          ).then((r) => r.json());

          const files = await Promise.all<{
            name: string;
            content: string;
          }>(
            manifest.files.map(async (typeFile: { name: string }) => {
              const content = await fetch(
                `https://cdn.jsdelivr.net/npm/${lib}${typeFile.name}`,
              ).then((r) => r.text());

              return { name: typeFile.name, content };
            }),
          );

          const packageJson = files.find((f) => f.name === "/package.json");

          return {
            lib,
            files: files,
            packageJson: packageJson ? JSON.parse(packageJson.content) : null,
          };
        },
      }),
    ),
  });

  useEffect(() => {
    if (!monaco) return;
    if (!typesQueries.every((t) => t.isSuccess)) return;

    const mainPackageJson = {
      dependencies: {} as any,
    };

    for (const t of typesQueries) {
      const { lib, files, packageJson } = t.data;
      const [libName] = lib.split("@");

      for (const file of files) {
        monaco.languages.typescript.typescriptDefaults.addExtraLib(
          file.content,
          `file:///node_modules/${libName}${file.name}`,
        );
      }

      for (const entry of Object.keys(packageJson.exports ?? {})) {
        mainPackageJson.dependencies[entry.replace(".", libName)] = `*`;
      }
    }

    monaco.languages.typescript.typescriptDefaults.addExtraLib(
      JSON.stringify(mainPackageJson),
      "file:///package.json",
    );

    monaco.languages.typescript.typescriptDefaults.setEagerModelSync(true);

    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.Latest,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.ESNext,
      noEmit: true,
      paths: {
        "*": ["file:///node_modules/*"],
      },
      allowNonTsExtensions: true,
    });
  }, [monaco, typesQueries]);

  return null;
};
