import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { DataStoreError, importData, readData, writeData } from "@/lib/repository";
import { redactSecrets } from "@/lib/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function problem(error: unknown) {
  if (error instanceof DataStoreError) {
    return NextResponse.json({ error: error.code, message: error.message }, { status: error.code === "sin_inicializar" ? 503 : 500 });
  }
  if (error instanceof ZodError) {
    return NextResponse.json({ error: "validacion", message: "Los datos no cumplen el esquema.", issues: error.issues }, { status: 422 });
  }
  const message = error instanceof Error ? error.message : "Error inesperado";
  if (message.startsWith("CONFLICT:")) {
    return NextResponse.json({ error: "conflicto_version", currentVersion: Number(message.split(":")[1]) }, { status: 409 });
  }
  return NextResponse.json({ error: "operacion_fallida", message }, { status: 400 });
}

export async function GET() {
  try {
    return NextResponse.json(redactSecrets(await readData()), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return problem(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const expectedVersion = Number(request.headers.get("if-match") ?? body.expectedVersion);
    const mode = request.nextUrl.searchParams.get("mode");
    const result = mode === "import"
      ? await importData(body.data, expectedVersion, "administrador")
      : await writeData(body.data, expectedVersion, body.actor ?? "administrador", body.operation ?? "editar-datos");
    return NextResponse.json(redactSecrets(result));
  } catch (error) {
    return problem(error);
  }
}
