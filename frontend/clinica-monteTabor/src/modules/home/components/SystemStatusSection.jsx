import { ShieldCheck, AlertTriangle } from "lucide-react";

const fmtTime = (d) =>
    d ? d.toLocaleTimeString("es-SV", { hour: "numeric", minute: "2-digit" }) : "—";

// Estado real, no decorativo: "healthy" refleja si las llamadas del dashboard (getStats,
// getDoctorStatus, getUserStats, getReportStats) terminaron todas sin error, y la hora es
// el momento real en que esos datos se cargaron — no un valor inventado.
const SystemStatusSection = ({ healthy = true, updatedAt }) => (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-6">
        <h2 className="text-base font-bold text-slate-800 mb-3">Estado del sistema</h2>
        <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${healthy ? "bg-emerald-100" : "bg-amber-100"}`}>
                {healthy
                    ? <ShieldCheck className="w-4.5 h-4.5 text-emerald-600" />
                    : <AlertTriangle className="w-4.5 h-4.5 text-amber-600" />
                }
            </div>
            <div>
                <p className={`text-sm font-semibold ${healthy ? "text-emerald-700" : "text-amber-700"}`}>
                    {healthy ? "Todo en orden" : "Algunos datos no cargaron"}
                </p>
                <p className="text-xs text-slate-400">Última actualización: {fmtTime(updatedAt)}</p>
            </div>
        </div>
    </div>
);

export default SystemStatusSection;