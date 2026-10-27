"use client";

import {
  BadgeDollarSign,
  BriefcaseBusiness,
  Calculator,
  CalendarDays,
  Check,
  ChevronDown,
  CircleAlert,
  Download,
  Database,
  FileJson,
  FileText,
  Gauge,
  GitBranch,
  Landmark,
  Menu,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  TableProperties,
  Upload,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Row = Record<string, unknown>;
type Worker = {
  id: string;
  nombre: string;
  cargoId: string;
  departamentoId: string;
  ubicacion: string;
  regionDecimoCuarto: string;
  fechaIngreso: string;
  sueldo: string;
  estado: string;
  modalidad: string;
  decimoTercero: string;
  decimoCuarto: string;
  fondoReserva: string;
  identificacionDemo: string;
};
type Data = {
  version: number;
  updatedAt: string;
  empresa: Row;
  parametrosLegales: Row[];
  fuentesNormativas: Row[];
  escalasOcupacionales: Row[];
  minimosSectoriales: Row[];
  bandasInternas: Row[];
  departamentos: Row[];
  cargos: Row[];
  trabajadores: Worker[];
  contratos: Row[];
  historialSalarial: Row[];
  horarios: Row[];
  feriados: Row[];
  novedades: Row[];
  periodos: Row[];
  rolesPago: Row[];
  acumuladosBeneficios: Row[];
  pagosBeneficios: Row[];
  vacaciones: Row[];
  utilidades: Row[];
  usuarios: Row[];
  auditoria: Row[];
  [key: string]: unknown;
};

const NAV = [
  ["resumen", "Resumen", Gauge],
  ["trabajadores", "Trabajadores", Users],
  ["cargos", "Cargos y organigrama", GitBranch],
  ["escala", "Escala salarial", BadgeDollarSign],
  ["novedades", "Novedades", CalendarDays],
  ["nomina", "Nómina", Calculator],
  ["beneficios", "Beneficios", Landmark],
  ["reportes", "Reportes", FileText],
  ["parametros", "Parámetros", Settings2],
  ["respaldo", "Base de datos", Database],
] as const;

const money = new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" });
const fmtMoney = (value: unknown) => money.format(Number(value ?? 0));
const fmtDate = (value: unknown) => {
  if (!value) return "—";
  const date = new Date(String(value).length === 10 ? `${value}T12:00:00` : String(value));
  return new Intl.DateTimeFormat("es-EC", { dateStyle: "medium", timeZone: "America/Guayaquil" }).format(date);
};
const val = (row: Row, key: string) => String(row[key] ?? "");

function Tag({ children, tone }: { children: React.ReactNode; tone?: string }) {
  return <span className={`tag ${tone ?? String(children).toLowerCase().replaceAll(" ", "-")}`}>{children}</span>;
}

function Empty({ title, copy }: { title: string; copy: string }) {
  return (
    <div className="empty">
      <FileText aria-hidden="true" />
      <strong>{title}</strong>
      <p>{copy}</p>
    </div>
  );
}

export function Dashboard() {
  const [data, setData] = useState<Data | null>(null);
  const [section, setSection] = useState("resumen");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const closeMenuButton = useRef<HTMLButtonElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/data", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message ?? "No se pudieron leer los datos.");
      setData(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de lectura");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!menuOpen) return;
    window.requestAnimationFrame(() => closeMenuButton.current?.focus());
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        window.requestAnimationFrame(() => menuButton.current?.focus());
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  async function save(next: Data, operation: string) {
    if (!data) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/data", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "If-Match": String(data.version) },
        body: JSON.stringify({ data: next, operation, actor: "admin.demo" }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(response.status === 409 ? "Los datos cambiaron en otra operación. Recargue y vuelva a intentar." : body.message ?? "No se pudo guardar.");
      setData(body);
      setToast("Cambios guardados en Neon");
      window.setTimeout(() => setToast(""), 3500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  }

  async function payrollAction(action: string) {
    if (!data) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, periodId: "PER-2026-10", expectedVersion: data.version, actor: "nomina.demo" }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message ?? "No se pudo cambiar el estado de la nómina.");
      setData(body);
      setToast(action === "calculate" ? "Nómina recalculada sin duplicar movimientos" : "Estado actualizado con auditoría");
      window.setTimeout(() => setToast(""), 3500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo procesar");
    } finally {
      setBusy(false);
    }
  }

  const activeLabel = NAV.find(([id]) => id === section)?.[1] ?? "Resumen";
  const closeMenu = () => {
    setMenuOpen(false);
    window.requestAnimationFrame(() => menuButton.current?.focus());
  };

  return (
    <div className="app-shell">
      <aside id="primary-navigation" className={`sidebar ${menuOpen ? "open" : ""}`}>
        <div className="brand">
          <div className="brand-mark" aria-hidden="true"><span>V</span></div>
          <div><strong>Vigente</strong><small>Remuneraciones</small></div>
          <button ref={closeMenuButton} className="icon-btn close-menu" onClick={closeMenu} aria-label="Cerrar menú"><X /></button>
        </div>
        <nav aria-label="Navegación principal">
          {NAV.map(([id, label, Icon]) => (
            <button key={id} className={section === id ? "active" : ""} aria-current={section === id ? "page" : undefined} onClick={() => { setSection(id); closeMenu(); }}>
              <Icon aria-hidden="true" /><span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <ShieldCheck aria-hidden="true" />
          <div><strong>Neon Postgres</strong><small>Base de datos · versión {data?.version ?? "—"}</small></div>
        </div>
      </aside>

      {menuOpen && <button className="menu-backdrop" onClick={closeMenu} aria-label="Cerrar menú" />}

      <main className="main" inert={menuOpen ? true : undefined} aria-hidden={menuOpen ? true : undefined}>
        <header className="topbar">
          <div className="title-wrap">
            <button ref={menuButton} className="icon-btn menu-btn" onClick={() => setMenuOpen(true)} aria-label="Abrir menú" aria-expanded={menuOpen} aria-controls="primary-navigation"><Menu /></button>
            <div><h1>{activeLabel}</h1><p>Octubre 2026 · Quito, Ecuador</p></div>
          </div>
          <div className="top-actions">
            <Tag tone="simulado">Simulado</Tag>
            <button className="icon-btn" onClick={() => void load()} disabled={loading} aria-label="Actualizar datos"><RefreshCw className={loading ? "spin" : ""} /></button>
            <div className="user-chip"><span>AV</span><div><strong>Administración</strong><small>Administrador</small></div></div>
          </div>
        </header>

        <div className="content">
          {error && <div className="alert error" role="alert"><CircleAlert /><span>{error}</span><button onClick={() => setError("")} aria-label="Cerrar alerta"><X /></button></div>}
          {toast && <div className="toast" role="status"><Check />{toast}</div>}
          {loading && !data ? <LoadingState /> : data ? (
            <>
              {section === "resumen" && <Summary data={data} setSection={setSection} />}
              {section === "trabajadores" && <Workers data={data} save={save} busy={busy} />}
              {section === "cargos" && <Positions data={data} />}
              {section === "escala" && <SalaryScale data={data} />}
              {section === "novedades" && <Novelties data={data} save={save} busy={busy} />}
              {section === "nomina" && <Payroll data={data} act={payrollAction} busy={busy} />}
              {section === "beneficios" && <Benefits data={data} />}
              {section === "reportes" && <Reports data={data} />}
              {section === "parametros" && <Parameters data={data} />}
              {section === "respaldo" && <DatabaseSettings data={data} onImported={setData} />}
            </>
          ) : <Recovery error={error} onRecovered={load} />}
        </div>
      </main>
    </div>
  );
}

function LoadingState() {
  return <div className="loading-stack" aria-busy="true"><div className="skeleton skeleton-line" /><div className="skeleton skeleton-panel" /><div className="skeleton skeleton-panel short" /></div>;
}

function Summary({ data, setSection }: { data: Data; setSection: (section: string) => void }) {
  const roles = data.rolesPago;
  const total = (field: string) => roles.reduce((sum, row) => sum + Number((row.totales as Row | undefined)?.[field] ?? 0), 0);
  const period = data.periodos[0];
  const pendingSources = data.fuentesNormativas.filter((row) => row.estado === "Pendiente" || row.estado === "Referencia académica").length;
  const periodState = val(period, "estado") || "borrador";
  const steps = ["borrador", "calculado", "aprobado", "pagado", "cerrado"];
  const current = Math.max(0, steps.indexOf(periodState));

  return (
    <div className="page-stack">
      <section className="map-board">
        <div className="board-intro">
          <div><h2>La nómina, de entrada a cierre</h2><p>Cada parada conserva su evidencia. El trazo marca el estado real del período, sin confundir cálculo, aprobación y pago.</p></div>
          <button className="primary" onClick={() => setSection("nomina")}><Calculator />Abrir nómina</button>
        </div>
        <ol className="route" style={{ "--progress": current } as React.CSSProperties & { "--progress": number }} aria-label={`Flujo de nómina: ${periodState}`}>
          {steps.map((step, index) => <li key={step} aria-current={index === current ? "step" : undefined} className={`route-stop ${index <= current ? "done" : ""} ${index === current ? "current" : ""}`}><span>{index < current ? <Check aria-hidden="true" /> : index + 1}</span><strong>{step[0].toUpperCase() + step.slice(1)}</strong>{index === current && <span className="sr-only">Paso actual</span>}</li>)}
        </ol>
      </section>

      <section className="metric-strip" aria-label="Resumen del período">
        <div><small>Personas activas</small><strong>{data.trabajadores.filter((w) => w.estado === "activo").length}</strong><span>Relación de dependencia</span></div>
        <div><small>Neto provisional</small><strong>{roles.length ? fmtMoney(total("netoProvisional")) : "Pendiente"}</strong><span>{roles.length ? `${roles.length} roles calculados` : "Calcule el borrador"}</span></div>
        <div><small>Costo devengado</small><strong>{roles.length ? fmtMoney(total("costoDevengado")) : "Pendiente"}</strong><span>Incluye obligaciones y provisiones</span></div>
        <div><small>Evidencia por revisar</small><strong>{pendingSources}</strong><span>Referencias pendientes o académicas</span></div>
      </section>

      <div className="split-grid">
        <section className="panel">
          <div className="panel-head"><div><h2>Control del período</h2><p>Octubre 2026</p></div><Tag tone={periodState}>{periodState}</Tag></div>
          <div className="check-list">
            <div><span className="check-icon done"><Check /></span><div><strong>Datos contractuales</strong><small>6 contratos indefinidos activos</small></div></div>
            <div><span className="check-icon done"><Check /></span><div><strong>Novedades revisadas</strong><small>{data.novedades.length} movimientos demostrativos</small></div></div>
            <div><span className={`check-icon ${roles.length ? "done" : "pending"}`}>{roles.length ? <Check /> : <Calculator />}</span><div><strong>Cálculo reproducible</strong><small>{roles.length ? `Versión ${val(period, "versionCalculo")}` : "Aún no ejecutado"}</small></div></div>
            <div><span className="check-icon warning"><CircleAlert /></span><div><strong>Retención IR</strong><small>Pendiente de proyección y gastos personales</small></div></div>
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><div><h2>Pisos y sueldos</h2><p>Lecturas distintas, sin mezclarlas</p></div><button className="text-btn" onClick={() => setSection("escala")}>Ver escala</button></div>
          <div className="salary-layers">
            <div><span>1</span><div><strong>SBU general</strong><small>Piso general confirmado</small></div><b>$482,00</b></div>
            <div><span>2</span><div><strong>Mínimo sectorial</strong><small>Ocupación TIC por verificar</small></div><b>Pendiente</b></div>
            <div><span>3</span><div><strong>Banda interna</strong><small>Decisión simulada de Vigente</small></div><b>$650–2.900</b></div>
          </div>
        </section>
      </div>
    </div>
  );
}

function Recovery({ error, onRecovered }: { error: string; onRecovered: () => Promise<void> }) {
  return <section className="recovery"><CircleAlert /><h2>Neon necesita atención</h2><p>{error || "No se pudo consultar la base de datos."}</p><p>Compruebe las variables <code>DATABASE_URL</code> y <code>DATABASE_URL_UNPOOLED</code>, y ejecute las migraciones y la carga inicial.</p><button className="primary" onClick={() => void onRecovered()}><RefreshCw />Reintentar conexión</button></section>;
}

function Workers({ data, save, busy }: { data: Data; save: (data: Data, op: string) => Promise<void>; busy: boolean }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("todos");
  const [editing, setEditing] = useState<Worker | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const positions = Object.fromEntries(data.cargos.map((row) => [String(row.id), row]));
  const filtered = data.trabajadores.filter((worker) => (status === "todos" || worker.estado === status) && `${worker.nombre} ${worker.id} ${val(positions[worker.cargoId], "nombre")}`.toLowerCase().includes(query.toLowerCase()));

  function open(worker: Worker) { setEditing({ ...worker }); window.setTimeout(() => dialog.current?.showModal(), 0); }
  function openNew() {
    const nextNumber = data.trabajadores.reduce((highest, worker) => {
      const number = Number(worker.id.match(/^VIG-(\d+)$/)?.[1] ?? 0);
      return Math.max(highest, number);
    }, 0) + 1;
    const id = `VIG-${String(nextNumber).padStart(3, "0")}`;
    setEditing({
      id,
      nombre: "",
      cargoId: String(data.cargos[0]?.id ?? ""),
      departamentoId: String(data.departamentos[0]?.id ?? ""),
      ubicacion: "Quito",
      regionDecimoCuarto: "Sierra/Amazonía",
      fechaIngreso: new Date().toISOString().slice(0, 10),
      sueldo: "650.00",
      estado: "activo",
      modalidad: "Presencial",
      decimoTercero: "Mensual",
      decimoCuarto: "Mensual",
      fondoReserva: "No cumple antigüedad",
      identificacionDemo: `DEMO-${id}`,
    });
    window.setTimeout(() => dialog.current?.showModal(), 0);
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!editing) return;
    const exists = data.trabajadores.some((worker) => worker.id === editing.id);
    const next = {
      ...data,
      trabajadores: exists
        ? data.trabajadores.map((worker) => worker.id === editing.id ? editing : worker)
        : [...data.trabajadores, editing],
    };
    await save(next, `${exists ? "editar" : "crear"}-trabajador-${editing.id}`);
    dialog.current?.close();
  }

  return (
    <div className="page-stack">
      <section className="section-lead"><div><h2>Equipo de Vigente</h2><p>Los datos son ficticios. Los trabajadores con historial se inactivan; no se eliminan.</p></div><button className="primary" onClick={openNew}><Plus />Nuevo trabajador</button></section>
      <div className="toolbar"><label className="search"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nombre, ID o cargo" /></label><select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filtrar por estado"><option value="todos">Todos los estados</option><option value="activo">Activos</option><option value="inactivo">Inactivos</option></select></div>
      <section className="table-wrap">
        <table><thead><tr><th>Trabajador</th><th>Cargo / nivel</th><th>Ingreso</th><th>Modalidad</th><th className="num">Sueldo</th><th>Estado</th><th><span className="sr-only">Acciones</span></th></tr></thead>
          <tbody>{filtered.map((worker) => <tr key={worker.id}><td><div className="person"><span>{worker.nombre.split(" ").map((part) => part[0]).join("").slice(0, 2)}</span><div><strong>{worker.nombre}</strong><small>{worker.id} · {worker.identificacionDemo}</small></div></div></td><td><strong>{val(positions[worker.cargoId], "nombre")}</strong><small className="cell-note">Nivel {val(positions[worker.cargoId], "nivel")}</small></td><td>{fmtDate(worker.fechaIngreso)}</td><td>{worker.modalidad}</td><td className="num money-cell">{fmtMoney(worker.sueldo)}</td><td><Tag tone={worker.estado}>{worker.estado}</Tag></td><td><button className="icon-btn" onClick={() => open(worker)} aria-label={`Editar a ${worker.nombre}`}><Pencil /></button></td></tr>)}</tbody>
        </table>
        {!filtered.length && <Empty title="No hay coincidencias" copy="Cambie la búsqueda o el filtro para volver a ver trabajadores." />}
      </section>
      <dialog ref={dialog} className="dialog" onClose={() => setEditing(null)}>
        {editing && <form onSubmit={submit}><div className="dialog-head"><div><h2>{data.trabajadores.some((worker) => worker.id === editing.id) ? "Editar trabajador" : "Nuevo trabajador"}</h2><p>{editing.id} · identificación demostrativa</p></div><button type="button" className="icon-btn" onClick={() => dialog.current?.close()} aria-label="Cerrar"><X /></button></div><div className="form-grid"><label>Nombre completo<input value={editing.nombre} onChange={(e) => setEditing({ ...editing, nombre: e.target.value })} minLength={3} required /></label><label>Identificación<input value={editing.identificacionDemo} readOnly /></label><label>Cargo<select value={editing.cargoId} onChange={(e) => setEditing({ ...editing, cargoId: e.target.value })} required>{data.cargos.map((cargo) => <option key={String(cargo.id)} value={String(cargo.id)}>{val(cargo, "nombre")}</option>)}</select></label><label>Departamento<select value={editing.departamentoId} onChange={(e) => setEditing({ ...editing, departamentoId: e.target.value })} required>{data.departamentos.map((department) => <option key={String(department.id)} value={String(department.id)}>{val(department, "nombre")}</option>)}</select></label><label>Ubicación<input value={editing.ubicacion} onChange={(e) => setEditing({ ...editing, ubicacion: e.target.value })} minLength={2} required /></label><label>Fecha de ingreso<input type="date" value={editing.fechaIngreso} onChange={(e) => setEditing({ ...editing, fechaIngreso: e.target.value })} required /></label><label>Sueldo mensual<input value={editing.sueldo} onChange={(e) => setEditing({ ...editing, sueldo: e.target.value })} inputMode="decimal" pattern="\d+\.\d{2}" title="Use dos decimales, por ejemplo 650.00" required /></label><label>Modalidad<select value={editing.modalidad} onChange={(e) => setEditing({ ...editing, modalidad: e.target.value })}><option>Presencial</option><option>Híbrida</option><option>Remota</option></select></label><label>Región del décimo cuarto<select value={editing.regionDecimoCuarto} onChange={(e) => setEditing({ ...editing, regionDecimoCuarto: e.target.value })}><option>Sierra/Amazonía</option><option>Costa/Insular</option></select></label><label>Estado<select value={editing.estado} onChange={(e) => setEditing({ ...editing, estado: e.target.value })}><option>activo</option><option>inactivo</option></select></label><label>Décimo tercero<select value={editing.decimoTercero} onChange={(e) => setEditing({ ...editing, decimoTercero: e.target.value })}><option>Mensual</option><option>Acumulado</option></select></label><label>Décimo cuarto<select value={editing.decimoCuarto} onChange={(e) => setEditing({ ...editing, decimoCuarto: e.target.value })}><option>Mensual</option><option>Acumulado</option></select></label><label>Fondo de reserva<select value={editing.fondoReserva} onChange={(e) => setEditing({ ...editing, fondoReserva: e.target.value })}><option>Pago directo</option><option>Acumula en IESS</option><option>No cumple antigüedad</option></select></label></div><div className="dialog-actions"><button type="button" className="secondary" onClick={() => dialog.current?.close()}>Cancelar</button><button className="primary" disabled={busy}>{busy ? "Guardando…" : "Guardar trabajador"}</button></div></form>}
      </dialog>
    </div>
  );
}

function Positions({ data }: { data: Data }) {
  const workers = Object.fromEntries(data.trabajadores.map((row) => [row.id, row]));
  const cargos = Object.fromEntries(data.cargos.map((row) => [String(row.id), row]));
  const chief = data.trabajadores.find((worker) => worker.id === "VIG-001")!;
  const supervisor = data.trabajadores.find((worker) => worker.id === "VIG-002")!;
  const team = data.trabajadores.filter((worker) => !["VIG-001", "VIG-002"].includes(worker.id));
  const Node = ({ worker }: { worker: Worker }) => <div className="org-node"><span>{val(cargos[worker.cargoId], "nivel")}</span><strong>{worker.nombre}</strong><small>{val(cargos[worker.cargoId], "nombre")}</small></div>;
  return <div className="page-stack"><section className="section-lead"><div><h2>Estructura ocupacional</h2><p>La línea de reporte y las fichas de cargo son editables y se guardan en Neon.</p></div><Tag tone="simulado">Propuesta interna</Tag></section><section className="org-chart"><Node worker={chief} /><div className="org-line" /><Node worker={supervisor} /><div className="org-branches">{team.map((worker) => <Node key={worker.id} worker={worker} />)}</div></section><section className="position-list"><div className="panel-head"><div><h2>Fichas de cargo</h2><p>Objetivo, funciones, responsabilidades y criterio salarial</p></div></div>{data.cargos.map((cargo) => <details key={val(cargo, "id")}><summary><div><Tag tone="nivel">{val(cargo, "nivel")}</Tag><strong>{val(cargo, "nombre")}</strong></div><ChevronDown /></summary><div className="position-detail"><div><small>Objetivo</small><p>{val(cargo, "objetivo")}</p></div><div><small>Funciones</small><ul>{(cargo.funciones as string[]).map((item) => <li key={item}>{item}</li>)}</ul></div><div><small>Responsabilidades</small><ul>{(cargo.responsabilidades as string[]).map((item) => <li key={item}>{item}</li>)}</ul></div><div><small>Criterio de sueldo</small><p>{val(cargo, "criterioSueldo")}</p></div></div></details>)}</section><p className="footnote">Responsable del área: {workers["VIG-001"]?.nombre}. La jefatura no excluye automáticamente el pago de horas adicionales.</p></div>;
}

function SalaryScale({ data }: { data: Data }) {
  return <div className="page-stack"><section className="section-lead"><div><h2>Tres capas, una decisión salarial</h2><p>El sueldo pactado se valida contra el mayor piso legal confirmado, sin convertir el mínimo sectorial en techo.</p></div></section><section className="layer-diagram"><div className="layer general"><span>SBU general</span><strong>$482,00</strong><small>Confirmado para 2026</small></div><div className="arrow">→</div><div className="layer sector"><span>Rama y ocupación</span><strong>Pendiente</strong><small>Comisión 12 · TIC</small></div><div className="arrow">→</div><div className="layer internal"><span>Banda + pacto</span><strong>$650–2.900</strong><small>Decisión interna simulada</small></div></section><section className="table-wrap"><table><thead><tr><th>Grupo</th><th>Niveles mostrados</th><th>Función</th><th>Procedencia</th></tr></thead><tbody>{data.escalasOcupacionales.map((row) => <tr key={val(row, "id")}><td><span className="group-letter">{val(row, "grupo")}</span></td><td>{(row.niveles as string[]).join(", ")}</td><td>{val(row, "funcion")}</td><td><Tag>{val(row, "estado")}</Tag></td></tr>)}</tbody></table></section><div className="split-grid"><section className="panel"><div className="panel-head"><div><h2>Referencias TIC 2026</h2><p>No se interpolan importes intermedios</p></div></div>{data.minimosSectoriales.map((row) => <div className="reference-row" key={val(row, "id")}><div><strong>Nivel {val(row, "nivel")}</strong><small>{val(row, "rama")}</small></div><b>{fmtMoney(row.minimo)}</b><Tag>{val(row, "estado")}</Tag></div>)}</section><section className="panel warning-panel"><CircleAlert /><div><h2>Contraste pendiente</h2><p>Falta confirmar la denominación y el código oficial de cada ocupación aplicable. Hasta entonces, la app muestra estas cifras como referencia académica y no certifica cumplimiento sectorial.</p></div></section></div></div>;
}

function Novelties({ data, save, busy }: { data: Data; save: (data: Data, op: string) => Promise<void>; busy: boolean }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ trabajadorId: "VIG-001", tipo: "hora_suplementaria", fecha: "2026-10-21", horas: "1.00", valor: "0.00", inicio: "18:00", fin: "19:00", observacion: "" });
  const workers = Object.fromEntries(data.trabajadores.map((worker) => [worker.id, worker.nombre]));
  async function add(event: React.FormEvent) { event.preventDefault(); const isHour = draft.tipo.includes("hora") || draft.tipo === "recargo_nocturno"; const novelty = { id: `NOV-${crypto.randomUUID()}`, periodoId: "PER-2026-10", trabajadorId: draft.trabajadorId, tipo: draft.tipo, fecha: draft.fecha, ...(isHour ? { horas: draft.horas, inicio: draft.inicio, fin: draft.fin } : { valor: draft.valor }), aprobada: false, observacion: draft.observacion || "Registrada para revisión." }; await save({ ...data, novedades: [...data.novedades, novelty] }, "crear-novedad"); setOpen(false); }
  return <div className="page-stack"><section className="section-lead"><div><h2>Movimientos de octubre</h2><p>Las horas se guardan con fecha, tramo horario, aprobación y evidencia.</p></div><button className="primary" onClick={() => setOpen(!open)}><Plus />Registrar novedad</button></section>{open && <form className="inline-form" onSubmit={add}><div className="form-grid"><label>Trabajador<select value={draft.trabajadorId} onChange={(e) => setDraft({ ...draft, trabajadorId: e.target.value })}>{data.trabajadores.map((worker) => <option key={worker.id} value={worker.id}>{worker.nombre}</option>)}</select></label><label>Tipo<select value={draft.tipo} onChange={(e) => setDraft({ ...draft, tipo: e.target.value })}><option value="hora_suplementaria">Hora suplementaria</option><option value="hora_extraordinaria">Hora extraordinaria</option><option value="recargo_nocturno">Recargo nocturno</option><option value="bono_remunerativo">Bono remunerativo</option><option value="anticipo">Anticipo</option></select></label><label>Fecha<input type="date" value={draft.fecha} onChange={(e) => setDraft({ ...draft, fecha: e.target.value })} required /></label><label>Horas<input value={draft.horas} onChange={(e) => setDraft({ ...draft, horas: e.target.value })} /></label><label>Valor<input value={draft.valor} onChange={(e) => setDraft({ ...draft, valor: e.target.value })} /></label><label>Observación<input value={draft.observacion} onChange={(e) => setDraft({ ...draft, observacion: e.target.value })} /></label></div><div className="dialog-actions"><button type="button" className="secondary" onClick={() => setOpen(false)}>Cancelar</button><button className="primary" disabled={busy}>{busy ? "Guardando…" : "Enviar a revisión"}</button></div></form>}<section className="table-wrap"><table><thead><tr><th>Fecha</th><th>Trabajador</th><th>Novedad</th><th>Tramo / cantidad</th><th>Estado</th><th>Observación</th></tr></thead><tbody>{data.novedades.map((row) => <tr key={val(row, "id")}><td>{fmtDate(row.fecha)}</td><td><strong>{workers[val(row, "trabajadorId")]}</strong><small className="cell-note">{val(row, "trabajadorId")}</small></td><td>{val(row, "tipo").replaceAll("_", " ")}</td><td>{row.horas ? `${val(row, "horas")} h · ${val(row, "inicio")}–${val(row, "fin")}` : fmtMoney(row.valor)}</td><td><Tag tone={row.aprobada ? "verificado" : "pendiente"}>{row.aprobada ? "Aprobada" : "Pendiente"}</Tag></td><td className="wide-cell">{val(row, "observacion")}</td></tr>)}</tbody></table></section></div>;
}

function Payroll({ data, act, busy }: { data: Data; act: (action: string) => Promise<void>; busy: boolean }) {
  const period = data.periodos[0];
  const state = val(period, "estado");
  const workers = Object.fromEntries(data.trabajadores.map((worker) => [worker.id, worker.nombre]));
  const roles = data.rolesPago;
  const total = (field: string) => roles.reduce((sum, row) => sum + Number((row.totales as Row | undefined)?.[field] ?? 0), 0);
  const next = state === "calculado" ? ["approve", "Aprobar"] : state === "aprobado" ? ["pay", "Registrar pago"] : state === "pagado" ? ["close", "Cerrar período"] : null;
  return <div className="page-stack"><section className="payroll-command"><div><div className="period-line"><CalendarDays /><span>01–31 octubre 2026</span><Tag tone={state}>{state}</Tag></div><h2>{roles.length ? fmtMoney(total("netoProvisional")) : "Listo para calcular"}</h2><p>{roles.length ? "Neto provisional del equipo. La retención IR permanece pendiente de datos individuales." : "El recálculo de borrador reemplaza la versión anterior y no duplica movimientos."}</p></div><div className="command-actions"><button className="secondary" onClick={() => void act("calculate")} disabled={busy || !["borrador", "calculado"].includes(state)}><RefreshCw />{roles.length ? "Recalcular" : "Calcular"}</button>{next && <button className="primary" onClick={() => void act(next[0])} disabled={busy}><Check />{next[1]}</button>}</div></section>{roles.length ? <><section className="metric-strip compact"><div><small>Remuneración bruta</small><strong>{fmtMoney(total("remuneracionBruta"))}</strong></div><div><small>Descuentos</small><strong>{fmtMoney(total("descuentos"))}</strong></div><div><small>Obligación patronal</small><strong>{fmtMoney(total("obligacionesPatronales"))}</strong></div><div><small>Costo devengado</small><strong>{fmtMoney(total("costoDevengado"))}</strong></div></section><section className="role-list">{roles.map((role) => { const totals = role.totales as Row; const concepts = role.conceptos as Row[]; return <details key={val(role, "id")}><summary><div><strong>{workers[val(role, "trabajadorId")]}</strong><small>{val(role, "trabajadorId")} · {concepts.length} conceptos</small></div><div className="role-summary"><span>Bruto <b>{fmtMoney(totals.remuneracionBruta)}</b></span><span>Descuentos <b>{fmtMoney(totals.descuentos)}</b></span><span>Neto <b>{fmtMoney(totals.netoProvisional)}</b></span><ChevronDown /></div></summary><div className="role-detail"><table><thead><tr><th>Concepto</th><th>Base y fórmula</th><th className="num">Resultado</th></tr></thead><tbody>{concepts.filter((concept) => Number(concept.resultado) !== 0).map((concept) => <tr key={val(concept, "codigo")}><td><Tag tone={val(concept, "tipo")}>{val(concept, "tipo")}</Tag><strong>{val(concept, "nombre")}</strong></td><td><span>{fmtMoney(concept.base)} · {val(concept, "formula")}</span><small className="cell-note">Cantidad {val(concept, "cantidad")} · tasa {val(concept, "tasa")}</small></td><td className="num money-cell">{fmtMoney(concept.resultado)}</td></tr>)}</tbody></table><div className="role-alert"><CircleAlert /><span>{(role.alertas as string[])[0]}</span></div></div></details>})}</section></> : <Empty title="Aún no hay roles calculados" copy="Revise las novedades y ejecute el cálculo. Cada resultado mostrará base, fórmula, tasa y fuente." />}</div>;
}

function Benefits({ data }: { data: Data }) {
  const items = [{ name: "Décimo tercero", value: "1/12", note: "Remuneraciones computables", status: "Configurado" }, { name: "Décimo cuarto", value: "$40,17", note: "SBU 2026 / 12", status: "Configurado" }, { name: "Fondo de reserva", value: "8,33%", note: "Elegibilidad desde un año", status: "Revisar casos" }, { name: "Vacaciones", value: "15 días", note: "Provisión monetaria 1/24", status: "Saldo pendiente" }];
  return <div className="page-stack"><section className="section-lead"><div><h2>Beneficios y protección</h2><p>Devengo, pago directo, acumulación y provisión se mantienen como movimientos distintos.</p></div></section><section className="benefit-ledger">{items.map((item) => <div key={item.name}><div><strong>{item.name}</strong><small>{item.note}</small></div><b>{item.value}</b><Tag tone={item.status.includes("Config") ? "verificado" : "pendiente"}>{item.status}</Tag></div>)}</section><div className="split-grid"><section className="panel"><div className="panel-head"><div><h2>Saldos históricos</h2><p>No se proyectan como devengado real</p></div></div>{data.acumuladosBeneficios.map((row) => <div className="reference-row" key={val(row, "id")}><div><strong>{val(row, "beneficio")}</strong><small>{val(row, "trabajadorId")}</small></div><b>{row.saldo ? fmtMoney(row.saldo) : "Sin saldo inicial"}</b><Tag>{val(row, "estado")}</Tag></div>)}</section><section className="panel"><div className="panel-head"><div><h2>Utilidades 2026</h2><p>Módulo anual</p></div><Tag tone="pendiente">Pendiente</Tag></div><p className="prose">No existen utilidades líquidas cargadas. El módulo no reparte porcentajes mensuales ni inventa una base. Al registrar el cierre, separará 10% por tiempo y 5% por tiempo y cargas acreditadas.</p></section></div><section className="protection-band"><ShieldCheck /><div><strong>Protección laboral y datos sensibles</strong><p>Licencias, maternidad, paternidad, lactancia, enfermedad e inclusión requieren evidencia y efecto remunerativo verificado. No se recopilan diagnósticos y la cuota de inclusión no se impone a una empresa de seis personas.</p></div></section></div>;
}

function Reports({ data }: { data: Data }) {
  function csv() { const rows = [["ID", "Nombre", "Sueldo", "Modalidad"], ...data.trabajadores.map((w) => [w.id, w.nombre, w.sueldo, w.modalidad])]; const text = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n"); const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" })); const a = document.createElement("a"); a.href = url; a.download = "vigente-trabajadores.csv"; a.click(); URL.revokeObjectURL(url); }
  const reports = ["Rol individual imprimible", "Consolidado mensual", "Aportes IESS separados", "Décimos y reserva", "Vacaciones", "Costo por departamento", "Diferencias frente a pisos", "Auditoría"];
  return <div className="page-stack"><section className="section-lead"><div><h2>Centro de reportes</h2><p>Exportaciones internas para revisión; no ejecutan declaraciones, pagos ni trámites oficiales.</p></div><div className="button-row"><button className="secondary" onClick={csv}><Download />CSV</button><a className="primary button-link" href="/api/export"><FileJson />Instantánea JSON</a></div></section><section className="report-grid">{reports.map((name, index) => <button key={name} disabled={index > 1}><span><TableProperties /></span><div><strong>{name}</strong><small>{index <= 1 ? "Disponible" : "Preparado para datos completos"}</small></div><ChevronDown /></button>)}</section><section className="panel"><div className="panel-head"><div><h2>Auditoría reciente</h2><p>{data.auditoria.length} movimientos registrados</p></div></div><div className="audit-list">{data.auditoria.slice(-6).reverse().map((row) => <div key={val(row, "id")}><span className="audit-dot" /><div><strong>{val(row, "operacion").replaceAll("-", " ")}</strong><small>{val(row, "actor")} · {fmtDate(row.fecha)}</small></div><b>v{val(row, "versionNueva")}</b></div>)}</div></section></div>;
}

