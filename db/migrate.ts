import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { Pool } from "pg";

loadEnvConfig(process.cwd());
const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error("Falta DATABASE_URL_UNPOOLED (o DATABASE_URL como alternativa local). No se ejecutó ninguna migración.");

const pool = new Pool({ connectionString, max: 1 });
const migrationsDirectory = path.join(process.cwd(), "db", "migrations");

async function main() {
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS _vigente_migrations (
      name text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )`);
    const files = (await readdir(migrationsDirectory)).filter((file) => file.endsWith(".sql")).sort();
    for (const file of files) {
      const applied = await pool.query("SELECT 1 FROM _vigente_migrations WHERE name = $1", [file]);
      if (applied.rowCount) {
        console.log(`omitida ${file}`);
        continue;
      }
      const sql = await readFile(path.join(migrationsDirectory, file), "utf8");
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(sql);
        await client.query("INSERT INTO _vigente_migrations (name) VALUES ($1)", [file]);
        await client.query("COMMIT");
        console.log(`aplicada ${file}`);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    }
  } finally {
    await pool.end();
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
