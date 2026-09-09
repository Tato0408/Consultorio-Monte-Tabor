import { Download, Calendar, Loader2, ArrowLeftRight } from "lucide-react";

// Mes máximo seleccionable: el mes actual. No tiene sentido pedir datos
// de un mes que todavía no ha pasado.
const currentMonthStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const MAX_MONTH_STR = currentMonthStr();

const AVG_OPTIONS = [
  { value: "previous", label: "Promedio de meses anteriores" },
  { value: "next", label: "Promedio de meses posteriores" },
  { value: "all", label: "Promedio de todos los meses" },
];

// Encabezado compartido por las cuatro páginas de reportes. El filtro es
// por mes: un primer mes y, como segundo término de comparación, otro mes
// o un promedio (anteriores, posteriores o todos). El botón "General"
// muestra el histórico completo sin comparación y es el estado inicial.
//
// Props: monthA, monthB ("YYYY-MM"), avgMode (null | "previous" | "next" |
// "all"), isGeneral, y los manejadores onChangeMonthA, onChangeMonthB,
// onChangeAvgMode, onSelectGeneral, onExport.
const ReportHeader = ({
  title,
  subtitle,
  breadcrumb,
  monthA,
  monthB,
  avgMode,
  isGeneral,
  onChangeMonthA,
  onChangeMonthB,
  onChangeAvgMode,
  onSelectGeneral,
  onExport,
  exporting,
  disableExport = false,
}) => {
  const usingAverage = !!avgMode;

  return (
    <div className="space-y-4">
      {/* Breadcrumb + título + exportar */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          {breadcrumb && (
            <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
              <span>Reportes</span>
              <span className="text-gray-300">›</span>
              <span className="text-gray-700 font-medium">{breadcrumb}</span>
            </div>
          )}
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-slate-400 mt-1">{subtitle}</p>}
        </div>

        {/* La clase sm:mt-8 alinea el botón con el de Guardar cambios de
            Horarios, para que no choque con la campana de notificaciones
            (fixed, ver MainLayout.jsx). Este encabezado lo comparten las
            cuatro páginas de reportes. */}
        <button
          type="button"
          onClick={onExport}
          disabled={exporting || disableExport}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-colors disabled:opacity-60 sm:mt-8 self-start"
        >
          {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {exporting ? "Generando..." : "Exportar"}
        </button>
      </div>

      {/* Filtro por mes y botón de reporte general. El recuadro se resalta
          en azul cuando hay una comparación activa. */}
      <div className="flex flex-col sm:flex-row sm:justify-end items-stretch sm:items-center gap-2">
        <div
          className={`flex flex-wrap items-center gap-2 border rounded-xl px-3 py-2 shadow-sm transition-colors w-full sm:w-auto ${
            isGeneral ? "border-slate-200 bg-white" : "border-blue-200 bg-blue-50/40"
          }`}
        >
          <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <input
            type="month"
            max={MAX_MONTH_STR}
            value={monthA || ""}
            onChange={(e) => onChangeMonthA(e.target.value)}
            className="text-xs font-semibold text-slate-700 outline-none bg-transparent"
          />

          <span className="text-xs text-slate-400 flex-shrink-0">vs</span>

          {usingAverage ? (
            <select
              value={avgMode}
              onChange={(e) => onChangeAvgMode(e.target.value)}
              className="text-xs font-semibold text-slate-700 outline-none bg-transparent"
            >
              {AVG_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          ) : (
            <input
              type="month"
              max={MAX_MONTH_STR}
              value={monthB || ""}
              onChange={(e) => onChangeMonthB(e.target.value)}
              className="text-xs font-semibold text-slate-700 outline-none bg-transparent"
            />
          )}

          <button
            type="button"
            title={usingAverage ? "Comparar contra otro mes" : "Comparar contra un promedio"}
            onClick={() => onChangeAvgMode(usingAverage ? "" : "previous")}
            className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 flex-shrink-0"
          >
            <ArrowLeftRight className="w-3 h-3" />
            {usingAverage ? "Otro mes" : "Promedio"}
          </button>
        </div>

        <button
          type="button"
          onClick={onSelectGeneral}
          className={`text-xs font-semibold px-4 py-2.5 rounded-xl border transition-colors shadow-sm ${
            isGeneral
              ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
          }`}
        >
          General
        </button>
      </div>
    </div>
  );
};

export default ReportHeader;
