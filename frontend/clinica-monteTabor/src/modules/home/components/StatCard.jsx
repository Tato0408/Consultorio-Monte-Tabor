import { TrendingUp, TrendingDown } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, Tooltip } from "recharts";

const StatCard = ({ icon, iconBg, label, value, growth, growthLabel, sparkline, sparklineColor }) => {
    const isPositive = parseFloat(String(growth).replace("%", "").replace("+", "")) >= 0;
    const raw        = sparkline?.length ? sparkline : [0, 0, 0, 0, 0, 0, 0];
    const chartData  = raw.map((v, i) => ({ v, i }));
    const hasData    = raw.some((v) => v > 0);
    const gradId     = `sk-${sparklineColor.replace("#", "")}`;

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col">
            {/* Icon + label + value */}
            <div className="flex items-start gap-3 mb-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
                    {icon}
                </div>
                <div>
                    <p className="text-xs text-slate-400 font-medium leading-tight">{label}</p>
                    <p className="text-2xl font-bold text-slate-800 mt-0.5 leading-none">{value}</p>
                </div>
            </div>

            {/* Growth */}
            <div className="flex items-center gap-1.5 mb-4">
                {isPositive
                    ? <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                    : <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                }
                <span className={`text-xs font-semibold ${isPositive ? "text-emerald-500" : "text-red-400"}`}>
                    {isPositive && !String(growth).startsWith("+") ? "+" : ""}{growth}
                </span>
                <span className="text-xs text-slate-400">{growthLabel}</span>
            </div>

            {/* Sparkline con área degradada */}
            {hasData ? (
                <div className="h-16 w-full mt-auto">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 6, right: 12, left: 12, bottom: 4 }}>
                            <defs>
                                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%"   stopColor={sparklineColor} stopOpacity={0.25} />
                                    <stop offset="100%" stopColor={sparklineColor} stopOpacity={0}    />
                                </linearGradient>
                            </defs>
                            <Tooltip
                                content={({ active, payload }) =>
                                    active && payload?.length
                                        ? (
                                            <div
                                                className="px-2 py-1 rounded-lg text-xs font-semibold text-white shadow-md"
                                                style={{ backgroundColor: sparklineColor }}
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
                                stroke={sparklineColor}
                                strokeWidth={2.5}
                                fill={`url(#${gradId})`}
                                dot={false}
                                activeDot={{ r: 4, fill: sparklineColor, stroke: "#fff", strokeWidth: 2 }}
                                isAnimationActive={false}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <div className="h-16 w-full mt-auto flex items-center justify-center">
                    <p className="text-xs text-slate-300">Sin actividad esta semana</p>
                </div>
            )}
        </div>
    );
};

export default StatCard;
