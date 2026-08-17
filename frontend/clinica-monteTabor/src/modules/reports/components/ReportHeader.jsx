import { Download, Calendar, Loader2 } from "lucide-react";

// Límite amplio pero real: evita años absurdos, de 5 dígitos o más, al
// escribir la fecha a mano.
const MIN_DATE_STR = "2000-01-01";
// No tiene sentido pedir datos de una fecha que todavía no ha pasado, ni
// como inicio ni como final del rango, así que ninguno de los dos inputs
// deja elegir más allá de hoy.
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const MAX_DATE_STR = todayStr();

// Props del encabezado de reportes.
// dateFrom y dateTo son strings en formato YYYY-MM-DD, el formato nativo
// del input de tipo fecha.
// isGeneral, cuando es true, hace que el rango de fechas se ignore y se
// pidan todos los datos históricos.
// onChangeFrom y onChangeTo son los setters controlados por el hook de
// cada página. Elegir una fecha ya cambia isGeneral a false por su
// cuenta, así que el rango queda siempre activo y clickeable, nunca
// deshabilitado, sin necesitar un paso previo para activar el modo
// parametrizado.
// onSelectGeneral vuelve al modo General. A diferencia del rango de
// fechas, es una acción de un solo sentido, no un interruptor: la única
// forma de volver al modo parametrizado es elegir una fecha, no volver a
// hacer clic en General.
// onExport dispara la generación y la descarga del PDF con lo que se
// está mostrando en pantalla.
const ReportHeader = ({
  title,
  subtitle,
  breadcrumb,
  dateFrom,
  dateTo,
  isGeneral,
  onChangeFrom,
  onChangeTo,
  onSelectGeneral,
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

        {/* La clase mt-8 baja el botón a la misma altura que el botón Guardar
            cambios de Horarios, para que no choque con la campana de
            notificaciones (fixed, ver MainLayout.jsx). Este encabezado es
            compartido por las cuatro páginas de reportes, así que el ajuste
            aplica a todas a la vez. */}
        <button
          type="button"
          onClick={onExport}
          disabled={exporting || disableExport}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-colors disabled:opacity-60 mt-8"
        >
          {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {exporting ? "Generando..." : "Exportar"}
        </button>
      </div>

      {/* Filtro de rango de fechas (modo parametrizado) y botón de reporte
          general, como si fueran dos pestañas: cuál está resaltada en azul
          indica cuál está activa en este momento, pero el rango de fechas
          nunca se deshabilita, para poder pasar al modo parametrizado con solo
          elegir una fecha. */}
      <div className="flex justify-end items-center gap-2 flex-wrap">
        <div
          className={`flex items-center gap-2 border rounded-xl px-3 py-2 shadow-sm transition-colors ${
            isGeneral ? "border-slate-200 bg-white" : "border-blue-200 bg-blue-50/40"
          }`}
        >
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <input
            type="date"
            min={MIN_DATE_STR}
            max={MAX_DATE_STR}
            value={dateFrom || ""}
            onChange={(e) => onChangeFrom(e.target.value)}
            className="text-xs font-semibold text-slate-700 outline-none bg-transparent"
          />
          <span className="text-xs text-slate-400">–</span>
          <input
            type="date"
            min={MIN_DATE_STR}
            max={MAX_DATE_STR}
            value={dateTo || ""}
            onChange={(e) => onChangeTo(e.target.value)}
            className="text-xs font-semibold text-slate-700 outline-none bg-transparent"
          />
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
