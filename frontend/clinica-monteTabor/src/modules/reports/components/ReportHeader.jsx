import { Download, Calendar, Loader2 } from "lucide-react";

// Límite amplio pero real: evita años absurdos (5+ dígitos) al escribir la fecha a mano.
const MIN_DATE_STR = "2000-01-01";
const MAX_DATE_STR = `${new Date().getFullYear() + 1}-12-31`;

// dateFrom/dateTo: strings "YYYY-MM-DD" (formato nativo de <input type="date">)
// isGeneral: si true, el rango de fechas se ignora y se piden TODOS los datos históricos
// onChangeFrom/onChangeTo/onToggleGeneral: setters controlados por el hook de cada página
// onExport: dispara la generación/descarga del PDF con lo que se está mostrando en pantalla
const ReportHeader = ({
  title,
  subtitle,
  breadcrumb,
  dateFrom,
  dateTo,
  isGeneral,
  onChangeFrom,
  onChangeTo,
  onToggleGeneral,
  onExport,
  exporting,
  disableExport = false,
}) => {
  return (
    <div className="space-y-4">
      {/* Breadcrumb + título + exportar */}
      <div className="flex items-start justify-between">
        <div>
          {breadcrumb && (
            <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
              <span>Reportes</span>
              <span className="text-gray-300">›</span>
              <span className="text-gray-700 font-medium">{breadcrumb}</span>
            </div>
          )}
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-slate-400 mt-1">{subtitle}</p>}
        </div>

        <button
          type="button"
          onClick={onExport}
          disabled={exporting || disableExport}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-colors disabled:opacity-60"
        >
          {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {exporting ? "Generando..." : "Exportar"}
        </button>
      </div>

      {/* Filtro de rango de fechas + botón de reporte general */}
      <div className="flex justify-end items-center gap-2 flex-wrap">
        <div className={`flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2 bg-white shadow-sm transition-opacity ${isGeneral ? "opacity-40 pointer-events-none" : ""}`}>
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <input
            type="date"
            min={MIN_DATE_STR}
            max={MAX_DATE_STR}
            value={dateFrom || ""}
            onChange={(e) => onChangeFrom(e.target.value)}
            disabled={isGeneral}
            className="text-xs font-semibold text-slate-700 outline-none bg-transparent"
          />
          <span className="text-xs text-slate-400">–</span>
          <input
            type="date"
            min={MIN_DATE_STR}
            max={MAX_DATE_STR}
            value={dateTo || ""}
            onChange={(e) => onChangeTo(e.target.value)}
            disabled={isGeneral}
            className="text-xs font-semibold text-slate-700 outline-none bg-transparent"
          />
        </div>

        <button
          type="button"
          onClick={onToggleGeneral}
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
