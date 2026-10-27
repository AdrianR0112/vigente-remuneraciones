import { NextRequest, NextResponse } from "next/server";
import { listBackups, restoreBackup } from "@/lib/repository";
import { redactSecrets } from "@/lib/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ backups: await listBackups() });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    return NextResponse.json(redactSecrets(await restoreBackup(body.fileName, Number(body.expectedVersion))));
  } catch (error) {
    return NextResponse.json({ error: "restauracion", message: error instanceof Error ? error.message : "No se pudo restaurar" }, { status: 400 });
  }
}
