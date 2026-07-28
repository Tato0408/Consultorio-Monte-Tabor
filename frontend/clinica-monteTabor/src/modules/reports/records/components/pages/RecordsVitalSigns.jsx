import { useMemo, useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LabelList,
} from "recharts";
import { Plus, MoreVertical } from "lucide-react";
import { Card, SectionCard } from "../global/ui";

// Configuración de cada tarjeta clicable: a qué campo(s) de
// `signosVitalesHistorial` corresponde y cómo graficarlo.
const METRICS = {
  presionArterial: { label: "Presión arterial", unit: "mmHg", color: "#3b82f6", type: "bp" },
  glucosa: { label: "Glucosa", unit: "mg/dL", color: "#ef4444", type: "single", field: "glucosa" },
  peso: { label: "Peso", unit: "kg", color: "#10b981", type: "single", field: "peso" },
  altura: { label: "Altura", unit: "m", color: "#8b5cf6", type: "single", field: "altura" },
  imc: { label: "IMC", unit: "kg/m²", color: "#eab308", type: "single", field: "imc" },
};

const toNumber = (raw) => (typeof raw === "number" && Number.isFinite(raw) ? raw : null);

// Arma los puntos del gráfico para la métrica seleccionada, en orden
// cronológico ascendente (signosVitalesHistorial viene más reciente primero).
const buildChartData = (historial, metricKey) => {
  const config = METRICS[metricKey];
  return [...historial].reverse().map((h, i) => {
    const point = { cita: `Cita ${i + 1}` };
    if (config.type === "bp") {
      const [sistolica, diastolica] =
        typeof h.presion === "string" && h.presion.includes("/")
          ? h.presion.split("/").map((n) => Number(n.trim()))
          : [null, null];
      point.sistolica = Number.isFinite(sistolica) ? sistolica : null;
      point.diastolica = Number.isFinite(diastolica) ? diastolica : null;
    } else {
      point.value = toNumber(h[config.field]);
    }
    return point;
  });
};

// Espera `patient.signosVitales` (última toma) y
// `patient.signosVitalesHistorial` (para el gráfico y la tabla).
const HistorialSignosVitales = ({ patient = {}, onAgregar }) => {
  const v = patient.signosVitales ?? {};
  const [selectedMetric, setSelectedMetric] = useState("imc");
  const historial = useMemo(() => patient.signosVitalesHistorial ?? [], [patient.signosVitalesHistorial]);

  const metrics = [
    { key: "presionArterial", label: "Presión arterial", value: v.presionArterial, unit: "mmHg" },
    { key: "glucosa", label: "Glucosa", value: v.glucosa, unit: "mg/dL" },
    { key: "peso", label: "Peso", value: v.peso, unit: "" },
    { key: "altura", label: "Altura", value: v.altura, unit: "" },
    { key: "imc", label: "IMC", value: v.imc, unit: v.imcCategoria || "kg/m²" },
  ];

  const config = METRICS[selectedMetric];
  const chartData = useMemo(
    () => buildChartData(historial, selectedMetric),
    [historial, selectedMetric]
  );
  const isImc = selectedMetric === "imc";

  return (
    <div className="space-y-5">

      {/* Encabezado */}
      <div className="flex justify-end">
        <button
          onClick={onAgregar}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg shadow-sm"
        >
          Agregar <Plus size={16} />
        </button>
      </div>

      {/* Tarjetas de métricas: clic para actualizar el gráfico de abajo */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {metrics.map((m) => {
          const active = selectedMetric === m.key;
          return (
            <button
              type="button"
              key={m.key}
              onClick={() => setSelectedMetric(m.key)}
              className={
                "rounded-xl border p-4 text-center shadow-sm transition-colors " +
                (active
                  ? "bg-blue-600 border-blue-600"
                  : "bg-blue-50 border-blue-100 hover:border-blue-300")
              }
            >
              <p className={"text-xs font-medium " + (active ? "text-blue-100" : "text-slate-500")}>
                {m.label}
              </p>
              <p className={"text-2xl font-bold mt-1 " + (active ? "text-white" : "text-slate-800")}>
                {m.value ?? "—"}
              </p>
              <p className={"text-xs mt-0.5 " + (active ? "text-blue-100" : "text-slate-400")}>
                {m.unit}
              </p>
            </button>
          );
        })}
      </div>

      {/* Gráfico de la métrica seleccionada */}
      <SectionCard
        title={
          <span className="flex items-center gap-2">
            <span className="inline-block w-4 h-0.5 rounded" style={{ background: config.color }} />
            {config.label}
          </span>
        }
      >
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="metricFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={config.color} stopOpacity={0.35} />
                <stop offset="100%" stopColor={config.color} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="metricFillSecondary" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="cita" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <YAxis
              domain={isImc ? [20, 40] : ["auto", "auto"]}
              ticks={isImc ? [20, 25, 30, 35, 40] : undefined}
              tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={36}
            />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }} />
            {config.type === "bp" ? (
              <>
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area
                  type="monotone" dataKey="sistolica" name="Sistólica"
                  stroke="#ef4444" strokeWidth={2}
                  fill="url(#metricFill)"
                  dot={{ r: 3, fill: "#ef4444", strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                  connectNulls
                />
                <Area
                  type="monotone" dataKey="diastolica" name="Diastólica"
                  stroke="#3b82f6" strokeWidth={2}
                  fill="url(#metricFillSecondary)"
                  dot={{ r: 3, fill: "#3b82f6", strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                  connectNulls
                />
              </>
            ) : (
              <Area
                type="monotone" dataKey="value" name={config.label}
                stroke={config.color} strokeWidth={2}
                fill="url(#metricFill)"
                dot={{ r: 3, fill: config.color, strokeWidth: 0 }}
                activeDot={{ r: 5 }}
                connectNulls
              >
                <LabelList dataKey="value" position="top" style={{ fontSize: 10, fill: "#64748b" }} />
              </Area>
            )}
          </AreaChart>
        </ResponsiveContainer>
      </SectionCard>

      {/* Tabla de historial */}
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-400">
              <th className="font-medium pb-3 pr-4">Fecha</th>
              <th className="font-medium pb-3 pr-4">Presión (mmHg)</th>
              <th className="font-medium pb-3 pr-4">Glucosa (mg/dL)</th>
              <th className="font-medium pb-3 pr-4">Peso (kg)</th>
              <th className="font-medium pb-3 pr-4">Altura (m)</th>
              <th className="font-medium pb-3 pr-4">IMC</th>
              <th className="font-medium pb-3 pr-4">Temperatura (c°)</th>
              <th className="font-medium pb-3 pr-4">SPO2%</th>
              <th className="font-medium pb-3 text-center">Acción</th>
            </tr>
          </thead>
          <tbody>
            {historial.map((r) => (
              <tr key={r.fecha} className="border-t border-slate-100 text-slate-600">
                <td className="py-3 pr-4 whitespace-nowrap">{r.fecha}</td>
                <td className="py-3 pr-4">{r.presion}</td>
                <td className="py-3 pr-4">{r.glucosa}</td>
                <td className="py-3 pr-4">{r.peso}</td>
                <td className="py-3 pr-4">{r.altura}</td>
                <td className="py-3 pr-4">{r.imc}</td>
                <td className="py-3 pr-4">{r.temp}</td>
                <td className="py-3 pr-4">{r.spo2}</td>
                <td className="py-3 text-center">
                  <button className="text-slate-400 hover:text-slate-600 inline-flex justify-center">
                    <MoreVertical size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

export default HistorialSignosVitales;
