import { useNavigate } from "react-router-dom";
import { PieChart, Pie, Cell, ResponsiveContainer, Label } from "recharts";
import { ChevronRight } from "lucide-react";

const COLORS = ["#3b82f6", "#8b5cf6", "#14b8a6", "#10b981", "#f59e0b"];

// Muestra un gráfico de dona con las enfermedades más frecuentes y su
// porcentaje sobre el total. Recibe la lista de enfermedades (nombre,
// conteo y porcentaje) y el total general de diagnósticos.
const DiseaseStatsCard = ({ diseases = [], total = 0 }) => {
    const navigate = useNavigate();

    // Si no hay enfermedades registradas, se muestra un slice único gris
    // en vez de dejar el gráfico vacío.
    const data = diseases.length > 0
        ? diseases.map((d) => ({ name: d.name, value: d.count }))
        : [{ name: "Sin datos", value: 1 }];

    const hasData = diseases.length > 0;

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-4">
            <p className="text-sm font-bold text-slate-800">Enfermedad más frecuente</p>

            <div className="flex items-center gap-4">
                {/* Gráfico de dona */}
                <div className="w-36 h-36 flex-shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={38}
                                outerRadius={60}
                                paddingAngle={hasData ? 2 : 0}
                                dataKey="value"
                                startAngle={90}
                                endAngle={-270}
                                isAnimationActive={false}
                                strokeWidth={0}
                            >
                                {data.map((_, i) => (
                                    <Cell key={i} fill={hasData ? COLORS[i % COLORS.length] : "#e2e8f0"} />
                                ))}
                                <Label
                                    content={({ viewBox }) => {
                                        const { cx, cy } = viewBox;
                                        return (
                                            <g>
                                                <text x={cx} y={cy - 8} textAnchor="middle" fill="#94a3b8" fontSize="10" fontFamily="inherit">Total</text>
                                                <text x={cx} y={cy + 10} textAnchor="middle" fill="#1e293b" fontSize="18" fontWeight="700" fontFamily="inherit">
                                                    {total.toLocaleString()}
                                                </text>
                                            </g>
                                        );
                                    }}
                                />
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Leyenda */}
                <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                    {hasData ? diseases.map((d, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                            <span className="text-xs text-slate-600 flex-1 truncate">{d.name}</span>
                            <span className="text-xs font-semibold text-slate-500 flex-shrink-0">{d.pct}%</span>
                            <span className="text-xs text-slate-400 flex-shrink-0">({d.count})</span>
                        </div>
                    )) : (
                        <p className="text-xs text-slate-300">Sin diagnósticos registrados</p>
                    )}
                </div>
            </div>

            <button
                onClick={() => navigate("/reports/appointments")}
                className="flex items-center gap-1 text-xs text-blue-600 font-semibold hover:underline mt-auto"
            >
                Ver reporte completo <ChevronRight className="w-3.5 h-3.5" />
            </button>
        </div>
    );
};

export default DiseaseStatsCard;
