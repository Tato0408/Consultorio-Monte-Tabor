import { AlertCircle, BarChart3, RefreshCw } from "lucide-react";

// Estado vacío/error de un reporte (citas, pacientes, doctores, inventario): sin error, avisa
// que no hay datos en el período; con error, muestra el mensaje y un botón de reintento.
const ReportFeedback = ({ error, onRetry, emptyTitle = "No hay datos en este período", emptyMessage = "Prueba con otro rango de fechas o consulta el reporte general." }) => {
  const hasError = Boolean(error);

  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-14 text-center">
      <div className={`mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${hasError ? "bg-red-50 text-red-500" : "bg-blue-50 text-blue-600"}`}>
        {hasError ? <AlertCircle className="h-5 w-5" /> : <BarChart3 className="h-5 w-5" />}
      </div>
      <h2 className="text-sm font-bold text-slate-800">
        {hasError ? "No se pudo cargar el reporte" : emptyTitle}
      </h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-slate-400">
        {hasError ? error : emptyMessage}
      </p>
      {hasError && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Reintentar
        </button>
      )}
    </div>
  );
};

export default ReportFeedback;
