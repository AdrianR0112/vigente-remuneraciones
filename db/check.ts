import { loadEnvConfig } from "@next/env";
import { Pool } from "pg";
import { normalizePostgresUrl } from "../lib/postgres-url";

loadEnvConfig(process.cwd());
const rawConnectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!rawConnectionString) throw new Error("Falta DATABASE_URL_UNPOOLED o DATABASE_URL.");
const connectionString = normalizePostgresUrl(rawConnectionString);

const pool = new Pool({ connectionString, max: 1 });

async function main() {
  try {
    const result = await pool.query("SELECT version, updated_at FROM vigente_state WHERE id = 'main'");
    if (!result.rows[0]) throw new Error("La tabla existe, pero falta el registro principal. Ejecute npm run db:seed.");
    console.log(`Neon operativo · versión ${result.rows[0].version} · actualizado ${new Date(result.rows[0].updated_at).toISOString()}`);
  } finally {
    await pool.end();
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
