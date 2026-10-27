import Decimal from "decimal.js";
import type { VigenteData, Worker } from "./schema";

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });
const d = (value: Decimal.Value) => new Decimal(value);
const money = (value: Decimal.Value) => d(value).toDecimalPlaces(2).toFixed(2);

type Concept = {
  codigo: string;
  nombre: string;
  tipo: "ingreso" | "descuento" | "obligacion" | "provision" | "acumulacion";
  base: string;
  formula: string;
  cantidad: string;
  tasa: string;
  resultado: string;
  fuenteId: string;
};

function param(data: VigenteData, code: string, fallback: string) {
  const found = data.parametrosLegales.find((row) => row.codigo === code);
  return typeof found?.valor === "string" ? found.valor : fallback;
}

function noveltyTotals(data: VigenteData, worker: Worker, periodId: string) {
  const rows = data.novedades.filter((row) => row.trabajadorId === worker.id && row.periodoId === periodId);
  return rows.reduce(
    (acc, row) => {
      if (row.tipo === "hora_suplementaria") acc.supp = acc.supp.plus(row.horas ?? 0);
      if (row.tipo === "hora_extraordinaria") acc.extra = acc.extra.plus(row.horas ?? 0);
      if (row.tipo === "recargo_nocturno") acc.night = acc.night.plus(row.horas ?? 0);
      if (row.tipo === "bono_remunerativo") acc.bonus = acc.bonus.plus(row.valor ?? 0);
      if (row.tipo === "anticipo") acc.advance = acc.advance.plus(row.valor ?? 0);
      return acc;
    },
    { supp: d(0), extra: d(0), night: d(0), bonus: d(0), advance: d(0) },
  );
}

function daysPaid(worker: Worker, period: Record<string, unknown>) {
  const start = String(period.inicio);
  const end = String(period.fin);
  if (worker.fechaIngreso <= start) return d(30);
  if (worker.fechaIngreso > end) return d(0);
  const [year, month] = start.split("-").map(Number);
  const [, , day] = worker.fechaIngreso.split("-").map(Number);
  const calendarLast = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return d(calendarLast - day + 1);
}

