import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LabelList,
} from "recharts";
import { Plus, MoreVertical } from "lucide-react";
import { Card, SectionCard } from "../global/ui";

const IMC_COLOR = "#eab308";

// Espera `patient.signosVitales` (última toma), `patient.imcHistorial`
// (para el gráfico) y `patient.signosVitalesHistorial` (para la tabla).
const HistorialSignosVitales = ({ patient = {}, onAgregar }) => {
  const v = patient.signosVitales ?? {};
  const imcData = patient.imcHistorial ?? [];
  const historial = patient.signosVitalesHistorial ?? [];

  const metrics = [
    { label: "Presión arterial", value: v.presionArterial, unit: "mmHg" },
    { label: "Glucosa", value: v.glucosa, unit: "mg/dL" },
    { label: "Peso", value: v.peso, unit: "" },
    { label: "Altura", value: v.altura, unit: "" },
    { label: "IMC", value: v.imc, unit: v.imcCategoria || "kg/m²", active: true },
  ];

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

      {/* Tarjetas de métricas */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {metrics.map((m) => {
          const active = m.active;
          return (
            <div
              key={m.label}
              className={
                "rounded-xl border p-4 text-center shadow-sm " +
                (active
                  ? "bg-blue-600 border-blue-600"
                  : "bg-blue-50 border-blue-100")
              }
            >
              <p className={"text-xs font-medium " + (active ? "text-blue-100" : "text-slate-500")}>
                {m.label}
              </p>
              <p className={"text-2xl font-bold mt-1 " + (active ? "text-white" : "text-slate-800")}>
                {m.value}
              </p>
              <p className={"text-xs mt-0.5 " + (active ? "text-blue-100" : "text-slate-400")}>
                {m.unit}
              </p>
            </div>
          );
        })}
      </div>

      {/* Gráfico IMC */}
      <SectionCard
        title={
          <span className="flex items-center gap-2">
            <span className="inline-block w-4 h-0.5 rounded" style={{ background: IMC_COLOR }} />
            IMC
          </span>
        }
      >
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={imcData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="imcFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={IMC_COLOR} stopOpacity={0.35} />
                <stop offset="100%" stopColor={IMC_COLOR} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="cita" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <YAxis
              domain={[20, 40]} ticks={[20, 25, 30, 35, 40]}
              tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={32}
            />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }} />
            <Area
              type="monotone" dataKey="imc" name="IMC"
              stroke={IMC_COLOR} strokeWidth={2}
              fill="url(#imcFill)"
              dot={{ r: 3, fill: IMC_COLOR, strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            >
              <LabelList dataKey="imc" position="top" style={{ fontSize: 10, fill: "#64748b" }} />
            </Area>
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
