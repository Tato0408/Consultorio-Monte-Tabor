import { AlertCircle, AlertTriangle, BookOpen, PackagePlus, ClipboardList, ShoppingCart } from "lucide-react";

const diffDays = (dateStr) => {
  const diff = new Date(dateStr) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

const fmtExpiry = (dateStr) => {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("es-SV", { day: "2-digit", month: "2-digit", year: "numeric" });
};

const InventoryAlerts = ({ stats, onManualUsage, onStockEntry, onAdjust }) => {
  const alertas          = stats?.alertas          ?? [];
  const proximosAVencer  = stats?.proximosAVencer  ?? [];

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-slate-800 mb-4">Alertas de inventario</h3>
        <div className="flex flex-col gap-2">
          {alertas.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-4">Sin alertas activas</p>
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
      </div>


      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-slate-800 mb-4">Próximos a vencer</h3>
        <div className="flex flex-col gap-3">
          {proximosAVencer.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-4">Sin vencimientos próximos</p>
          )}
          {proximosAVencer.map((p) => {
            const days = diffDays(p.expiration_date);
            const color = days <= 15 ? "text-red-500" : days <= 30 ? "text-orange-500" : "text-yellow-500";
            return (
              <div key={p._id} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-xs">💊</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{p.name}</p>
                  <p className="text-xs text-slate-400">Vence el {fmtExpiry(p.expiration_date)}</p>
                </div>
                <span className={`text-xs font-semibold ${color} flex-shrink-0`}>{days} días</span>
              </div>
            );
          })}
        </div>
        <button className="w-full mt-3 text-xs text-blue-600 hover:underline font-medium">
          Ver todos
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-slate-800 mb-4">Acciones rápidas</h3>
        <div className="flex flex-col gap-1">
          {[
            { label: "Registrar uso manual",    icon: BookOpen,      color: "text-blue-600 bg-blue-50",   fn: onManualUsage },
            { label: "Registrar entrada de stock", icon: PackagePlus, color: "text-green-600 bg-green-50", fn: onStockEntry  },
            { label: "Ajuste de inventario",    icon: ClipboardList, color: "text-orange-500 bg-orange-50", fn: onAdjust     },
            { label: "Generar orden de compra", icon: ShoppingCart,  color: "text-purple-600 bg-purple-50", fn: null          },
          ].map(({ label, icon: Icon, color, fn }) => (
            <button
              key={label}
              onClick={fn}
              className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors text-left"
            >
              <div className={`p-2 rounded-lg ${color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <span className="text-sm text-slate-700">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default InventoryAlerts;
