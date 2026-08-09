import { useState } from "react";
import {
  Calendar, Filter, ChevronLeft, ChevronRight, ChevronDown,
} from "lucide-react";
import { Badge, Card } from "../global/ui";

const ESTADO_STYLES = {
  atendido:  { label: "Atendido",  tone: "green" },
  en_espera: { label: "En espera", tone: "blue" },
};

const MIN_FILTER_YEAR = 2000;
const MAX_FILTER_DATE = `${new Date().getFullYear() + 1}-12-31`;

// Espera `patient.consultas` = [{ id, hora, paciente, medico, estado, _fecha }]
const ConsultasDelDia = ({
  patient = {},
  onContinuar,
  onVerRegistro,
  canAttend = false,
}) => {
  const consultas = patient.consultas ?? [];
  const enEspera = consultas.filter((c) => c.estado === "en_espera").length;
  const atendidas = consultas.filter((c) => c.estado === "atendido").length;

  const [desde, setDesde]     = useState("");
  const [hasta, setHasta]     = useState("");
  const [estado, setEstado]   = useState("todos");
  const [filas, setFilas]     = useState(8);
  const [pagina, setPagina]   = useState(1);

  // Filtrado en memoria sobre lo ya cargado (no dispara requests nuevas).
  const filtradas = consultas.filter((c) => {
    if (estado !== "todos" && c.estado !== estado) return false;
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

      {/* Fila de títulos de filtro */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-700 font-medium text-sm">
          <Calendar size={16} className="text-blue-600" />
          Filtro por fechas
        </div>
        <div className="flex items-center gap-2 text-slate-700 font-medium text-sm">
          <Filter size={16} className="text-blue-600" />
          Filtro por estado
        </div>
      </div>

      {/* Controles de filtro */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-end gap-4">
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

        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500 text-right">Estado actual</span>
          <div className="relative">
            <select
              value={estado}
              onChange={(e) => { setEstado(e.target.value); setPagina(1); }}
              className={inputCls + " appearance-none pr-9 min-w-44"}
            >
              <option value="todos">Todos los estados</option>
              <option value="atendido">Atendido</option>
              <option value="en_espera">En espera</option>
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </label>
      </div>

      {/* Resumen del día */}
      <div className="flex items-center gap-6 border-b border-slate-100 pb-3">
        <span className="text-sm font-semibold text-slate-800">Consultas del día</span>
        <span className="flex items-center gap-2 text-sm text-slate-600">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> {enEspera} En espera
        </span>
        <span className="flex items-center gap-2 text-sm text-slate-600">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500" /> {atendidas} Atendidas
        </span>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-400">
              <th className="font-medium pb-3 pr-4">Hora</th>
              <th className="font-medium pb-3 pr-4">Paciente</th>
              <th className="font-medium pb-3 pr-4">Médico atendiendo</th>
              <th className="font-medium pb-3 pr-4 text-center">Estado</th>
              <th className="font-medium pb-3 text-center">Acciones</th>
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
              const est = ESTADO_STYLES[c.estado];
              const atendido = c.estado === "atendido";
              return (
                <tr key={c.id} className="border-t border-slate-100">
                  <td className="py-4 pr-4 text-slate-700 whitespace-nowrap">{c.hora}</td>
                  <td className="py-4 pr-4 text-slate-700">{c.paciente}</td>
                  <td className="py-4 pr-4 text-slate-700">{c.medico}</td>
                  <td className="py-4 pr-4 text-center">
                    <Badge tone={est.tone}>{est.label}</Badge>
                  </td>
                  <td className="py-4 text-center">
                    {atendido ? (
                      <button
                        onClick={() => onVerRegistro?.(c)}
                        className="border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-medium px-4 py-1.5 rounded-lg"
                      >
                        Ver registro
                      </button>
                    ) : canAttend ? (
                      <button
                        onClick={() => onContinuar?.(c)}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-1.5 rounded-lg"
                      >
                        Continuar
                      </button>
                    ) : null}
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