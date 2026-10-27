import { NextRequest, NextResponse } from "next/server";
import { calculatePayroll } from "@/lib/payroll";
import { readData, writeData } from "@/lib/repository";
import { redactSecrets } from "@/lib/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const transitions: Record<string, { from: string[]; to: string; field: string }> = {
  approve: { from: ["calculado"], to: "aprobado", field: "aprobadoAt" },
  pay: { from: ["aprobado"], to: "pagado", field: "pagadoAt" },
  close: { from: ["pagado"], to: "cerrado", field: "cerradoAt" },
  reverse: { from: ["aprobado", "pagado"], to: "borrador", field: "reversadoAt" },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = await readData();
    if (data.version !== Number(body.expectedVersion)) {
      return NextResponse.json({ error: "conflicto_version", currentVersion: data.version }, { status: 409 });
    }
    const periodIndex = data.periodos.findIndex((row) => row.id === body.periodId);
    if (periodIndex < 0) return NextResponse.json({ error: "periodo_inexistente" }, { status: 404 });
    const period = { ...data.periodos[periodIndex] };

    if (body.action === "calculate") {
      const roles = calculatePayroll(data, body.periodId);
      data.rolesPago = data.rolesPago.filter((row) => row.periodoId !== body.periodId).concat(roles);
      data.periodos[periodIndex] = { ...period, estado: "calculado", versionCalculo: Number(period.versionCalculo ?? 0) + 1 };
      const result = await writeData(data, data.version, body.actor ?? "nomina.demo", "calcular-nomina");
      return NextResponse.json(redactSecrets(result));
    }

    const transition = transitions[String(body.action)];
    if (!transition || !transition.from.includes(String(period.estado))) {
      return NextResponse.json({ error: "transicion_invalida", message: `No se puede ${body.action} desde ${period.estado}.` }, { status: 409 });
    }
    const now = new Date().toISOString();
    data.periodos[periodIndex] = { ...period, estado: transition.to, [transition.field]: now };
    data.rolesPago = data.rolesPago.map((role) => role.periodoId === body.periodId ? { ...role, estado: transition.to, [`${transition.to}At`]: now } : role);
    const result = await writeData(data, data.version, body.actor ?? "nomina.demo", `${body.action}-nomina`);
    return NextResponse.json(redactSecrets(result));
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo procesar la nómina";
    return NextResponse.json({ error: "nomina", message }, { status: 400 });
  }
}
