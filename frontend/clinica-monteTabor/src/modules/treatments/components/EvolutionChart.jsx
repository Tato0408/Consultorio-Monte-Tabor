import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

const SERIES = [
  { key: "mejorando",  label: "Mejorando",   color: "#22c55e" },
  { key: "sinCambios", label: "Sin cambios", color: "#f59e0b" },
  { key: "empeorando", label: "Empeorando",  color: "#ef4444" },
];

const RANGES = ["Últimos 30 días", "Últimos 90 días", "Último año"];

const EvolutionChart = ({ data, loading }) => {
  const [range, setRange] = useState(RANGES[0]);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-slate-800">Evolución de pacientes</h3>
        <Select value={range} onValueChange={setRange}>
          <SelectTrigger className="h-8 border border-slate-200 rounded-lg px-2.5 text-xs font-semibold text-slate-700 min-w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent sideOffset={6}>
            {RANGES.map((r) => (
              <SelectItem key={r} value={r}>{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>
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
