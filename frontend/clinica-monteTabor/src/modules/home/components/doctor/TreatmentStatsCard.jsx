import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";

const TreatmentStatsCard = ({ treatments = [] }) => {
    const navigate = useNavigate();
    const maxCount = treatments.length > 0 ? Math.max(...treatments.map((t) => t.count)) : 1;

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-4">
            <p className="text-sm font-bold text-slate-800">Tratamiento más recurrente</p>

            {treatments.length === 0 ? (
                <p className="text-xs text-slate-300 text-center py-8">Sin datos de tratamiento</p>
            ) : (
                <div className="flex flex-col gap-3 flex-1">
                    {treatments.map((t, i) => (
                        <div key={i} className="flex flex-col gap-1">
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-xs text-slate-700 font-medium truncate flex-1">{t.name}</p>
                                <p className="text-xs text-slate-400 flex-shrink-0 tabular-nums">
                                    {t.count} <span className="text-slate-300">({t.pct}%)</span>
                                </p>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full bg-blue-500 transition-all"
                                    style={{ width: `${maxCount > 0 ? (t.count / maxCount) * 100 : 0}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <button
                onClick={() => navigate("/reports/appointments")}
                className="flex items-center gap-1 text-xs text-blue-600 font-semibold hover:underline mt-auto"
            >
                Ver reporte completo <ChevronRight className="w-3.5 h-3.5" />
            </button>
        </div>
    );
};

export default TreatmentStatsCard;
