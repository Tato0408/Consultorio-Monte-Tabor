import { useEffect, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
  BarChart, Bar,
} from "recharts";
import useInsumos from "../hooks/useInsumos";

const PIE_COLORS  = ["#3b82f6", "#22c55e", "#f97316", "#a855f7", "#94a3b8"];
const LINE_COLOR  = "#3b82f6";

const InventoryCharts = ({ refreshTrigger }) => {
  const { getCharts } = useInsumos();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getCharts()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [refreshTrigger]);

  const dailyMovements = data?.dailyMovements ?? [];
  const topItems       = data?.topItems       ?? [];
  const byCategory     = data?.byCategory     ?? [];
  const totalUnidades  = topItems.reduce((s, i) => s + i.value, 0);

  return (
    <div className="grid grid-cols-3 gap-5">
      {/* Consumo de insumos – últimos 7 días */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-800">Consumo de insumos</h3>
          <span className="text-xs text-slate-400">Últimos 7 días</span>
        </div>
        {loading ? (
          <div className="h-[180px] flex items-center justify-center text-xs text-slate-400">Cargando...</div>
        ) : dailyMovements.length === 0 ? (
          <div className="h-[180px] flex items-center justify-center text-xs text-slate-400">Sin movimientos</div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={dailyMovements}>
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={30} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }} />
              <Line type="monotone" dataKey="total" name="Unidades" stroke={LINE_COLOR} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Insumos más utilizados */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-800">Insumos más utilizados</h3>
          <span className="text-xs text-slate-400">Total histórico</span>
        </div>
        {loading ? (
          <div className="h-[140px] flex items-center justify-center text-xs text-slate-400">Cargando...</div>
        ) : topItems.length === 0 ? (
          <div className="h-[140px] flex items-center justify-center text-xs text-slate-400">Sin datos</div>
        ) : (
          <div className="flex items-center gap-4">
            <div className="relative">
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie data={topItems} cx="50%" cy="50%" innerRadius={45} outerRadius={65} dataKey="value" strokeWidth={2}>
                    {topItems.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-lg font-bold text-slate-800">{totalUnidades}</span>
                <span className="text-xs text-slate-400">Unidades</span>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 flex-1 min-w-0">
              {topItems.map((d, i) => (
                <div key={d.name} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[i] }} />
                  <span className="text-xs text-slate-600 truncate flex-1">{d.name}</span>
                  <span className="text-xs text-slate-400 flex-shrink-0">{d.pct}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <button className="w-full mt-3 py-2 text-xs text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 font-medium">
          Ver reporte completo
        </button>
      </div>

      {/* Estado del inventario por categoría */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-800">Estado del inventario</h3>
          <span className="text-xs text-slate-400">Por categoría</span>
        </div>
        {loading ? (
          <div className="h-[180px] flex items-center justify-center text-xs text-slate-400">Cargando...</div>
        ) : byCategory.length === 0 ? (
          <div className="h-[180px] flex items-center justify-center text-xs text-slate-400">Sin datos</div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={byCategory} barSize={22}>
              <XAxis dataKey="cat" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={30} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }} />
              <Bar dataKey="Disponible" stackId="a" fill="#22c55e" />
              <Bar dataKey="Bajo"       stackId="a" fill="#f97316" />
              <Bar dataKey="Crítico"    stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
        <div className="flex items-center gap-3 mt-2 justify-center">
          {[["Disponible", "#22c55e"], ["Bajo", "#f97316"], ["Crítico", "#ef4444"]].map(([l, c]) => (
            <div key={l} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />
              <span className="text-xs text-slate-500">{l}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default InventoryCharts;
