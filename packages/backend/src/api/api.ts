import { z } from "zod";
import {
  generate,
  PostgresDialect,
  ConnectionStringParser,
  Cli,
  DialectManager,
  DEFAULT_DATE_PARSER,
  DEFAULT_NUMERIC_PARSER,
  GeneratorDialect,
  DialectName,
} from "kysely-codegen";
import { Kysely } from "kysely";
import fs from "fs/promises";

const dialectManager = new DialectManager({
  dateParser: DEFAULT_DATE_PARSER,
  numericParser: DEFAULT_NUMERIC_PARSER,
});
export const connectAndGetDialect = async (string: string) => {
  const connectionStringParser = new ConnectionStringParser();
  const { connectionString, inferredDialectName } =
    connectionStringParser.parse({
      connectionString: string,
    });

  const dialect = dialectManager.getDialect(inferredDialectName);

  if (inferredDialectName.includes("sqlite")) {
    const fileExists = await fs
      .access(connectionString)
      .then(() => true)
      .catch(() => false);
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

export const getTypeString = async (
  db: Kysely<any>,
  dialectName: DialectName,
) => {
  const dialect = dialectManager.getDialect(dialectName);

  return generate({
    dialect,
    db,
  });
};

const fileExists = (path: string) =>
  fs
    .access(path)
    .then(() => true)
    .catch(() => false);