function Parameters({ data }: { data: Data }) {
  return <div className="page-stack"><section className="section-lead"><div><h2>Parámetros centralizados</h2><p>Ninguna tasa legal vive dispersa dentro de la interfaz. Cada valor registra vigencia, fuente y estado.</p></div><Tag tone="verificado">{data.parametrosLegales.length} reglas</Tag></section><section className="table-wrap"><table><thead><tr><th>Parámetro</th><th>Valor</th><th>Vigencia</th><th>Fuente</th><th>Estado</th></tr></thead><tbody>{data.parametrosLegales.map((row) => <tr key={val(row, "id")}><td><strong>{val(row, "nombre")}</strong><small className="cell-note">{val(row, "codigo")}</small></td><td className="money-cell">{val(row, "unidad") === "tasa" ? `${Number(row.valor) * 100}%` : val(row, "valor")}</td><td>{fmtDate(row.vigenteDesde)}{row.vigenteHasta ? ` – ${fmtDate(row.vigenteHasta)}` : ""}</td><td>{val(row, "fuenteId")}</td><td><Tag>{val(row, "estado")}</Tag></td></tr>)}</tbody></table></section><section className="source-list"><div className="panel-head"><div><h2>Registro de fuentes</h2><p>Consulta: 27 de octubre de 2026</p></div></div>{data.fuentesNormativas.map((row) => <div key={val(row, "id")}><div className="source-icon"><BriefcaseBusiness /></div><div><strong>{val(row, "titulo")}</strong><small>{val(row, "entidad")} · {val(row, "articulo") || "Sin artículo específico"}</small><p>{val(row, "nota")}</p></div><div><Tag>{val(row, "estado")}</Tag>{row.url ? <a href={String(row.url)} target="_blank" rel="noreferrer">Abrir fuente</a> : <span>Sin archivo adjunto</span>}</div></div>)}</section></div>;
}

