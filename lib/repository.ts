import { attachDatabasePool } from "@vercel/functions";
import { Pool, type PoolClient } from "pg";
import { validateData, type VigenteData } from "./schema";
import "server-only";

const STATE_ID = "main";

type GlobalDatabase = typeof globalThis & {
  vigentePool?: Pool;
  vigentePoolAttached?: boolean;
};

const globalDatabase = globalThis as GlobalDatabase;

export class DataStoreError extends Error {
  constructor(public readonly code: "configuracion" | "sin_inicializar" | "lectura", message: string) {
    super(message);
    this.name = "DataStoreError";
  }
}

function connectionString() {
  const value = process.env.DATABASE_URL;
  if (!value) {
    throw new DataStoreError(
      "configuracion",
      "Falta DATABASE_URL. Conecte el recurso Neon al proyecto de Vercel y sincronice las variables de entorno.",
    );
  }
  return value;
}

export function databasePool() {
  if (!globalDatabase.vigentePool) {
    globalDatabase.vigentePool = new Pool({
      connectionString: connectionString(),
      max: 10,
      min: 1,
      idleTimeoutMillis: 5_000,
      connectionTimeoutMillis: 10_000,
    });
  }
  if (!globalDatabase.vigentePoolAttached) {
    attachDatabasePool(globalDatabase.vigentePool);
    globalDatabase.vigentePoolAttached = true;
  }
  return globalDatabase.vigentePool;
}

function parseDocument(value: unknown): VigenteData {
  try {
    return validateData(typeof value === "string" ? JSON.parse(value) : value);
  } catch (error) {
    throw new DataStoreError(
      "lectura",
      `El registro principal de Neon no cumple el esquema: ${error instanceof Error ? error.message : "dato inválido"}`,
    );
  }
}

async function currentRow(client: Pool | PoolClient, forUpdate = false) {
  const result = await client.query(
    `SELECT document, version FROM vigente_state WHERE id = $1${forUpdate ? " FOR UPDATE" : ""}`,
    [STATE_ID],
  );
  const row = result.rows[0];
  if (!row) {
    throw new DataStoreError(
      "sin_inicializar",
      "La base de datos está conectada pero no tiene datos iniciales. Ejecute npm run db:migrate y npm run db:seed.",
    );
  }
  return { data: parseDocument(row.document), version: Number(row.version) };
}

export async function readData(): Promise<VigenteData> {
  const current = await currentRow(databasePool());
  if (current.data.version !== current.version) {
    throw new DataStoreError("lectura", "La versión del documento no coincide con la versión de control en Neon.");
  }
  return current.data;
}

export async function writeData(
  input: unknown,
  expectedVersion: number,
  actor = "sistema",
  operation = "actualizar",
): Promise<VigenteData> {
  const client = await databasePool().connect();
  try {
    await client.query("BEGIN");
    const current = await currentRow(client, true);
    if (current.version !== expectedVersion) {
      throw new Error(`CONFLICT:${current.version}`);
    }

    const source = input as Record<string, unknown>;
    const suppliedUsers = Array.isArray(source.usuarios) ? source.usuarios as Array<Record<string, unknown>> : [];
    const users = suppliedUsers.map((user) => {
      if (typeof user.passwordHash === "string" && user.passwordHash !== "[PROTEGIDO]") return user;
      const currentUser = current.data.usuarios.find((row) => row.id === user.id);
      return currentUser ? { ...user, passwordHash: currentUser.passwordHash } : user;
    });
    const updatedAt = new Date().toISOString();
    const candidate = validateData({
      ...source,
      usuarios: users,
      schemaVersion: 1,
      version: current.version + 1,
      updatedAt,
    });
    candidate.auditoria.push({
      id: `AUD-${crypto.randomUUID()}`,
      fecha: updatedAt,
      actor,
      operacion: operation,
      versionAnterior: current.version,
      versionNueva: candidate.version,
    });

    const result = await client.query(
      `UPDATE vigente_state
       SET document = $1::jsonb, version = $2, updated_at = $3
       WHERE id = $4 AND version = $5`,
      [JSON.stringify(candidate), candidate.version, updatedAt, STATE_ID, current.version],
    );
    if (result.rowCount !== 1) throw new Error(`CONFLICT:${current.version}`);
    await client.query("COMMIT");
    return candidate;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function importData(input: unknown, expectedVersion: number, actor = "administrador") {
  return writeData(input, expectedVersion, actor, "importar-datos");
}

export async function databaseStatus() {
  const startedAt = performance.now();
  const result = await databasePool().query(
    "SELECT version, updated_at FROM vigente_state WHERE id = $1",
    [STATE_ID],
  );
  return {
    connected: true,
    provider: "Neon Postgres",
    table: "public.vigente_state",
    version: result.rows[0] ? Number(result.rows[0].version) : null,
    updatedAt: result.rows[0]?.updated_at ?? null,
    latencyMs: Math.round(performance.now() - startedAt),
  };
}

export const repositoryInfo = { provider: "Neon Postgres", table: "public.vigente_state" };
