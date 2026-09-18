import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Plus, Users, Lock, ClipboardList } from "lucide-react";
import { formatTime12h } from "@/lib/timeFormat";

const STATUS_STYLES = {
    scheduled: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", dot: "bg-blue-500" },
    pending: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", dot: "bg-amber-500" },
    completed: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", dot: "bg-emerald-500" },
    break: { bg: "bg-slate-100", border: "border-slate-200", text: "text-slate-400", dot: "bg-slate-300" },
};

const todayStr = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// Determina si un horario marcado como disponible ya pasó: la fecha es
// anterior a hoy, o es hoy pero la hora de inicio ya llegó o quedó
// atrás. Estos horarios se muestran bloqueados en vez de disponibles,
// ya que no se pueden agendar.
const isSlotInPast = (dateStr, startTime) => new Date(`${dateStr}T${startTime}:00`) <= new Date();

// Agenda de doctores o de enfermeras (nunca ambas a la vez): muestra pestañas por persona y
// una línea de tiempo del día. Un espacio disponible es clicable y precarga proveedor, fecha
// y hora en el formulario de registro rápido de citas (QuickAppointmentForm.jsx). Permanece
// vacía hasta que se elige un procedimiento ahí: recién con el procedimiento elegido se sabe
// si esta agenda debe mostrar doctores o enfermeras (requiresDoctorForProcedure, calculado en
// QuickAppointmentForm.jsx y levantado hasta el dashboard vía onProcedureInfoChange).
// Cuando el procedimiento requiere doctor Y enfermera de apoyo, esta agenda solo muestra
// doctores: la enfermera de apoyo se elige aparte, en la pestaña "Enfermera" del paso
// Encargados de ese mismo formulario (filtrada por el horario exacto ya elegido ahí, no por
// esta agenda). Esta agenda solo muestra enfermeras cuando el procedimiento no requiere
// doctor (la enfermera es la proveedora principal). agenda.doctors y agenda.nurses ya vienen
// filtrados por el backend a solo quienes tienen horario configurado (ver agendaService.js).
const DoctorsAgendaSection = ({ agenda, date, onDateChange, onSlotClick, loading, procedureChosen, requiresDoctorForProcedure }) => {
    const [activeKey, setActiveKey] = useState(null);

    const showDoctors = procedureChosen && requiresDoctorForProcedure;
    const showNurses = procedureChosen && !requiresDoctorForProcedure;

    // Filtro por slots.length también acá (no solo en agendaService.js): quien no tenga
    // ningún horario libre ese día no debe aparecer ni como pestaña ni con su nombre en la
    // lista, sin excepción.
    const providers = useMemo(() => {
        const doctors = showDoctors ? (agenda?.doctors || []).map((d) => ({ ...d, type: "doctor", key: `doctor-${d._id}` })) : [];
        const nurses = showNurses ? (agenda?.nurses || []).map((n) => ({ ...n, type: "nurse", key: `nurse-${n._id}` })) : [];
        return [...doctors, ...nurses].filter((p) => (p.slots?.length || 0) > 0);
    }, [agenda, showDoctors, showNurses]);

    const visibleProviders = activeKey
        ? providers.filter((p) => p.key === activeKey)
        : providers;

    const title = !procedureChosen ? "Agenda" : showDoctors ? "Agenda de doctores" : "Agenda de enfermeras";

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
            {/* w-full en móvil: en vez de dejar que el navegador de fecha compita por espacio
                junto al título en la misma línea (en una pantalla angosta, "jueves, 27 de
                agosto de 2026" más las dos flechas no cabe ahí), el título ocupa su propia
                línea y el navegador toma todo el ancho disponible debajo, con la fecha
                centrada entre las flechas. Desde sm: vuelven a compartir la misma línea. */}
            <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
                <h3 className="font-bold text-slate-800 text-sm">{title}</h3>
                <div className="flex items-center justify-between gap-2 w-full sm:w-auto">
                    <button type="button" onClick={() => shiftDate(-1)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 flex-shrink-0">
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-medium text-slate-600 capitalize text-center flex-1 sm:flex-none sm:min-w-[160px]">{dateLabel}</span>
                    <button type="button" onClick={() => shiftDate(1)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 flex-shrink-0">
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {!procedureChosen ? (
                <div className="py-10 flex flex-col items-center justify-center text-center gap-2">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                        <ClipboardList className="w-6 h-6 text-slate-300" />
                    </div>
                    <p className="text-xs text-slate-400 max-w-[220px]">
                        Elige un procedimiento en el registro rápido de citas para ver aquí la agenda disponible.
                    </p>
                </div>
            ) : (
                <>
                    {/* Pestañas de doctores/enfermeras */}
                    <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
                        <button
                            type="button"
                            onClick={() => setActiveKey(null)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold flex-shrink-0 transition-colors ${
                                !activeKey ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                            }`}
                        >
                            <Users className="w-3.5 h-3.5" /> Todos
                        </button>
                        {providers.map((p) => (
                            <button
                                key={p.key}
                                type="button"
                                onClick={() => setActiveKey(p.key)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold flex-shrink-0 transition-colors ${
                                    activeKey === p.key ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                }`}
                            >
                                {p.img_url
                                    ? <img src={p.img_url} alt="" className="w-5 h-5 rounded-full object-cover" />
                                    : <span className="w-5 h-5 rounded-full bg-slate-300" />}
                                {p.type === "doctor" ? `Dr. ${p.name} ${p.last_name}` : `${p.name} ${p.last_name}`}
                            </button>
                        ))}
                    </div>

                    {loading ? (
                        <div className="py-10 text-center text-xs text-slate-400">Cargando agenda...</div>
                    ) : providers.length === 0 ? (
                        <div className="py-10 text-center text-xs text-slate-400">
                            No hay {showDoctors ? "doctores" : "enfermeras"} con horario configurado.
                        </div>
                    ) : (
                        <div className="space-y-5 max-h-[420px] overflow-y-auto pr-1">
                            {visibleProviders.map((p) => (
                                <div key={p.key}>
                                    {!activeKey && (
                                        <p className="text-xs font-bold text-slate-500 mb-2">
                                            {p.type === "doctor" ? `Dr. ${p.name} ${p.last_name}` : `${p.name} ${p.last_name}`}
                                        </p>
                                    )}
                                    {/* El backend ya excluye por completo a quien no tenga ningún bloque este día
                                        (agendaService.js), así que aquí siempre hay al menos un slot que mostrar. */}
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                        {p.slots.map((slot) => {
                                            const style = STATUS_STYLES[slot.status] || STATUS_STYLES.break;
                                            const isPast = isSlotInPast(date, slot.start_time);
                                            const isAvailable = slot.status === "available" && !isPast;
                                            const isLocked = slot.status === "available" && isPast;
                                            return (
                                                <button
                                                    key={slot.start_time}
                                                    type="button"
                                                    disabled={!isAvailable}
                                                    onClick={() => isAvailable && onSlotClick({
                                                        doctorId: p.type === "doctor" ? p._id : undefined,
                                                        nurseId: p.type === "nurse" ? p._id : undefined,
                                                        date,
                                                        start_time: slot.start_time,
                                                        end_time: slot.end_time,
                                                    })}
                                                    title={isLocked ? "Este horario ya pasó y no se puede agendar" : undefined}
                                                    className={`relative text-left rounded-lg border px-2.5 py-2 transition-colors ${
                                                        isAvailable
                                                            ? "border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 cursor-pointer"
                                                            : isLocked
                                                            ? "bg-slate-50 border-slate-100 cursor-not-allowed"
                                                            : `${style.bg} ${style.border} cursor-default`
                                                    }`}
                                                >
                                                    <span className="text-[10px] font-semibold text-slate-400 block">{formatTime12h(slot.start_time)} - {formatTime12h(slot.end_time)}</span>
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
                                </div>
                            ))}
                        </div>
                    )}
                </>
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
