import { useState, useEffect } from "react";
import { Clock, DollarSign, UserCheck } from "lucide-react";
import useProcedures from "../hooks/useProcedures";

const CARD_COLORS = [
  "bg-blue-100 text-blue-600",
  "bg-emerald-100 text-emerald-600",
  "bg-purple-100 text-purple-600",
  "bg-orange-100 text-orange-600",
  "bg-rose-100 text-rose-600",
  "bg-teal-100 text-teal-600",
];

const TreatmentUsage = ({ canView = true }) => {
  const { getProcedures } = useProcedures();
  const [procedures, setProcedures] = useState([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    // GET /procedures exige el permiso "procedures" (view), un módulo
    // distinto de inventory.products (el que da acceso a esta pantalla de
    // Inventario). Sin este chequeo, un rol con solo Productos recibía 403
    // en silencio y esta tarjeta se quedaba mostrando "No hay procedimientos
    // registrados" para siempre, sin ningún aviso de qué permiso le faltaba.
    if (!canView) { setProcedures([]); setLoading(false); return; }
    setLoading(true);
    getProcedures()
      .then((data) => setProcedures(Array.isArray(data) ? data.filter(p => p.is_active !== false) : []))
      .catch(() => setProcedures([]))
      .finally(() => setLoading(false));
  }, [canView]);

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-slate-800">Insumos utilizados por tratamiento</h3>
        <p className="text-xs text-slate-400 mt-0.5">Cantidad promedio de insumos por procedimiento</p>
      </div>

      {!canView ? (
        <div className="py-8 text-center text-sm text-slate-400">Sin permiso para ver los procedimientos</div>
      ) : loading ? (
        <div className="py-8 text-center text-sm text-slate-400">Cargando procedimientos...</div>
      ) : procedures.length === 0 ? (
        <div className="py-8 text-center text-sm text-slate-400">No hay procedimientos registrados.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {procedures.map((proc, i) => {
            const colorClass = CARD_COLORS[i % CARD_COLORS.length];
            const initial    = proc.name?.[0]?.toUpperCase() || "P";

            return (
              <div key={proc._id} className="border border-slate-100 rounded-xl p-4 flex flex-col">
                <div className="flex items-center gap-2 mb-3">
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 ${colorClass}`}>
                    {initial}
                  </span>
                  <h4 className="text-sm font-semibold text-slate-800 leading-tight line-clamp-2">{proc.name}</h4>
                </div>

                <div className="flex flex-wrap gap-x-3 gap-y-1 mb-3">
                  {proc.estimated_duration && (
                    <span className="flex items-center gap-1 text-[10px] text-slate-400">
                      <Clock className="w-3 h-3" /> {proc.estimated_duration} min
                    </span>
                  )}
                  {proc.price > 0 && (
                    <span className="flex items-center gap-1 text-[10px] text-slate-400">
                      <DollarSign className="w-3 h-3" /> ${Number(proc.price).toLocaleString()}
                    </span>
                  )}
                  {proc.requires_nurse && (
                    <span className="flex items-center gap-1 text-[10px] text-slate-400">
                      <UserCheck className="w-3 h-3" /> Requiere enfermera
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-1.5 flex-1">
                  {proc.materials?.length > 0 ? (
                    proc.materials.map((mat, mi) => {
                      const matName = mat.insumo?.name || mat.name || "Insumo";
                      const qty     = mat.quantity ?? 1;
                      return (
                        <div key={mi} className="flex items-center justify-between">
                          <span className="text-xs text-slate-600 truncate pr-2">{matName}</span>
                          <span className="text-xs text-slate-500 font-medium whitespace-nowrap flex-shrink-0">
                            {qty} {qty === 1 ? "unidad" : "unidades"}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-xs text-slate-400 italic">Sin insumos registrados</p>
                  )}
                </div>

                {proc.description && (
                  <p className="mt-2 pt-2 border-t border-slate-50 text-[10px] text-slate-400 line-clamp-2">
                    {proc.description}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TreatmentUsage;
