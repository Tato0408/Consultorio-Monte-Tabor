import { useNavigate } from "react-router-dom";
import { ChevronRight, CalendarClock } from "lucide-react";

// Mismo mapeo de estados que AppointmentsCalendar.jsx (el calendario real de citas), para
// que el badge de estado se vea y diga exactamente lo mismo en todo el sistema.
const STATUS_BADGES = {
    scheduled: "bg-blue-100 text-blue-700",
    confirmed: "bg-green-100 text-green-700",
    completed: "bg-slate-100 text-slate-600",
    cancelled: "bg-red-100 text-red-600",
    pending:   "bg-amber-100 text-amber-700",
    no_show:   "bg-slate-100 text-slate-500",
    expired:   "bg-orange-100 text-orange-600",
};
const STATUS_LABELS = {
    scheduled: "Programada",
    confirmed: "Confirmada",
    completed: "Completada",
    cancelled: "Cancelada",
    pending:   "Pendiente",
    no_show:   "No se presentó",
    expired:   "Vencida",
};

const fmt12 = (t) => {
    if (!t) return "—";
    const [h, m] = t.split(":").map(Number);
    return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};

const personName = (p) => (p ? `${p.name || ""} ${p.last_name || ""}`.trim() : "—");

// Muestra todas las citas de hoy en orden cronológico, en una sola
// agenda compacta.
const TodayAgendaSection = ({ counts, appointments }) => {
    const navigate = useNavigate();
    const list = appointments || [];
    const visible = list.slice(0, 6);
    const c = counts || { inConsultation: 0, available: 0 };

    return (
        // h-full: para repartir el alto disponible mitad y mitad con Accesos rápidos (ver
        // AdminDashboard.jsx) en vez de quedarse con su alto natural de contenido.
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-6 flex flex-col h-full">
            <div className="flex items-center justify-between mb-1">
                <h2 className="text-base font-bold text-slate-800">Agenda del día</h2>
                <button
                    onClick={() => navigate("/calendar/appointments")}
                    className="flex items-center gap-1 text-xs text-blue-600 font-semibold hover:underline flex-shrink-0"
                >
                    Ver calendario <ChevronRight className="w-3.5 h-3.5" />
                </button>
            </div>

            {/* Pulso rápido: cuántos doctores están en consulta y cuántos disponibles */}
            <div className="flex items-center gap-3 text-xs text-slate-400 mb-4 pb-4 border-b border-slate-50">
                <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    {c.inConsultation} en consulta
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {c.available} disponibles
                </span>
            </div>

            {visible.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-8 text-center gap-2">
                    <CalendarClock className="w-8 h-8 text-slate-200" />
                    <p className="text-sm text-slate-400">No hay citas programadas para hoy.</p>
                </div>
            ) : (
                // Las clases flex-1, min-h-0 y overflow-y-auto muestran tantas citas
                // como quepan en la mitad de alto que le toca (ver h-full arriba) y
                // dejan scroll interno para el resto, en vez de estirar la tarjeta
                // entera o desbordarse por debajo del botón de ver todas.
                <div className="flex-1 min-h-0 overflow-y-auto flex flex-col divide-y divide-slate-50">
                    {/* La hora y el estado van juntos en su propia fila arriba, ya
                        que es contenido corto que cabe holgado. El paciente y el
                        doctor bajan a su propia fila con todo el ancho de la tarjeta
                        para ellos solos, en vez de compartir espacio apretado entre
                        la hora y la etiqueta de estado. Así el nombre completo cabe
                        y solo hace salto de línea (con break-words, sin truncate)
                        cuando es realmente muy largo. */}
                    {visible.map((appt) => (
                        <div key={appt._id} className="flex flex-col gap-1 py-3">
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-bold text-slate-700 tabular-nums">
                                    {fmt12(appt.start_time)}
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold flex-shrink-0 ${STATUS_BADGES[appt.status] || "bg-slate-100 text-slate-600"}`}>
                                    {STATUS_LABELS[appt.status] || appt.status}
                                </span>
                            </div>
                            <p className="text-sm font-semibold text-slate-800 break-words">{personName(appt.patient)}</p>
                            <p className="text-xs text-slate-400 break-words">
                                Dr. {appt.doctor?.name || ""} {appt.doctor?.last_name || ""}
                            </p>
                        </div>
                    ))}
                </div>
            )}

            <button
                onClick={() => navigate("/calendar/appointments")}
                className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-center gap-1 text-xs text-blue-600 font-semibold hover:underline"
            >
                Ver todas las citas <ChevronRight className="w-3.5 h-3.5" />
            </button>
        </div>
    );
};

export default TodayAgendaSection;