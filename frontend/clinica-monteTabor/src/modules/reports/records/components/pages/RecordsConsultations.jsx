import { useState } from "react";
import {
  Calendar, ChevronLeft, ChevronRight, ChevronDown, Trash2,
} from "lucide-react";
import { Badge, Card } from "../global/ui";

// Mismos estados y etiquetas que la tabla de Consultas (AppointmentTable.jsx), para que el
// badge diga y se vea igual sin importar desde dónde se mire una cita. pending/
// needs_reschedule/expired quedan como resguardo por si algún dato inesperado llegara
// igual (ver el mismo comentario en AppointmentTable.jsx) — usePatientRecordDetail.js ya
// no pide esos estados al backend, nunca deberían aparecer acá en la práctica.
const ESTADO_STYLES = {
  pending:   { label: "Agendado (sin confirmar)", tone: "gray" },
  scheduled: { label: "En espera", tone: "blue" },
  atendido:  { label: "Atendido", tone: "green" },
  cancelled: { label: "Cancelado", tone: "red" },
  no_show:   { label: "No se presentó", tone: "gray" },
  needs_reschedule: { label: "Por reagendar", tone: "gray" },
  expired:   { label: "Vencida", tone: "gray" },
};

// Mismas pestañas y mismo criterio que la tabla de Consultas (AppointmentTable.jsx): una
// cita que nadie aceptó no es una consulta real, así que no tiene pestaña propia acá
// tampoco — "Todos" ya no incluye pending/needs_reschedule/expired.
const TABS = [
  { key: "todos", label: "Todos" },
  { key: "atendido", label: "Atendido" },
  { key: "scheduled", label: "En espera" },
  { key: "cancelled", label: "Cancelado" },
  { key: "no_show", label: "No presentado" },
];

const matchesTab = (estado, tabKey) => {
  if (tabKey === "todos") return true;
  return estado === tabKey;
};

const MIN_FILTER_YEAR = 2000;
const MAX_FILTER_DATE = `${new Date().getFullYear() + 1}-12-31`;

