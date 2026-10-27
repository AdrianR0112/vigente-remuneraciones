import { NextResponse } from "next/server";
import { readData } from "@/lib/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const data = await readData();
  return new NextResponse(`${JSON.stringify(data, null, 2)}\n`, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="vigente-v${data.version}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
