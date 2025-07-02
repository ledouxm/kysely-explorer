import type { Kysely } from "kysely";
import * as esbuild from "esbuild";
import { SourceTextModule, createContext } from "node:vm";
type ExecuteOptions = {
  code: string;
  db: Kysely<any>;
};

export const executeTs = async ({ code, db }: ExecuteOptions) => {
  const esmCode = await esbuild.build({
    stdin: {
      contents: code,
      loader: "ts",
      resolveDir: process.cwd(),
    },
    packages: "external",
    bundle: true,
    write: false,
    format: "esm",
    platform: "node",
    target: "node16",
  });

  let result = null;
  let hasBeenCalled = false;

  const output = (value: any) => {
    if (hasBeenCalled) {
      throw new Error("output has already been called");
    }
    hasBeenCalled = true;
    result = value;
  };

  const injectedModules = {
    "kysely-explorer": { db, output },
    console: { console },
  };

  const context = createContext({
    __injectedModules: injectedModules,
  });

  const linker = (specifier: string) => {
    if (specifier in injectedModules) {
      const injectedModule = (injectedModules as any)[specifier];

      const exportCode = Object.keys(injectedModule)
        .map(
          (key) =>
            `export const ${key} = __injectedModules["${specifier}"]["${key}"];`,
        )
        .join("\n");

      return new SourceTextModule(exportCode, {
        context,
        identifier: specifier,
      });
    }

    throw new Error(`Cannot import ${specifier}`);
  };

  const module = new SourceTextModule(esmCode.outputFiles[0].text, {
    context,
    identifier: "userModule",
    importModuleDynamically: linker,
  });

  await module.link(linker);
  await module.evaluate();

  return result;
};
