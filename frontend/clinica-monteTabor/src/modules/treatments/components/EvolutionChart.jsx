import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

// El sistema no guarda ningun campo que clasifique la evolucion clinica de
// un paciente (mejorando, sin cambios, empeorando). La unica serie que se
// puede mostrar con datos reales es cuantos tratamientos nuevos empezaron
// cada semana (ver chartData en treatmentsController.js).
const SERIES = [
  { key: "iniciados", label: "Tratamientos iniciados", color: "#0b66d6" },
];

const EvolutionChart = ({ data, loading }) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-slate-800">Tratamientos iniciados por semana</h3>
      </div>

      <div className="flex items-center gap-4">
        {SERIES.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
            <span className="text-xs text-slate-500">{s.label}</span>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="h-[220px] bg-slate-50 rounded-lg animate-pulse" />
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data}>
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e2e8f0" }} />
            {SERIES.map((s) => (
              <Line key={s.key} type="monotone" dataKey={s.key} stroke={s.color} strokeWidth={2} dot={{ r: 3 }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default EvolutionChart;
