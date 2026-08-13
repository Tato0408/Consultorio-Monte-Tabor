import { TrendingUp, TrendingDown } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, Tooltip } from "recharts";

const Sparkline = ({ chartData, hasData, gradId, lineColor, glassTooltip, emptyLabel }) =>
    hasData ? (
        <div className="h-12 sm:h-16 w-full mt-auto">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 6, right: 8, left: 8, bottom: 4 }}>
                    <defs>
                        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%"   stopColor={lineColor} stopOpacity={glassTooltip ? 0.35 : 0.25} />
                            <stop offset="100%" stopColor={lineColor} stopOpacity={0}    />
                        </linearGradient>
                    </defs>
                    <Tooltip
                        content={({ active, payload }) =>
                            active && payload?.length
                                ? (
                                    <div
                                        className="px-2 py-1 rounded-lg text-xs font-semibold shadow-md"
                                        style={glassTooltip ? { backgroundColor: "#ffffff", color: "#1d4ed8" } : { backgroundColor: lineColor, color: "#ffffff" }}
                                    >
                                        {payload[0].value}
                                    </div>
                                )
                                : null
                        }
                    />
                    <Area
                        type="monotone"
                        dataKey="v"
                        stroke={lineColor}
                        strokeWidth={2.5}
                        fill={`url(#${gradId})`}
                        dot={false}
                        activeDot={{ r: 4, fill: lineColor, stroke: glassTooltip ? "#1d4ed8" : "#fff", strokeWidth: 2 }}
                        isAnimationActive={false}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    ) : (
        <div className="h-12 sm:h-16 w-full mt-auto flex items-center justify-center">
            <p className={emptyLabel.className}>{emptyLabel.text}</p>
        </div>
    );

// Tarjeta destacada (degradado, ocupa 2 columnas): usada para UNA sola métrica principal
// en un grid, ej. ingresos en el dashboard de admin. Layout propio (icono arriba a la
// derecha, crecimiento como píldora) — completamente separado del render normal de abajo
// para que tocar esto nunca pueda afectar a los demás dashboards.
const FeaturedStatCard = ({ icon, label, value, growth, growthLabel, sparkline, sparklineColor, caption }) => {
    const isPositive = parseFloat(String(growth).replace("%", "").replace("+", "")) >= 0;
    const raw        = sparkline?.length ? sparkline : [0, 0, 0, 0, 0, 0, 0];
    const chartData  = raw.map((v, i) => ({ v, i }));
    const hasData    = raw.some((v) => v > 0);
    const gradId     = `sk-${sparklineColor.replace("#", "")}-f`;

    return (
        <div className="rounded-2xl p-4 sm:p-5 flex flex-col bg-gradient-to-br from-[#3b82f6] to-[#1d4ed8] shadow-lg shadow-blue-500/20 sm:col-span-2">
            <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                    <p className="text-xs font-medium leading-tight text-white/70">{label}</p>
                    <p className="text-2xl sm:text-3xl font-bold mt-1 leading-none truncate text-white">{value}</p>
                    {caption && <p className="text-[11px] mt-1.5 leading-tight text-white/60">{caption}</p>}
                </div>
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
                    {icon}
                </div>
            </div>

            <div className="mb-3 sm:mb-4">
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${isPositive ? "bg-emerald-400/20 text-emerald-200" : "bg-red-400/20 text-red-200"}`}>
                    {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                    {isPositive && !String(growth).startsWith("+") ? "+" : ""}{growth}
                </span>
                <span className="text-xs text-white/60 ml-2">{growthLabel}</span>
            </div>

            <Sparkline
                chartData={chartData}
                hasData={hasData}
                gradId={gradId}
                lineColor="#ffffff"
                glassTooltip
                emptyLabel={{ className: "text-xs text-white/50", text: "Sin actividad esta semana" }}
            />
        </div>
    );
};

const StatCard = ({ icon, iconBg, label, value, growth, growthLabel, sparkline, sparklineColor, caption, featured = false }) => {
    if (featured) {
        return (
            <FeaturedStatCard
                icon={icon} label={label} value={value} growth={growth} growthLabel={growthLabel}
                sparkline={sparkline} sparklineColor={sparklineColor} caption={caption}
            />
        );
    }

    const isPositive = parseFloat(String(growth).replace("%", "").replace("+", "")) >= 0;
    const raw        = sparkline?.length ? sparkline : [0, 0, 0, 0, 0, 0, 0];
    const chartData  = raw.map((v, i) => ({ v, i }));
    const hasData    = raw.some((v) => v > 0);
    const gradId     = `sk-${sparklineColor.replace("#", "")}`;

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 sm:p-5 flex flex-col">
            {/* Icon + label + value */}
            <div className="flex items-start gap-2 sm:gap-3 mb-2 sm:mb-3">
                <div className={`w-9 h-9 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
                    {icon}
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-xs text-slate-400 font-medium leading-tight">{label}</p>
                    <p className="text-xl sm:text-2xl font-bold text-slate-800 mt-0.5 leading-none truncate">{value}</p>
                </div>
            </div>

            {/* Growth */}
            <div className="flex items-center gap-1.5 mb-2 sm:mb-4 flex-wrap">
                {isPositive
                    ? <TrendingUp className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                    : <TrendingDown className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                }
                <span className={`text-xs font-semibold ${isPositive ? "text-emerald-500" : "text-red-400"}`}>
                    {isPositive && !String(growth).startsWith("+") ? "+" : ""}{growth}
                </span>
                <span className="text-xs text-slate-400">{growthLabel}</span>
            </div>

            {/* Sparkline con área degradada */}
            <Sparkline
                chartData={chartData}
                hasData={hasData}
                gradId={gradId}
                lineColor={sparklineColor}
                glassTooltip={false}
                emptyLabel={{ className: "text-xs text-slate-300", text: "Sin actividad esta semana" }}
            />
        </div>
    );
};

export default StatCard;