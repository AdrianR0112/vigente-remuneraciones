import { NextResponse } from "next/server";
import { databaseStatus } from "@/lib/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await databaseStatus(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json(
      { connected: false, message: error instanceof Error ? error.message : "No se pudo consultar Neon." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