export function calculatePayroll(data: VigenteData, periodId: string) {
  const period = data.periodos.find((row) => row.id === periodId);
  if (!period) throw new Error("Período inexistente");
  if (!["borrador", "calculado"].includes(String(period.estado))) throw new Error("El período está protegido");

  const personalRate = d(param(data, "IESS_PERSONAL", "0.0945"));
  const employerRate = d(param(data, "IESS_PATRONAL", "0.1115"));
  const reserveRate = d(param(data, "FONDO_RESERVA", "0.0833"));
  const sbu = d(param(data, "SBU", "482.00"));

  const roles = data.trabajadores.filter((worker) => worker.estado === "activo").map((worker) => {
    const salary = d(worker.sueldo);
    const paidDays = daysPaid(worker, period);
    const proportionalSalary = salary.div(30).times(paidDays);
    const hour = salary.div(240);
    const novelties = noveltyTotals(data, worker, periodId);
    const supplementary = hour.times("1.50").times(novelties.supp);
    const extraordinary = hour.times("2.00").times(novelties.extra);
    const night = hour.times("0.25").times(novelties.night);
    const contributable = proportionalSalary.plus(supplementary).plus(extraordinary).plus(night).plus(novelties.bonus);
    const iessPersonal = contributable.times(personalRate);
    const iessEmployer = contributable.times(employerRate);
    const d13 = contributable.div(12);
    const d14 = sbu.div(12).times(paidDays.div(30));
    const oneYear = new Date(String(period.fin)).getTime() >= new Date(`${Number(worker.fechaIngreso.slice(0, 4)) + 1}${worker.fechaIngreso.slice(4)}`).getTime();
    const reserve = oneYear ? contributable.times(reserveRate) : d(0);
    const vacationProvision = contributable.div(24);

    const concepts: Concept[] = [
      { codigo: "SUELDO", nombre: "Sueldo proporcional", tipo: "ingreso", base: worker.sueldo, formula: "sueldo / 30 × días pagados", cantidad: paidDays.toString(), tasa: "1.00", resultado: money(proportionalSalary), fuenteId: "F-CODIGO-TRABAJO" },
      { codigo: "HES", nombre: "Horas suplementarias", tipo: "ingreso", base: money(hour), formula: "valor hora × 1.50 × horas", cantidad: novelties.supp.toString(), tasa: "1.50", resultado: money(supplementary), fuenteId: "F-CODIGO-TRABAJO" },
      { codigo: "HEX", nombre: "Horas extraordinarias", tipo: "ingreso", base: money(hour), formula: "valor hora × 2.00 × horas", cantidad: novelties.extra.toString(), tasa: "2.00", resultado: money(extraordinary), fuenteId: "F-CODIGO-TRABAJO" },
      { codigo: "NOCT", nombre: "Recargo nocturno", tipo: "ingreso", base: money(hour), formula: "valor hora × 0.25 × horas nocturnas", cantidad: novelties.night.toString(), tasa: "0.25", resultado: money(night), fuenteId: "F-CODIGO-TRABAJO" },
      { codigo: "BONO", nombre: "Bono remunerativo", tipo: "ingreso", base: money(novelties.bonus), formula: "valor autorizado", cantidad: "1", tasa: "1.00", resultado: money(novelties.bonus), fuenteId: "F-CODIGO-TRABAJO" },
      { codigo: "IESS-P", nombre: "Aporte personal IESS", tipo: "descuento", base: money(contributable), formula: "base aportable × 9.45%", cantidad: "1", tasa: personalRate.toString(), resultado: money(iessPersonal), fuenteId: "F-IESS-APORTES" },
      { codigo: "ANT", nombre: "Anticipo autorizado", tipo: "descuento", base: money(novelties.advance), formula: "valor autorizado", cantidad: "1", tasa: "1.00", resultado: money(novelties.advance), fuenteId: "F-AUTORIZACION" },
      { codigo: "IESS-E", nombre: "Aporte patronal IESS", tipo: "obligacion", base: money(contributable), formula: "base aportable × 11.15%", cantidad: "1", tasa: employerRate.toString(), resultado: money(iessEmployer), fuenteId: "F-IESS-APORTES" },
      { codigo: "D13", nombre: "Décimo tercero devengado", tipo: worker.decimoTercero === "Mensual" ? "ingreso" : "acumulacion", base: money(contributable), formula: "remuneración computable / 12", cantidad: "1", tasa: "0.0833333333", resultado: money(d13), fuenteId: "F-CODIGO-TRABAJO" },
      { codigo: "D14", nombre: "Décimo cuarto devengado", tipo: worker.decimoCuarto === "Mensual" ? "ingreso" : "acumulacion", base: money(sbu), formula: "SBU / 12 × fracción del mes", cantidad: paidDays.div(30).toString(), tasa: "0.0833333333", resultado: money(d14), fuenteId: "F-CODIGO-TRABAJO" },
      { codigo: "FR", nombre: "Fondo de reserva", tipo: worker.fondoReserva === "Pago directo" && oneYear ? "ingreso" : "acumulacion", base: money(contributable), formula: oneYear ? "base aportable × 8.33%" : "no cumple un año", cantidad: "1", tasa: oneYear ? reserveRate.toString() : "0", resultado: money(reserve), fuenteId: "F-CODIGO-TRABAJO" },
      { codigo: "VAC", nombre: "Provisión de vacaciones", tipo: "provision", base: money(contributable), formula: "remuneración computable / 24", cantidad: "1", tasa: "0.0416666667", resultado: money(vacationProvision), fuenteId: "F-CODIGO-TRABAJO" },
    ];

    const paidBenefits = concepts.filter((row) => row.tipo === "ingreso" && ["D13", "D14", "FR"].includes(row.codigo)).reduce((sum, row) => sum.plus(row.resultado), d(0));
    const gross = contributable.plus(paidBenefits);
    const discounts = iessPersonal.plus(novelties.advance);
    const net = gross.minus(discounts);
    const accruals = concepts.filter((row) => row.tipo === "acumulacion" || row.tipo === "provision").reduce((sum, row) => sum.plus(row.resultado), d(0));

    return {
      id: `ROL-${periodId}-${worker.id}`,
      versionCalculo: 1,
      periodoId: periodId,
      trabajadorId: worker.id,
      estado: "calculado",
      conceptos: concepts,
      totales: {
        remuneracionAportable: money(contributable),
        remuneracionBruta: money(gross),
        beneficiosPagadosDirectos: money(paidBenefits),
        descuentos: money(discounts),
        netoProvisional: money(net),
        obligacionesPatronales: money(iessEmployer),
        provisionesYAcumulaciones: money(accruals),
        costoDevengado: money(contributable.plus(iessEmployer).plus(d13).plus(d14).plus(reserve).plus(vacationProvision)),
        desembolso: money(net.plus(iessEmployer)),
      },
      alertas: [
        "Retención de impuesto a la renta: cálculo definitivo requiere proyección anual y rebaja por gastos personales.",
        ...(novelties.supp.plus(novelties.extra).gt(0) && data.novedades.some((row) => row.trabajadorId === worker.id && !row.aprobada)
          ? ["Existen horas trabajadas sin aprobación; se incluyen para pago y se envían a revisión."]
          : []),
      ],
    };
  });

  return roles;
}

export { money };