// Espera que patient.consultas sea una lista de objetos con id, hora,
// paciente, medico, estado y _fecha.
const ConsultasDelDia = ({
  patient = {},
  onContinuar,
  onVerRegistro,
  onEliminar,
  canAttend = false,
  canDelete = false,
  deletingId = null,
}) => {
  const consultas = patient.consultas ?? [];
  const enEspera = consultas.filter((c) => c.estado === "scheduled").length;
  const atendidas = consultas.filter((c) => c.estado === "atendido").length;

  const [desde, setDesde]     = useState("");
  const [hasta, setHasta]     = useState("");
  const [tab, setTab]         = useState("todos");
  const [filas, setFilas]     = useState(8);
  const [pagina, setPagina]   = useState(1);

  // Filtrado en memoria sobre lo ya cargado (no dispara requests nuevas).
  const filtradas = consultas.filter((c) => {
    if (!matchesTab(c.estado, tab)) return false;
    if (!c._fecha) return !desde && !hasta;
    const fecha = new Date(c._fecha);
    if (desde && fecha < new Date(`${desde}T00:00:00`)) return false;
    if (hasta && fecha > new Date(`${hasta}T23:59:59`)) return false;
    return true;
  });

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / filas));
  const inicio = (pagina - 1) * filas;
  const filasPagina = filtradas.slice(inicio, inicio + filas);

  const inputCls =
    "border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 " +
    "focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300";

  return (
    <Card className="space-y-6">

      {/* Título de filtro por fechas */}
      <div className="flex items-center gap-2 text-slate-700 font-medium text-sm">
        <Calendar size={16} className="text-blue-600" />
        Filtro por fechas
      </div>

      {/* Controles de filtro */}
      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">Desde</span>
          <input
            type="date"
            min={`${MIN_FILTER_YEAR}-01-01`}
            max={MAX_FILTER_DATE}
            value={desde}
            onChange={(e) => {
              const val = e.target.value;
              // Corta un año de más de 4 dígitos antes de que entre al estado del filtro.
              if (val && val.length !== 10) return;
              if (val && (val < `${MIN_FILTER_YEAR}-01-01` || val > MAX_FILTER_DATE)) return;
              setDesde(val);
              setPagina(1);
            }}
            className={inputCls}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">Hasta</span>
          <input
            type="date"
            min={`${MIN_FILTER_YEAR}-01-01`}
            max={MAX_FILTER_DATE}
            value={hasta}
            onChange={(e) => {
              const val = e.target.value;
              if (val && val.length !== 10) return;
              if (val && (val < `${MIN_FILTER_YEAR}-01-01` || val > MAX_FILTER_DATE)) return;
              setHasta(val);
              setPagina(1);
            }}
            className={inputCls}
          />
        </label>
      </div>

      {/* Tabs de estado, mismo criterio que AppointmentTable.jsx */}
      <div className="flex items-center gap-1 border-b border-slate-100 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => { setTab(t.key); setPagina(1); }}
            className={`px-3 py-2 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
              tab === t.key
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Resumen del día */}
      <div className="flex items-center gap-6 border-b border-slate-100 pb-3">
        <span className="text-sm font-semibold text-slate-800">Consultas registradas</span>
        <span className="flex items-center gap-2 text-sm text-slate-600">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> {enEspera} En espera
        </span>
        <span className="flex items-center gap-2 text-sm text-slate-600">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500" /> {atendidas} Atendidas
        </span>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        {/* Anchos por columna vía colgroup (no table-fixed parejo): Paciente/Médico
            necesitan más espacio que Hora/Estado/Acciones. min-w-[720px] (igual que la
            tabla de Consultas, AppointmentTable.jsx) evita que, en un celular angosto, el
            badge de Estado o los botones de Acciones se compriman hasta desbordarse sobre
            la columna vecina — si no caben, entra a jugar el scroll horizontal en su lugar. */}
        <table className="w-full min-w-[720px] text-sm table-fixed">
          <colgroup>
            <col className="w-[70px]" />
            <col className="w-[170px]" />
            <col className="w-[170px]" />
            <col className="w-[160px]" />
            <col className="w-[150px]" />
          </colgroup>
          <thead>
            <tr className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              <th className="py-2.5 px-2 font-semibold text-center">Hora</th>
              <th className="py-2.5 px-2 font-semibold text-center">Paciente</th>
              <th className="py-2.5 px-2 font-semibold text-center">Médico atendiendo</th>
              <th className="py-2.5 px-2 font-semibold text-center">Estado</th>
              <th className="py-2.5 px-2 font-semibold text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filasPagina.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-sm text-slate-400">
                  No hay consultas para mostrar.
                </td>
              </tr>
            )}
            {filasPagina.map((c) => {
              const est = ESTADO_STYLES[c.estado] || { label: c.estado, tone: "gray" };
              const atendido = c.estado === "atendido";
              const noDisponible = c.estado === "cancelled" || c.estado === "no_show";
              return (
                <tr key={c.id} className="border-t border-slate-100">
                  <td className="py-4 px-2 text-center text-slate-700 whitespace-nowrap">{c.hora}</td>
                  <td className="py-4 px-2 text-center text-slate-700">
                    <span className="block truncate" title={c.paciente}>{c.paciente}</span>
                  </td>
                  <td className="py-4 px-2 text-center text-slate-700">
                    <span className="block truncate" title={c.medico}>{c.medico}</span>
                  </td>
                  {/* Sin whitespace-nowrap a propósito: con table-fixed, el ancho de esta
                      columna es fijo pase lo que pase (a diferencia de un flex/grid, no se
                      ensancha solo por su contenido) — forzar una sola línea en una
                      etiqueta larga ("Agendado (sin confirmar)") la hacía desbordarse
                      sobre la columna de Acciones, tapando el botón "Continuar". Dejarla
                      envolver en 2 líneas queda contenida dentro de su propia columna. */}
                  <td className="py-4 px-2 text-center">
                    <Badge tone={est.tone} className="whitespace-normal text-center">{est.label}</Badge>
                  </td>
                  <td className="py-4 px-2 text-center">
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      {atendido ? (
                        <button
                          onClick={() => onVerRegistro?.(c)}
                          className="border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-medium px-4 py-1.5 rounded-lg"
                        >
                          Ver
                        </button>
                      ) : noDisponible ? (
                        <>
                          <span className="text-xs text-slate-400 italic whitespace-nowrap">No disponible</span>
                          {canDelete && (
                            <button
                              onClick={() => onEliminar?.(c)}
                              disabled={deletingId === c.id}
                              title="Eliminar cita"
                              className="text-slate-400 hover:text-red-600 p-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </>
                      ) : canAttend ? (
                        <button
                          onClick={() => onContinuar?.(c)}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-1.5 rounded-lg"
                        >
                          Continuar
                        </button>
                      ) : null}
                      {atendido && canDelete && (
                        <button
                          onClick={() => onEliminar?.(c)}
                          disabled={deletingId === c.id}
                          title="Eliminar consulta"
                          className="text-slate-400 hover:text-red-600 p-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-100">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          Filas por página
          <div className="relative">
            <select
              value={filas}
              onChange={(e) => { setFilas(Number(e.target.value)); setPagina(1); }}
              className="appearance-none border border-slate-200 rounded-lg pl-3 pr-8 py-1.5 text-slate-700 focus:outline-none"
            >
              {[8, 16, 24, 32].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <button
            disabled={pagina === 1}
            onClick={() => setPagina((p) => Math.max(1, p - 1))}
            className="flex items-center gap-1 text-slate-400 hover:text-slate-600 disabled:opacity-40"
          >
            <ChevronLeft size={16} /> Anterior
          </button>
          <span className="text-slate-600">
            <span className="font-semibold text-slate-800">{pagina}</span> de {totalPaginas}
          </span>
          <button
            disabled={pagina === totalPaginas}
            onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
            className="flex items-center gap-1 text-slate-400 hover:text-slate-600 disabled:opacity-40"
          >
            Siguiente <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </Card>
  );
};

export default ConsultasDelDia;