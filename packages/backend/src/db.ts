import Database from "better-sqlite3";
import { Kysely, SqliteDialect } from "kysely";
import { ENV } from "./envVar";
import fs from "fs/promises";
import { DB } from "./db-types";

const sqlite = new Database(ENV.AUTH_DB_PATH);
const dialect = new SqliteDialect({
  database: sqlite,
});

export const db = new Kysely<DB>({ dialect });

export const initDb = async () => {
  const migrationsDir = await fs
    .readdir("./better-auth_migrations")
    .catch(() => {});

  if (!migrationsDir) {
    console.log("No migrations found");
    return;
  }

  const appliedMigrations = await getAppliedMigrations();

  const migrations = migrationsDir
    .filter((f) => f.endsWith(".sql"))
    .filter((f) => !appliedMigrations.includes(f))
    .sort();

  if (migrations.length === 0) console.log("No new migrations found");

  for (const migration of migrations) {
    console.log(`Applying migration ${migration}`);
    const sql = await fs.readFile(
      `./better-auth_migrations/${migration}`,
      "utf-8",
    );
    sqlite.exec(sql);

    sqlite
      .prepare(
        `
            INSERT INTO migration (name) VALUES (?);
        `,
      )
      .run(migration);
  }
};

const getAppliedMigrations = async () => {
  // table migration exists
  const tableExists = sqlite
    .prepare(
      `
        SELECT name FROM sqlite_master WHERE type='table' AND name='migration';
    `,
    )
    .get();

  if (!tableExists) {
    sqlite.exec(`
            CREATE TABLE migration (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL
            );
        `);
  }

  const appliedMigrations = sqlite
    .prepare(
      `
        SELECT name FROM migration;
    `,
    )
    .all();

  return appliedMigrations.map((row) => (row as any).name);
};
