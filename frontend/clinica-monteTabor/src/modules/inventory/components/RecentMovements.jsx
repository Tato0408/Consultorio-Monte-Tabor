import { useEffect, useState } from "react";
import useInsumos from "../hooks/useInsumos";

const TYPE_LABEL = {
  "Treatment use":       "Uso en tratamiento",
  "Stock entry":         "Entrada de stock",
  "Inventory adjustment":"Ajuste de inventario",
  "Manual use":          "Uso manual",
};

const TYPE_STYLE = {
  "Treatment use":        "bg-blue-100 text-blue-600",
  "Stock entry":          "bg-green-100 text-green-600",
  "Inventory adjustment": "bg-orange-100 text-orange-500",
  "Manual use":           "bg-purple-100 text-purple-600",
};

const fmtDate = (d) =>
  new Date(d).toLocaleDateString("es-SV", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

const RecentMovements = ({ refreshTrigger }) => {
  const { getMovements } = useInsumos();
  const [movements, setMovements] = useState([]);
  const [loading, setLoading]     = useState(false);

  useEffect(() => {
    setLoading(true);
    getMovements(5)
      .then(setMovements)
      .catch(() => setMovements([]))
      .finally(() => setLoading(false));
  }, [refreshTrigger]);

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
      <h3 className="text-base font-semibold text-slate-800 mb-4">Movimientos recientes</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              {["Fecha","Tipo","Producto","Detalle","Cantidad","Usuario"].map((h) => (
                <th key={h} className="text-left text-xs text-slate-400 font-normal px-3 py-2">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} className="text-center py-8 text-slate-400 text-xs">Cargando...</td></tr>
            )}
            {!loading && movements.length === 0 && (
              <tr><td colSpan={6} className="text-center py-8 text-slate-400 text-xs">Sin movimientos registrados</td></tr>
            )}
            {!loading && movements.map((m) => (
              <tr key={m._id} className="border-b border-slate-50 hover:bg-slate-50">
                <td className="px-3 py-3 text-xs text-slate-500 whitespace-nowrap">{fmtDate(m.date)}</td>
                <td className="px-3 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_STYLE[m.type] ?? "bg-slate-100 text-slate-500"}`}>
                    {TYPE_LABEL[m.type] ?? m.type}
                  </span>
                </td>
                <td className="px-3 py-3 text-xs text-slate-700 font-medium">{m.itemName}</td>
                <td className="px-3 py-3 text-xs text-slate-500">{m.detail || "—"}</td>
                <td className={`px-3 py-3 text-xs font-semibold ${m.quantity >= 0 ? "text-green-600" : "text-red-500"}`}>
                  {m.quantity >= 0 ? `+${m.quantity}` : m.quantity} uds.
                </td>
                <td className="px-3 py-3 text-xs text-slate-500">{m.user || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button className="w-full mt-4 py-2.5 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 font-medium">
        Ver todos los movimientos
      </button>
    </div>
  );
};

export default RecentMovements;
