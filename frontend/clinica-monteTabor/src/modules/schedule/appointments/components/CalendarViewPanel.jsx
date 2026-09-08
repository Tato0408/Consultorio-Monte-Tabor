import { useMemo, useState } from "react";
import { Eye } from "lucide-react";
import WeekGrid from "./WeekGrid";
import {
    generateDaySlots,
    formatSlot12,
    computeGridWindow,
    DAY_NAMES_SHORT,
} from "../lib/scheduleGrid";

// Panel derecho fijo: "Vista de tu calendario". Se dibuja solo con lo que se
// configura a la izquierda. El tab alterna entre "Mi horario" (la semana con
// sus bloques y pausas dibujada en la cuadricula) y "Vista del paciente" (las
// horas exactas que se ofrecen para agendar, sin cuadricula). Sustituye a
// SchedulePreview y su modal.
const PREVIEW_DURATION = 30;

const PillTabs = ({ value, onChange, options }) => (
    <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl">
        {options.map((opt) => {
            const active = value === opt.value;
            return (
                <button
                    key={opt.value}
                    type="button"
                    onClick={() => onChange(opt.value)}
                    className="flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-colors"
                    style={{
                        background: active ? "#fff" : "transparent",
                        color: active ? "#1e293b" : "#64748b",
                    }}
                >
                    {opt.label}
                </button>
            );
        })}
    </div>
);

const CalendarViewPanel = ({ availability = [], breaks = [], bufferTime = 10 }) => {
    const [view, setView] = useState("mine");
    const availableDays = availability.filter((d) => d.is_available);
    const [selectedDay, setSelectedDay] = useState(availableDays[0]?.day ?? 1);

    const { startMin, rowCount } = useMemo(
        () => computeGridWindow(availability, breaks),
        [availability, breaks]
    );

    const patient = view === "patient";
    const dayConfig = availability.find((d) => d.day === selectedDay);
    const slots = dayConfig ? generateDaySlots(dayConfig, breaks, bufferTime, PREVIEW_DURATION) : [];

    // Cantidad de horarios para agendar por dia, con la duracion y el buffer
    // reales, para el resumen de la vista del paciente.
    const countByDay = useMemo(() => {
        const map = {};
        for (const d of availability) {
            map[d.day] = d.is_available ? generateDaySlots(d, breaks, bufferTime, PREVIEW_DURATION).length : 0;
        }
        return map;
    }, [availability, breaks, bufferTime]);

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 lg:sticky lg:top-4">
            <div className="flex items-center gap-2.5 mb-1">
                <span
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: "#eaf4fd", color: "#2E6DA4" }}
                >
                    <Eye className="w-4 h-4" />
                </span>
                <p className="text-[15px] font-bold text-slate-800">Vista de tu calendario</p>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
                {patient
                    ? "Las horas exactas que un paciente puede elegir al agendar."
                    : "La semana que configuraste, con tus bloques y pausas."}
            </p>

            <div className="mb-4">
                <PillTabs
                    value={view}
                    onChange={setView}
                    options={[
                        { value: "mine", label: "Mi horario" },
                        { value: "patient", label: "Vista del paciente" },
                    ]}
                />
            </div>

            {!patient ? (
                <>
                    <WeekGrid
                        weeklyAvailability={availability}
                        breaks={breaks}
                        startMin={startMin}
                        rowCount={rowCount}
                        mode="view"
                    />

                    <div className="flex gap-4 mt-3 text-[10.5px] text-slate-400 flex-wrap">
                        <span className="inline-flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded" style={{ background: "#ADD7F6" }} />
                            Disponible
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <span
                                className="w-3 h-3 rounded"
                                style={{ background: "repeating-linear-gradient(45deg, #fbbf24, #fbbf24 3px, #fef3c7 3px, #fef3c7 6px)" }}
                            />
                            Pausa
                        </span>
                    </div>
                </>
            ) : (
                <>
                    {/* Resumen semanal y selector de dia en una sola fila: cada
                        boton muestra los cupos de ese dia y al pulsarlo abre sus
                        horarios abajo. */}
                    <div className="grid grid-cols-7 gap-1">
                        {DAY_NAMES_SHORT.map((name, dayIndex) => {
                            const active = dayIndex === selectedDay;
                            const count = countByDay[dayIndex] || 0;
                            return (
                                <button
                                    key={name}
                                    type="button"
                                    onClick={() => setSelectedDay(dayIndex)}
                                    className="flex flex-col items-center py-1.5 rounded-lg border transition-colors"
                                    style={{
                                        background: active ? "#ADD7F6" : count ? "#fff" : "#f8fafc",
                                        color: active ? "#0f3a63" : count ? "#475569" : "#cbd5e1",
                                        borderColor: active ? "#ADD7F6" : "#e2e8f0",
                                    }}
                                >
                                    <span className="text-[10px] font-bold">{name}</span>
                                    <span className="text-[9px] mt-0.5">{count ? `${count}` : "-"}</span>
                                </button>
                            );
                        })}
                    </div>
                    <p className="text-[10px] text-slate-300 mt-1.5 text-center">Cupos por día</p>

                    <div className="mt-3 pt-3 border-t border-slate-100">
                        <p className="text-xs font-semibold text-slate-600 mb-2">
                            Horarios del {DAY_NAMES_SHORT[selectedDay]}
                        </p>

                        {slots.length > 0 ? (
                            <div className="grid grid-cols-3 gap-1.5 max-h-64 overflow-y-auto pr-1">
                                {slots.map((s, i) => (
                                    <div
                                        key={i}
                                        className="flex flex-col items-center py-1.5 px-1 rounded-lg bg-slate-50 border border-slate-100"
                                    >
                                        <span className="text-[11px] font-bold text-slate-700">{formatSlot12(s.start)}</span>
                                        <span className="text-[8.5px] text-slate-400">a {formatSlot12(s.end)}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-[11.5px] text-slate-400 py-3 text-center">
                                Ese día no tiene horas para agendar.
                            </p>
                        )}

                        <p className="text-[10.5px] text-slate-300 mt-2.5 leading-relaxed">
                            Referencia: 30 min por cita (Consulta Médica General). Para un
                            procedimiento, la duración la define el procedimiento elegido al agendar.
                            {bufferTime > 0 ? ` Con ${bufferTime} min de espacio entre citas.` : ""}
                        </p>
                    </div>
                </>
            )}
        </div>
    );
};

export default CalendarViewPanel;
