import { useNavigate } from "react-router-dom";
import { Plus, ChevronRight, User } from "lucide-react";

const STATUS_STYLES = {
    confirmada:   { label: "Confirmada",  cls: "bg-green-100 text-green-700" },
    confirmed:    { label: "Confirmada",  cls: "bg-green-100 text-green-700" },
    scheduled:    { label: "Confirmada",  cls: "bg-green-100 text-green-700" },
    "in-progress":{ label: "En consulta", cls: "bg-blue-100  text-blue-700"  },
    "in_progress":{ label: "En consulta", cls: "bg-blue-100  text-blue-700"  },
    attending:    { label: "En consulta", cls: "bg-blue-100  text-blue-700"  },
    pending:      { label: "Pendiente",   cls: "bg-amber-100 text-amber-700" },
    pendiente:    { label: "Pendiente",   cls: "bg-amber-100 text-amber-700" },
    cancelled:    { label: "Cancelada",   cls: "bg-red-100   text-red-700"   },
};

const getStatus = (raw = "") => STATUS_STYLES[raw.toLowerCase()] ?? { label: raw, cls: "bg-slate-100 text-slate-600" };

const todayLabel = () =>
    new Date().toLocaleDateString("es-SV", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

const TodayAppointmentsList = ({ appointments = [] }) => {
    const navigate = useNavigate();

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <p className="text-sm font-bold text-slate-800">Próximas citas del día</p>
                <button
                    onClick={() => navigate("/calendar/appointments")}
                    className="text-xs text-blue-600 font-semibold hover:underline"
                >
                    Ver todas
                </button>
            </div>

            {/* Date */}
            <div className="flex items-center gap-1.5 px-5 pb-3">
                <span className="text-xs text-slate-400 capitalize">{todayLabel()}</span>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
                {appointments.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-10">Sin citas para hoy</p>
                ) : (
                    appointments.map((appt) => {
                        const { label, cls } = getStatus(appt.status);
                        const patName = appt.patient
                            ? `${appt.patient.name || ""} ${appt.patient.last_name || ""}`.trim()
                            : "Paciente";

                        return (
                            <div
                                key={appt._id}
                                onClick={() => navigate("/calendar/appointments")}
                                className="flex items-center gap-4 px-5 py-3.5 border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer"
                            >
                                {/* Time */}
                                <div className="flex-shrink-0 text-right w-12">
                                    <p className="text-xs font-bold text-blue-600 leading-tight">{appt.start_time}</p>
                                    <p className="text-xs text-slate-400 leading-tight">{appt.end_time}</p>
                                </div>

                                {/* Avatar */}
                                {appt.patient?.img_url
                                    ? <img src={appt.patient.img_url} alt={patName} className="w-8 h-8 rounded-full object-cover flex-shrink-0 ring-2 ring-slate-100" />
                                    : <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                                        <User className="w-4 h-4 text-slate-400" />
                                      </div>
                                }

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-slate-800 truncate">{patName}</p>
                                    <p className="text-xs text-slate-400 truncate">{appt.type}</p>
                                </div>

                                {/* Status */}
                                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full flex-shrink-0 ${cls}`}>
                                    {label}
                                </span>

                                <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
                            </div>
                        );
                    })
                )}
            </div>

            {/* New appointment button */}
            <div className="px-5 py-4 border-t border-slate-50">
                <button
                    onClick={() => navigate("/calendar/appointments")}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Nueva cita
                </button>
            </div>
        </div>
    );
};

export default TodayAppointmentsList;
