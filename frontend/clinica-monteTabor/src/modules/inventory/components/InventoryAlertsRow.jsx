import { AlertCircle, AlertTriangle } from "lucide-react";
import CollapsibleCard from "@/components/ui/CollapsibleCard";
import { getExpiryDays, getExpiryLabel } from "../utils/expiry";

const fmtExpiry = (dateStr) => {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("es-SV", { day: "2-digit", month: "2-digit", year: "numeric" });
};

// Los bloques de alertas de inventario y próximos a vencer van
// debajo de la tabla, no en el panel lateral, uno al lado del otro,
// cada uno ocupando la mitad del ancho de la tabla.
const InventoryAlertsRow = ({ stats, defaultOpen = true, canView = true }) => {
  const alertas         = canView ? stats?.alertas         ?? [] : [];
  const proximosAVencer = canView ? stats?.proximosAVencer ?? [] : [];
  const emptyLabel = canView ? null : "Sin permiso para ver este dato";

  // La clase items-start hace que cada card tome su propia altura
  // de contenido. Con el stretch por defecto de la cuadrícula,
  // cerrar una mientras la otra sigue abierta deja su borde
  // estirado hasta la altura de la abierta, con un hueco vacío
  // debajo del encabezado.
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-start">
      <CollapsibleCard title="Alertas de inventario" defaultOpen={defaultOpen}>
        <div className="flex flex-col gap-2">
          {alertas.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-4">{emptyLabel || "Sin alertas activas"}</p>
          )}
          {alertas.map((a) => {
            const critico = a.stock <= 0;
            return (
              <div
                key={a._id}
                className={`flex items-start gap-3 p-3 rounded-lg border ${critico ? "bg-red-50 border-red-100" : "bg-orange-50 border-orange-100"}`}
              >
                {critico
                  ? <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  : <AlertTriangle className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />}
                <div>
                  <p className="text-sm font-medium text-slate-800">{a.name}</p>
                  <p className="text-xs text-slate-500">
                    {critico ? `Stock crítico: ${a.stock} ${a.unit_measure}` : `Stock bajo: ${a.stock} ${a.unit_measure}`}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        <button className="w-full mt-3 text-xs text-blue-600 hover:underline font-medium">
          Ver todas las alertas
        </button>
      </CollapsibleCard>

      <CollapsibleCard title="Próximos a vencer" defaultOpen={defaultOpen}>
        <div className="flex flex-col gap-3">
          {proximosAVencer.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-4">{emptyLabel || "Sin vencimientos próximos"}</p>
          )}
          {proximosAVencer.map((p) => {
            const days = getExpiryDays(p.expiration_date);
            const color = days <= 0 ? "text-red-600" : days <= 15 ? "text-red-500" : "text-orange-500";
            return (
              <div key={p._id} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-xs">💊</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{p.name}</p>
                  <p className="text-xs text-slate-400">Vence el {fmtExpiry(p.expiration_date)}</p>
                </div>
                <span className={`text-xs font-semibold ${color} flex-shrink-0`}>{getExpiryLabel(p.expiration_date)}</span>
              </div>
            );
          })}
        </div>
        <button className="w-full mt-3 text-xs text-blue-600 hover:underline font-medium">
          Ver todos
        </button>
      </CollapsibleCard>
    </div>
  );
};

export default InventoryAlertsRow;
