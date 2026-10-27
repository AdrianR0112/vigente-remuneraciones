import { z } from "zod";

const money = z.string().regex(/^\d+\.\d{2}$/, "Use dinero con dos decimales, por ejemplo 482.00");
const decimalRate = z.string().regex(/^0(\.\d+)?$|^1(\.0+)?$/, "Use una tasa decimal entre 0 y 1");
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const statusSchema = z.enum(["Verificado", "Referencia académica", "Simulado", "Pendiente"]);

export const workerSchema = z.object({
  id: z.string().min(3),
  nombre: z.string().min(3),
  cargoId: z.string().min(1),
  departamentoId: z.string().min(1),
  ubicacion: z.string().min(2),
  regionDecimoCuarto: z.enum(["Sierra/Amazonía", "Costa/Insular"]),
  fechaIngreso: isoDate,
  sueldo: money,
  estado: z.enum(["activo", "inactivo"]),
  modalidad: z.enum(["Presencial", "Híbrida", "Remota"]),
  decimoTercero: z.enum(["Mensual", "Acumulado"]),
  decimoCuarto: z.enum(["Mensual", "Acumulado"]),
  fondoReserva: z.enum(["Pago directo", "Acumula en IESS", "No cumple antigüedad"]),
  identificacionDemo: z.string().startsWith("DEMO-"),
});

export const noveltySchema = z.object({
  id: z.string().min(3),
  trabajadorId: z.string().min(3),
  periodoId: z.string().min(3),
  tipo: z.enum(["hora_suplementaria", "hora_extraordinaria", "recargo_nocturno", "bono_remunerativo", "anticipo", "permiso"]),
  fecha: isoDate,
  horas: z.string().optional(),
  valor: money.optional(),
  inicio: z.string().optional(),
  fin: z.string().optional(),
  aprobada: z.boolean(),
  observacion: z.string(),
});

const userSchema = z.object({
  id: z.string().min(3),
  nombre: z.string().min(3),
  usuario: z.string().min(3),
  passwordHash: z.string().regex(/^\$2[aby]\$\d{2}\$.{53}$/, "La contraseña debe guardarse como hash bcrypt"),
  rol: z.enum(["administrador", "nomina", "consulta"]),
  estado: z.enum(["activo", "inactivo"]),
});

export const dataSchema = z.object({
  schemaVersion: z.literal(1),
  version: z.number().int().positive(),
  updatedAt: z.string(),
  empresa: z.record(z.string(), z.unknown()),
  parametrosLegales: z.array(z.record(z.string(), z.unknown())),
  fuentesNormativas: z.array(z.record(z.string(), z.unknown())),
  escalasOcupacionales: z.array(z.record(z.string(), z.unknown())),
  minimosSectoriales: z.array(z.record(z.string(), z.unknown())),
  bandasInternas: z.array(z.record(z.string(), z.unknown())),
  departamentos: z.array(z.record(z.string(), z.unknown())),
  cargos: z.array(z.record(z.string(), z.unknown())),
  trabajadores: z.array(workerSchema),
  contratos: z.array(z.record(z.string(), z.unknown())),
  historialSalarial: z.array(z.record(z.string(), z.unknown())),
  horarios: z.array(z.record(z.string(), z.unknown())),
  feriados: z.array(z.record(z.string(), z.unknown())),
  novedades: z.array(noveltySchema),
  periodos: z.array(z.record(z.string(), z.unknown())),
  rolesPago: z.array(z.record(z.string(), z.unknown())),
  acumuladosBeneficios: z.array(z.record(z.string(), z.unknown())),
  pagosBeneficios: z.array(z.record(z.string(), z.unknown())),
  vacaciones: z.array(z.record(z.string(), z.unknown())),
  utilidades: z.array(z.record(z.string(), z.unknown())),
  usuarios: z.array(userSchema),
  auditoria: z.array(z.record(z.string(), z.unknown())),
});

export type VigenteData = z.infer<typeof dataSchema>;
export type Worker = z.infer<typeof workerSchema>;
export type Novelty = z.infer<typeof noveltySchema>;

export function validateData(input: unknown): VigenteData {
  const data = dataSchema.parse(input);
  const ids = new Set<string>();
  const collections = [
    data.trabajadores,
    data.departamentos,
    data.cargos,
    data.novedades,
    data.periodos,
    data.rolesPago,
  ];
  for (const collection of collections) {
    for (const row of collection) {
      const id = typeof row.id === "string" ? row.id : undefined;
      if (!id) continue;
      if (ids.has(id)) throw new Error(`ID duplicado: ${id}`);
      ids.add(id);
    }
  }

  const cargoIds = new Set(data.cargos.map((row) => String(row.id)));
  const departamentoIds = new Set(data.departamentos.map((row) => String(row.id)));
  const trabajadorIds = new Set(data.trabajadores.map((row) => row.id));
  const periodoIds = new Set(data.periodos.map((row) => String(row.id)));
  for (const worker of data.trabajadores) {
    if (!cargoIds.has(worker.cargoId)) throw new Error(`Cargo inexistente para ${worker.id}`);
    if (!departamentoIds.has(worker.departamentoId)) throw new Error(`Departamento inexistente para ${worker.id}`);
  }
  for (const novelty of data.novedades) {
    if (!trabajadorIds.has(novelty.trabajadorId)) throw new Error(`Trabajador inexistente en ${novelty.id}`);
    if (!periodoIds.has(novelty.periodoId)) throw new Error(`Período inexistente en ${novelty.id}`);
  }
  const workerLinkedCollections = [
    data.contratos,
    data.historialSalarial,
    data.rolesPago,
    data.acumuladosBeneficios,
    data.pagosBeneficios,
    data.vacaciones,
  ];
  for (const collection of workerLinkedCollections) {
    for (const row of collection) {
      const workerId = typeof row.trabajadorId === "string" ? row.trabajadorId : undefined;
      if (workerId && !trabajadorIds.has(workerId)) throw new Error(`Trabajador inexistente en ${String(row.id ?? "registro relacionado")}`);
    }
  }
  return data;
}

export function redactSecrets(data: VigenteData) {
  return {
    ...data,
    usuarios: data.usuarios.map(({ passwordHash: _passwordHash, ...user }) => ({ ...user, passwordHash: "[PROTEGIDO]" })),
  };
}

export { money, decimalRate };
