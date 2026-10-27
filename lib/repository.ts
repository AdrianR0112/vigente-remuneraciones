import { promises as fs } from "node:fs";
import path from "node:path";
import { validateData, type VigenteData } from "./schema";
import "server-only";

const BUNDLED_DATA_PATH = path.join(process.cwd(), "data", "vigente.json");
const DATA_PATH = process.env.VIGENTE_DATA_PATH
  ? path.resolve(process.env.VIGENTE_DATA_PATH)
  : process.env.VERCEL
    ? path.join("/tmp", "vigente-remuneraciones", "vigente.json")
    : BUNDLED_DATA_PATH;
const BACKUP_DIR = path.join(path.dirname(DATA_PATH), "backups");

let writeQueue: Promise<unknown> = Promise.resolve();

export class CorruptDataError extends Error {
  constructor(public readonly filePath: string, message: string) {
    super(message);
    this.name = "CorruptDataError";
  }
}

async function ensureDirectories() {
  await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
  await fs.mkdir(BACKUP_DIR, { recursive: true });
  if (DATA_PATH !== BUNDLED_DATA_PATH) {
    try {
      await fs.access(DATA_PATH);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      await fs.copyFile(BUNDLED_DATA_PATH, DATA_PATH);
    }
  }
}

export async function readData(): Promise<VigenteData> {
  await ensureDirectories();
  try {
    const raw = await fs.readFile(DATA_PATH, "utf8");
    return validateData(JSON.parse(raw));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new CorruptDataError(DATA_PATH, "No existe el archivo persistente. Restaure un respaldo o instale los datos iniciales.");
    }
    throw new CorruptDataError(
      DATA_PATH,
      `El archivo se conservó sin cambios. ${error instanceof Error ? error.message : "JSON inválido"}`,
    );
  }
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function backupCurrent(reason: string) {
  try {
    await fs.copyFile(DATA_PATH, path.join(BACKUP_DIR, `${stamp()}-${reason}.json`));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

async function atomicReplace(data: VigenteData, reason: string) {
  await ensureDirectories();
  await backupCurrent(reason);
  const temporary = `${DATA_PATH}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(temporary, `${JSON.stringify(data, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  try {
    await fs.rename(temporary, DATA_PATH);
  } catch (error) {
    await fs.rm(temporary, { force: true });
    throw error;
  }
}

export async function writeData(
  input: unknown,
  expectedVersion: number,
  actor = "sistema",
  operation = "actualizar",
): Promise<VigenteData> {
  const task = writeQueue.then(async () => {
    const current = await readData();
    if (current.version !== expectedVersion) {
      throw new Error(`CONFLICT:${current.version}`);
    }
    const source = input as Record<string, unknown>;
    const suppliedUsers = Array.isArray(source.usuarios) ? source.usuarios as Array<Record<string, unknown>> : [];
    const users = suppliedUsers.map((user) => {
      if (typeof user.passwordHash === "string" && user.passwordHash !== "[PROTEGIDO]") return user;
      const currentUser = current.usuarios.find((row) => row.id === user.id);
      return currentUser ? { ...user, passwordHash: currentUser.passwordHash } : user;
    });
    const candidate = validateData({
      ...source,
      usuarios: users,
      schemaVersion: 1,
      version: current.version + 1,
      updatedAt: new Date().toISOString(),
    });
    candidate.auditoria.push({
      id: `AUD-${crypto.randomUUID()}`,
      fecha: candidate.updatedAt,
      actor,
      operacion: operation,
      versionAnterior: current.version,
      versionNueva: candidate.version,
    });
    await atomicReplace(candidate, operation.replace(/[^a-z0-9_-]/gi, "-").toLowerCase());
    return candidate;
  });
  writeQueue = task.catch(() => undefined);
  return task;
}

export async function importData(input: unknown, expectedVersion: number, actor = "administrador") {
  const validated = validateData(input);
  return writeData(validated, expectedVersion, actor, "importar-json");
}

export async function listBackups() {
  await ensureDirectories();
  const files = await fs.readdir(BACKUP_DIR);
  return files.filter((file) => file.endsWith(".json")).sort().reverse();
}

export async function restoreBackup(fileName: string, expectedVersion: number) {
  if (path.basename(fileName) !== fileName || !fileName.endsWith(".json")) throw new Error("Nombre de respaldo inválido");
  const raw = await fs.readFile(path.join(BACKUP_DIR, fileName), "utf8");
  const backup = validateData(JSON.parse(raw));
  try {
    await readData();
    return writeData(backup, expectedVersion, "administrador", `restaurar-${fileName}`);
  } catch (error) {
    if (!(error instanceof CorruptDataError)) throw error;
    const recovered = validateData({
      ...backup,
      version: backup.version + 1,
      updatedAt: new Date().toISOString(),
      auditoria: [
        ...backup.auditoria,
        {
          id: `AUD-${crypto.randomUUID()}`,
          fecha: new Date().toISOString(),
          actor: "administrador",
          operacion: "restaurar-archivo-danado",
          versionAnterior: null,
          versionNueva: backup.version + 1,
          respaldo: fileName,
        },
      ],
    });
    await atomicReplace(recovered, "recuperacion-archivo-danado");
    return recovered;
  }
}

export const repositoryInfo = { dataPath: DATA_PATH, backupDir: BACKUP_DIR };