type DatabaseState = {
  connected: boolean;
  provider?: string;
  table?: string;
  version?: number | null;
  updatedAt?: string | null;
  latencyMs?: number;
  message?: string;
};

function DatabaseSettings({ data, onImported }: { data: Data; onImported: (data: Data) => void }) {
  const [preview, setPreview] = useState<{ name: string; content: Data } | null>(null);
  const [message, setMessage] = useState("");
  const [database, setDatabase] = useState<DatabaseState>({ connected: false });
  useEffect(() => { fetch("/api/database", { cache: "no-store" }).then((r) => r.json()).then((body) => setDatabase(body)).catch(() => setDatabase({ connected: false, message: "No se pudo consultar el estado." })); }, [data.version]);
  async function pick(event: React.ChangeEvent<HTMLInputElement>) { const file = event.target.files?.[0]; if (!file) return; try { const parsed = JSON.parse(await file.text()) as Data; setPreview({ name: file.name, content: parsed }); setMessage(""); } catch { setMessage("El archivo no contiene JSON válido. No se modificó la fuente actual."); } }
  async function importNow() { if (!preview) return; const response = await fetch("/api/data?mode=import", { method: "PUT", headers: { "Content-Type": "application/json", "If-Match": String(data.version) }, body: JSON.stringify({ data: preview.content }) }); const body = await response.json(); if (!response.ok) { setMessage(body.message ?? "La validación rechazó el archivo."); return; } onImported(body); setPreview(null); setMessage("Importación completada y guardada en Neon."); }
  return <div className="page-stack"><section className="section-lead"><div><h2>Persistencia en Neon Postgres</h2><p>Todas las lecturas y escrituras operativas usan la base de datos conectada a Vercel.</p></div><a className="primary button-link" href="/api/export"><Download />Exportar versión {data.version}</a></section>{message && <div className="alert info"><CircleAlert /><span>{message}</span></div>}<div className="split-grid"><section className="panel import-panel"><Upload /><h2>Importar instantánea JSON</h2><p>JSON queda disponible solo como formato de intercambio. El servidor valida el esquema y guarda el resultado en Neon.</p><label className="file-picker">Elegir archivo<input type="file" accept="application/json,.json" onChange={pick} /></label>{preview && <div className="import-preview"><strong>{preview.name}</strong><span>Esquema v{String(preview.content.schemaVersion ?? "?")} · {preview.content.trabajadores?.length ?? 0} trabajadores · versión declarada {preview.content.version ?? "?"}</span><button className="primary" onClick={() => void importNow()}>Validar y guardar en Neon</button></div>}</section><section className="panel"><div className="panel-head"><div><h2>Integridad</h2><p>Control transaccional</p></div><Tag tone={database.connected ? "verificado" : "pendiente"}>{database.connected ? "Operativo" : "Sin conexión"}</Tag></div><div className="integrity-list"><div><Check /><span>Esquema y referencias validados</span></div><div><Check /><span>Control optimista por versión</span></div><div><Check /><span>Escrituras dentro de transacciones</span></div><div><Check /><span>Credenciales solo en el servidor</span></div></div></section></div><section className="panel"><div className="panel-head"><div><h2>Estado de la base de datos</h2><p>Conexión agrupada para Vercel Functions</p></div><Database /></div><div className="backup-list"><div><span><Database /></span><div><strong>{database.provider ?? "Neon Postgres"}</strong><small>{database.table ?? "public.vigente_state"}</small></div><Tag tone={database.connected ? "verificado" : "pendiente"}>{database.connected ? `${database.latencyMs ?? 0} ms` : "Revisar"}</Tag></div><div><span><GitBranch /></span><div><strong>Versión {database.version ?? data.version}</strong><small>{database.updatedAt ? `Actualizada ${fmtDate(database.updatedAt)}` : database.message ?? "Estado sincronizado con la aplicación"}</small></div><Tag tone="simulado">JSONB</Tag></div></div></section></div>;
}
