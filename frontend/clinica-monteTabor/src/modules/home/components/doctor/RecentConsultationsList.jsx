import { useNavigate } from "react-router-dom";
import { User } from "lucide-react";

const BORDER_COLORS = ["border-blue-400", "border-teal-400", "border-indigo-400", "border-cyan-400", "border-violet-400"];

const fmtDate = (raw) => {
    if (!raw) return "";
    const d = new Date(raw);
    return d.toLocaleDateString("es-SV", { day: "2-digit", month: "2-digit", year: "numeric" });
};

const RecentConsultationsList = ({ consultations = [], doctorName = "" }) => {
    const navigate = useNavigate();

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-bold text-slate-800">Historial de consultas recientes</p>
                <button
                    onClick={() => navigate("/calendar/appointments")}
                    className="text-xs text-blue-600 font-semibold hover:underline"
                >
                    Ver todas
                </button>
            </div>

            {consultations.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">Sin consultas recientes</p>
            ) : (
                <div className="flex flex-col gap-2">
                    {consultations.map((c, i) => {
                        const patName = c.patient
                            ? `${c.patient.name || ""} ${c.patient.last_name || ""}`.trim()
                            : "Paciente";
                        const borderCls = BORDER_COLORS[i % BORDER_COLORS.length];

                        return (
                            <div
                                key={c._id}
                                className={`flex items-center gap-3 p-3 rounded-xl border-l-4 bg-slate-50 ${borderCls}`}
                            >
                                {/* Avatar */}
                                {c.patient?.img_url
                                    ? <img src={c.patient.img_url} alt={patName} className="w-10 h-10 rounded-full object-cover flex-shrink-0 ring-2 ring-white" />
                                    : <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-violet-100 flex items-center justify-center flex-shrink-0">
                                        <User className="w-5 h-5 text-blue-500" />
                                      </div>
                                }

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <p className="text-sm font-semibold text-slate-800 truncate">{patName}</p>
                                        <p className="text-xs text-slate-400 flex-shrink-0 tabular-nums">{fmtDate(c.date)}</p>
                                    </div>
                                    <p className="text-xs text-slate-500 truncate">{c.diagnosis || c.type || "Consulta"}</p>
                                    {doctorName && (
                                        <p className="text-xs text-slate-400 truncate">Dr. {doctorName}</p>
                                    )}
                                </div>

                                {/* Button */}
                                <button
                                    onClick={() => navigate("/calendar/appointments")}
                                    className="flex-shrink-0 text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600 transition-colors font-medium"
                                >
                                    Ver detalles
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default RecentConsultationsList;
