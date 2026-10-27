import { NextResponse } from "next/server";

export const runtime = "nodejs";

function removed() {
  return NextResponse.json(
    { error: "retirado", message: "Los respaldos en archivos fueron retirados. Los datos persistentes ahora viven en Neon Postgres." },
    { status: 410 },
  );
}

export const GET = removed;
export const POST = removed;
