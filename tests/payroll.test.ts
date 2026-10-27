import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { calculatePayroll } from "../lib/payroll";
import { validateData } from "../lib/schema";

async function fixture() {
  const raw = await readFile(new URL("../data/vigente.json", import.meta.url), "utf8");
  return validateData(JSON.parse(raw));
}

test("valida el JSON inicial y sus referencias", async () => {
  const data = await fixture();
  assert.equal(data.trabajadores.length, 6);
  assert.equal(data.novedades.length, 7);
  assert.equal(data.schemaVersion, 1);
});

test("calcula suplementarias y extraordinarias sobre sueldo / 240", async () => {
  const roles = calculatePayroll(await fixture(), "PER-2026-10");
  const daniela = roles.find((role) => role.trabajadorId === "VIG-003");
  assert.ok(daniela);
  assert.equal(daniela.conceptos.find((row) => row.codigo === "HES")?.resultado, "75.00");
  assert.equal(daniela.conceptos.find((row) => row.codigo === "HEX")?.resultado, "50.00");
  assert.equal(daniela.totales.remuneracionAportable, "1625.00");
});

test("prorratea el alta de Nicolás con base mensual de 30 días", async () => {
  const roles = calculatePayroll(await fixture(), "PER-2026-10");
  const nicolas = roles.find((role) => role.trabajadorId === "VIG-006");
  assert.ok(nicolas);
  assert.equal(nicolas.conceptos.find((row) => row.codigo === "SUELDO")?.cantidad, "16");
  assert.equal(nicolas.conceptos.find((row) => row.codigo === "SUELDO")?.resultado, "373.33");
});

test("no paga directamente beneficios acumulados ni depósitos IESS", async () => {
  const roles = calculatePayroll(await fixture(), "PER-2026-10");
  const camila = roles.find((role) => role.trabajadorId === "VIG-001");
  assert.ok(camila);
  assert.equal(camila.totales.beneficiosPagadosDirectos, "0.00");
  assert.equal(camila.totales.remuneracionBruta, "2400.00");
});
