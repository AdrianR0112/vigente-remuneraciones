import { readFile } from "node:fs/promises";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { Pool } from "pg";
import { validateData } from "../lib/schema";

loadEnvConfig(process.cwd());
const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error("Falta DATABASE_URL_UNPOOLED (o DATABASE_URL como alternativa local). No se cargaron datos.");

const seedPath = path.join(process.cwd(), "db", "seed", "vigente.seed.json");
const seed = validateData(JSON.parse(await readFile(seedPath, "utf8")));
const pool = new Pool({ connectionString, max: 1 });

try {
  const result = await pool.query(
    `INSERT INTO vigente_state (id, document, version, updated_at)
     VALUES ('main', $1::jsonb, $2, $3)
     ON CONFLICT (id) DO NOTHING`,
    [JSON.stringify(seed), seed.version, seed.updatedAt],
  );
  console.log(result.rowCount === 1 ? `datos iniciales cargados (v${seed.version})` : "datos existentes conservados");
} finally {
  await pool.end();
}
