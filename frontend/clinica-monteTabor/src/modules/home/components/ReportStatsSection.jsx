import { useNavigate } from "react-router-dom";
import { BarChart, Bar, ResponsiveContainer, Cell, Tooltip, YAxis } from "recharts";
import { CalendarDays, Users, Stethoscope } from "lucide-react";

// 18 bars: 3 per month × 6 months from real data; returns [] when all zeros
const toBars = (monthlyData) => {
    if (!monthlyData?.length) return [];
    return monthlyData.slice(0, 6).flatMap((monthVal, mi) => {
        const avg = (monthVal || 0) / 3;
        return [0.85, 1.15, 1.0].map((factor) => ({
            v: Math.max(0, Math.round(avg * factor * (0.65 + (mi / 6) * 0.7))),
        }));
    });
};

const ReportCard = ({
    icon, iconBg,
    title, subtitle,
    value, growth,
    monthlyData,
    mainColor, lightColor,
    navigateTo,
    gradId,
}) => {
    const navigate   = useNavigate();
    const isPositive = Number(growth) >= 0;
    const bars       = toBars(monthlyData);
    const hasData    = bars.some((b) => b.v > 0);
    const maxVal     = Math.max(...bars.map((b) => b.v), 1);
    const gradientId = `rpt-grad-${gradId}`;

    return (
        <div
            className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => navigate(navigateTo)}
        >
            {/* ── Info ── */}
            <div className="px-4 pt-4 pb-2 flex flex-col gap-1.5">
                <div className="flex items-center gap-2.5">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${iconBg}`}>
                        {icon}
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-700 leading-tight">{title}</p>
                        <p className="text-xs text-slate-400 leading-tight">{subtitle}</p>
                    </div>
                </div>

                <p className="text-2xl font-bold text-slate-800 leading-none mt-1">
                    {(value || 0).toLocaleString()}
                </p>

                <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold" style={{ color: isPositive ? "#10b981" : "#ef4444" }}>
                        {isPositive ? "↗" : "↘"}{isPositive && !String(growth).startsWith("+") ? "+" : ""}{growth}%
                    </span>
                    <span className="text-xs text-slate-400">vs. mes pasado</span>
                </div>
            </div>

            {/* ── Bar chart / empty state ── */}
            {hasData ? (
                <div className="h-24 w-full mt-1">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={bars}
                            barCategoryGap="18%"
                            margin={{ top: 6, right: 14, left: 14, bottom: 4 }}
                        >
                            <defs>
                                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%"   stopColor={mainColor} stopOpacity={1}   />
                                    <stop offset="100%" stopColor={mainColor} stopOpacity={0.4} />
                                </linearGradient>
                            </defs>

                            <YAxis domain={[0, maxVal * 1.12]} hide />

                            <Tooltip
                                cursor={{ fill: `${mainColor}18` }}
                                content={({ active, payload }) =>
                                    active && payload?.length
                                        ? (
                                            <div
                                                className="px-2.5 py-1 rounded-lg text-xs font-semibold text-white shadow-md"
                                                style={{ backgroundColor: mainColor }}
                                            >
                                                {payload[0].value}
                                            </div>
                                        )
                                        : null
                                }
                            />

                            <Bar dataKey="v" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                                {bars.map((_, i) => (
                                    <Cell
                                        key={i}
                                        fill={i % 2 === 0 ? `url(#${gradientId})` : lightColor}
                                        fillOpacity={i % 2 === 0 ? 1 : 0.6}
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <div className="h-24 flex items-center justify-center mt-1">
                    <p className="text-xs text-slate-300 font-medium">Sin datos en los últimos 6 meses</p>
                </div>
            )}
        </div>
    );
};

const ReportStatsSection = ({ data }) => {
    const navigate = useNavigate();
    const appt    = data?.appointments  || { total: 0, thisMonth: 0, growth: 0, monthlyData: [] };
    const pts     = data?.patients      || { thisMonth: 0, growth: 0, monthlyData: [] };
    const consult = data?.consultations || { thisMonth: 0, growth: 0, monthlyData: [] };

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-slate-800">Reportes y estadísticas</h2>
                <button
                    onClick={() => navigate("/reports/appointments")}
                    className="text-xs text-blue-600 font-semibold hover:underline"
                >
                    Ver todos los reportes →
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ReportCard
                    icon={<CalendarDays className="w-5 h-5 text-blue-600" />}
                    iconBg="bg-blue-100"
                    title="Citas"
                    subtitle="Total de citas"
                    value={appt.total}
                    growth={appt.growth}
                    monthlyData={appt.monthlyData}
                    mainColor="#3b82f6"
                    lightColor="#93c5fd"
                    navigateTo="/reports/appointments"
                    gradId="blue"
                />
                <ReportCard
                    icon={<Users className="w-5 h-5 text-violet-600" />}
                    iconBg="bg-violet-100"
                    title="Pacientes"
                    subtitle="Nuevos pacientes"
                    value={pts.thisMonth}
                    growth={pts.growth}
                    monthlyData={pts.monthlyData}
                    mainColor="#7c3aed"
                    lightColor="#a78bfa"
                    navigateTo="/reports/patients"
                    gradId="violet"
                />
                <ReportCard
                    icon={<Stethoscope className="w-5 h-5 text-orange-500" />}
                    iconBg="bg-orange-100"
                    title="Consultas"
                    subtitle="Consultas realizadas"
                    value={consult.thisMonth}
                    growth={consult.growth}
                    monthlyData={consult.monthlyData}
                    mainColor="#f97316"
                    lightColor="#fdba74"
                    navigateTo="/reports/patients"
                    gradId="orange"
                />
            </div>
        </div>
    );
};

export default ReportStatsSection;
