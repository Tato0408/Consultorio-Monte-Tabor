import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Plus, Users, Lock } from "lucide-react";

const STATUS_STYLES = {
    scheduled: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", dot: "bg-blue-500" },
    pending: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", dot: "bg-amber-500" },
    completed: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", dot: "bg-emerald-500" },
    break: { bg: "bg-slate-100", border: "border-slate-200", text: "text-slate-400", dot: "bg-slate-300" },
};

const todayStr = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// Un slot "disponible" pero cuya hora de inicio ya llegó o quedó atrás (fecha pasada, o para hoy
// una hora ya en curso/pasada, ej. son las 13:15 -> el bloque de las 13:00 ya no se puede agendar)
// no debe poder seleccionarse. Se muestra bloqueado (candado), igual que un permiso protegido en
// la pantalla de Roles y Permisos, en vez de dejar la animación de "Disponible" que confunde.
const isSlotInPast = (dateStr, startTime) => new Date(`${dateStr}T${startTime}:00`) <= new Date();

// Agenda de doctores: pestañas por doctor + línea de tiempo del día. Un espacio "Disponible"
// es clicable y precarga doctor/fecha/hora en el formulario de "Registro rápido de citas".
const DoctorsAgendaSection = ({ agenda, date, onDateChange, onSlotClick, loading }) => {
    const doctors = agenda?.doctors || [];
    const [activeDoctorId, setActiveDoctorId] = useState(null);

    const visibleDoctors = activeDoctorId
        ? doctors.filter((d) => d._id === activeDoctorId)
        : doctors;

    const dateLabel = useMemo(() => {
        const [y, m, d] = date.split("-").map(Number);
        return new Date(y, m - 1, d).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    }, [date]);

    const shiftDate = (deltaDays) => {
        const [y, m, d] = date.split("-").map(Number);
        const next = new Date(y, m - 1, d + deltaDays);
        onDateChange(todayStr(next));
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h3 className="font-bold text-slate-800 text-sm">Agenda de doctores</h3>
                <div className="flex items-center gap-2">
                    <button type="button" onClick={() => shiftDate(-1)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-medium text-slate-600 capitalize min-w-[160px] text-center">{dateLabel}</span>
                    <button type="button" onClick={() => shiftDate(1)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Pestañas de doctores */}
            <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
                <button
                    type="button"
                    onClick={() => setActiveDoctorId(null)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold flex-shrink-0 transition-colors ${
                        !activeDoctorId ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    }`}
                >
                    <Users className="w-3.5 h-3.5" /> Todos
                </button>
                {doctors.map((doc) => (
                    <button
                        key={doc._id}
                        type="button"
                        onClick={() => setActiveDoctorId(doc._id)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold flex-shrink-0 transition-colors ${
                            activeDoctorId === doc._id ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                        }`}
                    >
                        {doc.img_url
                            ? <img src={doc.img_url} alt="" className="w-5 h-5 rounded-full object-cover" />
                            : <span className="w-5 h-5 rounded-full bg-slate-300" />}
                        Dr. {doc.name} {doc.last_name}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="py-10 text-center text-xs text-slate-400">Cargando agenda...</div>
            ) : doctors.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400">No hay citas agendadas actualmente</div>
            ) : (
                <div className="space-y-5 max-h-[420px] overflow-y-auto pr-1">
                    {visibleDoctors.map((doc) => (
                        <div key={doc._id}>
                            {!activeDoctorId && (
                                <p className="text-xs font-bold text-slate-500 mb-2">Dr. {doc.name} {doc.last_name}</p>
                            )}
                            {!doc.hasSchedule || doc.slots.length === 0 ? (
                                <p className="text-xs text-slate-300 italic">El doctor no cuenta con horarios actualmente</p>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                    {doc.slots.map((slot) => {
                                        const style = STATUS_STYLES[slot.status] || STATUS_STYLES.break;
                                        const isPast = isSlotInPast(date, slot.start_time);
                                        const isAvailable = slot.status === "available" && !isPast;
                                        const isLocked = slot.status === "available" && isPast;
                                        return (
                                            <button
                                                key={slot.start_time}
                                                type="button"
                                                disabled={!isAvailable}
                                                onClick={() => isAvailable && onSlotClick({ doctorId: doc._id, date, start_time: slot.start_time, end_time: slot.end_time })}
                                                title={isLocked ? "Este horario ya pasó y no se puede agendar" : undefined}
                                                className={`relative text-left rounded-lg border px-2.5 py-2 transition-colors ${
                                                    isAvailable
                                                        ? "border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 cursor-pointer"
                                                        : isLocked
                                                        ? "bg-slate-50 border-slate-100 cursor-not-allowed"
                                                        : `${style.bg} ${style.border} cursor-default`
                                                }`}
                                            >
                                                <span className="text-[10px] font-semibold text-slate-400 block">{slot.start_time}</span>
                                                {isAvailable ? (
                                                    <span className="flex items-center gap-1 text-[11px] text-slate-400">
                                                        <Plus className="w-3 h-3" /> Disponible
                                                    </span>
                                                ) : isLocked ? (
                                                    <span className="flex items-center gap-1 text-[11px] text-slate-300">
                                                        <Lock className="w-3 h-3" /> No disponible
                                                    </span>
                                                ) : slot.status === "break" ? (
                                                    <span className="text-[11px] text-slate-400">Descanso</span>
                                                ) : (
                                                    <span className={`text-[11px] font-semibold truncate block ${style.text}`}>
                                                        {slot.appointment?.patientName || "Ocupado"}
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-50 flex-wrap">
                {[
                    { key: "scheduled", label: "Confirmada" },
                    { key: "pending", label: "Pendiente" },
                    { key: "completed", label: "Completada" },
                ].map((s) => (
                    <span key={s.key} className="flex items-center gap-1.5 text-[11px] text-slate-400">
                        <span className={`w-2 h-2 rounded-full ${STATUS_STYLES[s.key].dot}`} /> {s.label}
                    </span>
                ))}
                <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <span className="w-2 h-2 rounded-full border border-dashed border-slate-300" /> Disponible
                </span>
            </div>
        </div>
    );
};

export default DoctorsAgendaSection;
