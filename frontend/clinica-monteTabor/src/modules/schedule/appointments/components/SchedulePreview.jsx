import { useState } from "react";
import { Eye, X, Clock } from "lucide-react";
import CollapsibleCard from "@/components/ui/CollapsibleCard";

const DAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

const fmt12 = (mins) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    const ampm = h >= 12 ? "PM" : "AM";
    return `${String(h % 12 || 12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`;
};

// Genera los bloques de UN día (start/end en minutos desde medianoche), igual que
// scheduleController.getAvailableSlots del backend: duración fija + espacio de buffer_time entre
// cada bloque, saltando los descansos configurados para ese día.
const generateDaySlots = (dayConfig, breaks, bufferTime, duration) => {
    if (!dayConfig?.is_available) return [];
    const slots = [];
    for (const block of dayConfig.time_blocks || []) {
        const [sh, sm] = block.start_time.split(":").map(Number);
        const [eh, em] = block.end_time.split(":").map(Number);
        let cur = sh * 60 + sm;
        const end = eh * 60 + em;
        while (cur + duration <= end) {
            const slotEnd = cur + duration;
            const inBreak = breaks.some((br) => {
                if (br.day !== dayConfig.day) return false;
                const [bh, bm] = br.start_time.split(":").map(Number);
                const [xh, xm] = br.end_time.split(":").map(Number);
                return cur < xh * 60 + xm && slotEnd > bh * 60 + bm;
            });
            if (!inBreak) slots.push({ start: cur, end: slotEnd });
            cur += duration + (bufferTime || 0);
        }
    }
    return slots;
};

// Antes era un bloque de "chips" estático, calculado con una sola duración fija y sin forma de
// ver los demás días — ahora es un botón que abre un modal parecido al selector de horarios de
// "Agendar cita", donde el doctor puede alternar entre sus días disponibles y sus propias
// duraciones de bloque configuradas (ver ScheduleSettingsSection.jsx) para ver cómo se combinan
// con su tiempo entre citas real.
const SchedulePreview = ({ availability, breaks, bufferTime, blockDurations }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedDay, setSelectedDay] = useState(null);
    const [selectedDuration, setSelectedDuration] = useState(null);

    const availableDays = (availability || []).filter((d) => d.is_available);
    const durations = blockDurations?.length ? blockDurations : [30];

    const openPreview = () => {
        setSelectedDay(availableDays[0]?.day ?? null);
        setSelectedDuration(durations[0]);
        setIsOpen(true);
    };

    const dayConfig = availability?.find((d) => d.day === selectedDay);
    const slots = dayConfig ? generateDaySlots(dayConfig, breaks || [], bufferTime, selectedDuration) : [];

    return (
        <CollapsibleCard
            title="Vista previa de tu agenda"
            subtitle="Revisa cómo se ven tus horarios semanales combinando tu tiempo entre citas y tus duraciones de bloque."
            defaultOpen={false}
        >
            <button
                type="button"
                onClick={openPreview}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-blue-200 text-blue-600 text-sm font-semibold hover:bg-blue-50 transition-colors w-fit"
            >
                <Eye className="w-4 h-4" />
                Ver vista previa
            </button>

            {isOpen && (
                <div
                    className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4"
                    onClick={() => setIsOpen(false)}
                >
                    <div
                        className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-base font-bold text-slate-900">Vista previa de tu agenda</h2>
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {availableDays.length === 0 ? (
                            <p className="text-sm text-slate-400 text-center py-10">
                                No tienes días disponibles configurados todavía.
                            </p>
                        ) : (
                            <>
                                {/* Selector de día */}
                                <div className="flex flex-wrap gap-1.5 mb-3">
                                    {availableDays.map((d) => (
                                        <button
                                            key={d.day}
                                            type="button"
                                            onClick={() => setSelectedDay(d.day)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                                                selectedDay === d.day
                                                    ? "bg-blue-600 text-white border-blue-600"
                                                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                            }`}
                                        >
                                            {DAYS[d.day]}
                                        </button>
                                    ))}
                                </div>

                                {/* Selector de duración — las mismas que configuró en "Duraciones de bloque
                                    disponibles" (ScheduleSettingsSection.jsx). */}
                                {durations.length > 1 && (
                                    <div className="flex items-center gap-2 mb-4">
                                        <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                        <div className="flex flex-wrap gap-1.5">
                                            {durations.map((d) => (
                                                <button
                                                    key={d}
                                                    type="button"
                                                    onClick={() => setSelectedDuration(d)}
                                                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                                                        selectedDuration === d
                                                            ? "bg-slate-800 text-white border-slate-800"
                                                            : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                                                    }`}
                                                >
                                                    {d} min
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Grid de horarios resultante */}
                                {slots.length === 0 ? (
                                    <p className="text-xs text-slate-400 text-center py-8">
                                        Sin horarios disponibles con esta configuración.
                                    </p>
                                ) : (
                                    <div className="grid grid-cols-3 gap-2 max-h-72 overflow-y-auto pr-1">
                                        {slots.map((s, i) => (
                                            <div
                                                key={i}
                                                className="flex flex-col items-center py-2.5 px-2 rounded-xl text-xs font-semibold bg-slate-50 border border-slate-100 text-slate-700"
                                            >
                                                <span>{fmt12(s.start)}</span>
                                                <span className="text-[10px] text-slate-400 font-medium mt-0.5">
                                                    hasta {fmt12(s.end)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <p className="text-[11px] text-slate-400 mt-4">
                                    {bufferTime > 0
                                        ? `Con ${bufferTime} min de espacio entre cada cita.`
                                        : "Sin espacio entre citas."}
                                </p>
                            </>
                        )}
                    </div>
                </div>
            )}
        </CollapsibleCard>
    );
};

export default SchedulePreview;
