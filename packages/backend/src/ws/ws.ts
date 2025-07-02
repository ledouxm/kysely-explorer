import fs from "fs/promises";
import type { Kysely } from "kysely";
import {
  ConnectionStringParser,
  DEFAULT_DATE_PARSER,
  DEFAULT_NUMERIC_PARSER,
  DialectManager,
  type DialectName,
  generate,
} from "kysely-codegen";

const dialectManager = new DialectManager({
  dateParser: DEFAULT_DATE_PARSER,
  numericParser: DEFAULT_NUMERIC_PARSER,
});

export const connectAndGetDialect = async (string: string) => {
  const connectionStringParser = new ConnectionStringParser();
  const { connectionString, inferredDialectName } = connectionStringParser.parse({
    connectionString: string,
  });

  const dialect = dialectManager.getDialect(inferredDialectName);

  if (inferredDialectName.includes("sqlite")) {
    const fileExists = await doesFileExists(connectionString);
    if (!fileExists) {
      throw new Error("SQLite database file does not exist");
    }
  }

  const db = await dialect.introspector.connect({
    connectionString,
    dialect,
  });

  return { db, dialect: inferredDialectName };
};

export const getTypeString = async (db: Kysely<any>, dialectName: DialectName) => {
  const dialect = dialectManager.getDialect(dialectName);

  return generate({
    dialect,
    db,
  });
};

const doesFileExists = (path: string) =>
  fs
    .access(path)
    .then(() => true)
    .catch(() => false);
