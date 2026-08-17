import { useNavigate } from "react-router-dom";
import { History, Check } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

// Convierte un timestamp ISO en un texto relativo, por ejemplo hace
// 15m o hace 1h 20m.
const formatRelativeTime = (isoDate) => {
    const diffMs = Date.now() - new Date(isoDate).getTime();
    const totalMinutes = Math.max(Math.floor(diffMs / 60000), 0);

    if (totalMinutes < 1) return "Hace un momento";
    if (totalMinutes < 60) return `Hace ${totalMinutes}m`;

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return minutes > 0 ? `Hace ${hours}h ${minutes}m` : `Hace ${hours}h`;
};

const formatPatientName = (patient) =>
    patient ? `${patient.name} ${patient.last_name}` : "Paciente";

const AppointmentHistoryPanel = ({ history, isLoading, error }) => {
    const navigate = useNavigate();
    const { hasPermission } = useAuth();
    const canEdit = hasPermission("calendar.consultations", "update");

    return (
        <div className="bg-white border border-slate-100 rounded-xl p-5 w-full">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 font-semibold text-slate-800">
                    <History size={16} className="text-[#0b66d6]" />
                    Historial del día
                </div>
                <button
                    onClick={() => navigate("/calendar/consultations")}
                    className="text-xs text-[#0b66d6] font-medium hover:underline"
                >
                    Ver todo
                </button>
            </div>

            <div className="space-y-2">
                {isLoading && (
                    <p className="text-sm text-slate-400 py-4 text-center">Cargando...</p>
                )}

                {!isLoading && error && (
                    <p className="text-sm text-red-500 py-4 text-center">No se pudo cargar el historial.</p>
                )}

                {!isLoading && !error && history.length === 0 && (
                    <p className="text-sm text-slate-400 py-4 text-center">Aún no hay consultas finalizadas hoy.</p>
                )}

                {!isLoading && !error && history.map((appt) => (
                    <div
                        key={appt._id}
                        className="flex items-center gap-3 border border-slate-100 rounded-lg px-3 py-2.5"
                    >
                        <span className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                            <Check size={14} className="text-emerald-600" />
                        </span>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">
                                {formatPatientName(appt.patient_id)}
                            </p>
                            <p className="text-xs text-slate-400">
                                Finalizado {formatRelativeTime(appt.updatedAt)}
                            </p>
                        </div>
                        <button
                            onClick={() =>
                                navigate(`/calendar/consultations/${appt._id}${canEdit ? "" : "?mode=view"}`)
                            }
                            className="border border-slate-200 rounded-md px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 shrink-0"
                        >
                            {canEdit ? "Editar" : "Ver registro"}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AppointmentHistoryPanel;