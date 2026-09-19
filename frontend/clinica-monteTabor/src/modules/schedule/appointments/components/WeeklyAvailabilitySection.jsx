import { useMemo, useState } from "react";
import { Plus, Trash2, List, CalendarDays } from "lucide-react";
import ScheduleCard from "./ScheduleCard";
import WeekGrid from "./WeekGrid";
import {
    DAY_NAMES_FULL,
    computeGridWindow,
    dayCellKinds,
    toggleCell,
    cellsToDay,
} from "../lib/scheduleGrid";

// Nombres de dias en español para las etiquetas del modo Lista.
const DAYS = DAY_NAMES_FULL;

const toMinutes = (t) => {
    if (!t) return 0;
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
};

// Input de hora con el estilo de la pantalla.
const TimeInput = ({ value, onChange }) => (
    <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#cfe4f7] focus:border-[#ADD7F6] transition-all"
    />
);

// Interruptor de un dia. Gris cuando esta apagado, azul Icy cuando esta
// encendido.
const Toggle = ({ checked, onChange }) => (
    <button
        type="button"
        onClick={onChange}
        className="relative inline-flex w-10 h-5 rounded-full transition-colors flex-shrink-0"
        style={{ background: checked ? "#ADD7F6" : "#e2e8f0" }}
    >
        <span
            className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform"
            style={{ transform: checked ? "translateX(16px)" : "translateX(0)" }}
        />
    </button>
);

// Grupo de pestanas visuales (no es un form control, para que siga siendo
// clickeable dentro del fieldset de solo lectura de la pantalla).
const TabGroup = ({ value, onChange, options }) => (
    <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl">
        {options.map((opt) => {
            const active = value === opt.value;
            return (
                <div
                    key={opt.value}
                    role="button"
                    tabIndex={0}
                    onClick={() => onChange(opt.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onChange(opt.value);
                        }
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer select-none transition-colors"
                    style={{
                        background: active ? "#fff" : "transparent",
                        color: active ? "#1e293b" : "#64748b",
                    }}
                >
                    {opt.icon}
                    {opt.label}
                </div>
            );
        })}
    </div>
);

const WeeklyAvailabilitySection = ({ availability, onChange, breaks = [], onBreaksChange, editing }) => {
    const [weekMode, setWeekMode] = useState("lista");
    const [paintMode, setPaintMode] = useState("avail");

    const { startMin, rowCount } = useMemo(
        () => computeGridWindow(availability, breaks),
        [availability, breaks]
    );

    // Modo Lista: helpers sobre weekly_availability.
    const update = (dayIdx, patch) =>
        onChange(availability.map((d) => (d.day === dayIdx ? { ...d, ...patch } : d)));

    const toggleDay = (dayIdx, isAvailable) => {
        const day = availability.find((d) => d.day === dayIdx);
        update(dayIdx, {
            is_available: isAvailable,
            time_blocks:
                isAvailable && (!day?.time_blocks || day.time_blocks.length === 0)
                    ? [{ start_time: "08:00", end_time: "17:00" }]
                    : day?.time_blocks ?? [],
        });
    };

    const addBlock = (dayIdx) => {
        const day = availability.find((d) => d.day === dayIdx);
        update(dayIdx, {
            time_blocks: [...(day?.time_blocks || []), { start_time: "08:00", end_time: "12:00" }],
        });
    };

    const updateBlock = (dayIdx, blockIdx, field, val) => {
        const day = availability.find((d) => d.day === dayIdx);
        update(dayIdx, {
            time_blocks: day.time_blocks.map((b, i) => (i === blockIdx ? { ...b, [field]: val } : b)),
        });
    };

    const removeBlock = (dayIdx, blockIdx) => {
        const day = availability.find((d) => d.day === dayIdx);
        update(dayIdx, { time_blocks: day.time_blocks.filter((_, i) => i !== blockIdx) });
    };

    // Modo Calendario: al pintar una celda se reconstruye ese dia completo a
    // partir de la cuadricula (queda alineado a 30 min) y se emite tanto el
    // cambio de disponibilidad como el de pausas.
    const handlePaintCell = (dayIdx, rowIdx, mode) => {
        if (!editing) return;
        const dayAvailability = availability.find((d) => d.day === dayIdx);
        const dayBreaks = breaks.filter((b) => b.day === dayIdx);
        const kinds = dayCellKinds(dayAvailability, dayBreaks, startMin, rowCount);
        const nextKinds = toggleCell(kinds, rowIdx, mode);
        const rebuilt = cellsToDay(nextKinds, startMin);

        onChange(
            availability.map((d) =>
                d.day === dayIdx
                    ? { ...d, is_available: rebuilt.is_available, time_blocks: rebuilt.time_blocks }
                    : d
            )
        );
        onBreaksChange?.([
            ...breaks.filter((b) => b.day !== dayIdx),
            ...rebuilt.breaks.map((b) => ({ ...b, day: dayIdx })),
        ]);
    };

    return (
        <ScheduleCard
            number={1}
            title="Tu semana"
            subtitle={
                weekMode === "lista"
                    ? "Enciende los días que atiendes y define de qué hora a qué hora."
                    : "Pinta en el calendario las horas que atiendes. Vuelve a pintar una celda para borrarla."
            }
            actions={
                <TabGroup
                    value={weekMode}
                    onChange={setWeekMode}
                    options={[
                        { value: "lista", label: "Lista", icon: <List className="w-3.5 h-3.5" /> },
                        { value: "calendario", label: "Calendario", icon: <CalendarDays className="w-3.5 h-3.5" /> },
                    ]}
                />
            }
        >
            {weekMode === "lista" ? (
                // Dos columnas desde md: la tarjeta ocupa el mismo ancho que sus vecinas (Pausas,
                // Excepciones, etc.), pero repartir los 7 días en 2 columnas usa ese ancho en vez
                // de dejarlo en blanco a la derecha de una sola columna angosta, y de paso la
                // tarjeta queda bastante más baja (7 filas pasan a ser 4). divide-y no funciona
                // bien en una cuadrícula de 2 columnas (la línea quedaría a mitad de fila), así
                // que cada celda lleva su propio borde inferior en su lugar.
                <div className="grid grid-cols-1 md:grid-cols-2 md:gap-x-8">
                    {availability.map((dayConfig) => (
                        <div key={dayConfig.day} className="py-3 border-b border-slate-50 last:border-b-0">
                            {/* flex-col en mobile: el toggle+día ocupaban tanto ancho junto a los
                                selectores de hora, que a cada uno ya no le quedaba lugar en la misma
                                línea que el "a" entre ambos, y terminaban apilados uno por fila. Al
                                bajar los horarios a su propia fila (debajo, a todo el ancho) en vez
                                de compartir fila con el toggle+día, "[hora] a [hora]" vuelve a caber
                                en una sola línea. En sm+ se mantiene la fila horizontal de siempre. */}
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
                                <div className="flex items-center gap-3 flex-shrink-0">
                                    <Toggle
                                        checked={dayConfig.is_available}
                                        onChange={() => toggleDay(dayConfig.day, !dayConfig.is_available)}
                                    />
                                    <span
                                        className="text-sm font-medium w-24 flex-shrink-0 sm:mt-0.5"
                                        style={{ color: dayConfig.is_available ? "#1e293b" : "#cbd5e1" }}
                                    >
                                        {DAYS[dayConfig.day]}
                                    </span>
                                </div>

                                {dayConfig.is_available ? (
                                    <div className="flex-1 flex flex-col gap-2">
                                        {(dayConfig.time_blocks || []).map((block, bi) => {
                                            // A diferencia de Excepciones, este bloque no validaba el rango: uno
                                            // invertido se guardaba sin aviso y simplemente no generaba slots
                                            // ese bloque.
                                            const rangoInvalido = block.start_time && block.end_time
                                                && toMinutes(block.end_time) <= toMinutes(block.start_time);
                                            return (
                                                <div key={bi} className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <TimeInput
                                                            value={block.start_time}
                                                            onChange={(v) => updateBlock(dayConfig.day, bi, "start_time", v)}
                                                        />
                                                        <span className="text-slate-400 text-sm">a</span>
                                                        <TimeInput
                                                            value={block.end_time}
                                                            onChange={(v) => updateBlock(dayConfig.day, bi, "end_time", v)}
                                                        />
                                                        {editing && dayConfig.time_blocks.length > 1 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => removeBlock(dayConfig.day, bi)}
                                                                className="p-1 text-slate-300 hover:text-red-400 transition-colors"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                    {rangoInvalido && (
                                                        <p className="text-xs text-red-500">La hora de fin debe ser posterior a la de inicio.</p>
                                                    )}
                                                </div>
                                            );
                                        })}
                                        {editing && (
                                            <button
                                                type="button"
                                                onClick={() => addBlock(dayConfig.day)}
                                                className="flex items-center gap-1 text-xs font-medium w-fit mt-0.5 transition-colors"
                                                style={{ color: "#2E6DA4" }}
                                            >
                                                <Plus className="w-3.5 h-3.5" /> Agregar bloque
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <span className="text-xs text-slate-300 italic mt-1">No atiende este día</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div>
                    <div className="flex items-center gap-2.5 mb-3">
                        <span className="text-xs text-slate-400">Pinta:</span>
                        <TabGroup
                            value={paintMode}
                            onChange={setPaintMode}
                            options={[
                                {
                                    value: "avail",
                                    label: "Disponible",
                                    icon: <span className="w-2.5 h-2.5 rounded-sm" style={{ background: "#ADD7F6" }} />,
                                },
                                {
                                    value: "break",
                                    label: "Pausa",
                                    icon: (
                                        <span
                                            className="w-2.5 h-2.5 rounded-sm"
                                            style={{
                                                background:
                                                    "repeating-linear-gradient(45deg, #f59e0b, #f59e0b 2px, #fde68a 2px, #fde68a 4px)",
                                            }}
                                        />
                                    ),
                                },
                            ]}
                        />
                    </div>

                    <WeekGrid
                        weeklyAvailability={availability}
                        breaks={breaks}
                        startMin={startMin}
                        rowCount={rowCount}
                        mode={editing ? "edit" : "view"}
                        paintMode={paintMode}
                        onPaintCell={handlePaintCell}
                    />

                    <div className="flex gap-4 mt-3 text-[11px] text-slate-400 flex-wrap">
                        <span className="inline-flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded" style={{ background: "#ADD7F6" }} /> Disponible
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <span
                                className="w-3 h-3 rounded"
                                style={{
                                    background:
                                        "repeating-linear-gradient(45deg, #fbbf24, #fbbf24 3px, #fef3c7 3px, #fef3c7 6px)",
                                }}
                            />
                            Pausa
                        </span>
                        {!editing && (
                            <span className="text-slate-300">Pulsa &ldquo;Editar horario&rdquo; para pintar.</span>
                        )}
                    </div>

                    <p className="text-[11px] text-slate-400 mt-3 leading-relaxed">
                        La cuadrícula pinta en pasos de 30 minutos, la duración de referencia
                        de una Consulta Médica General. Para un procedimiento, la duración la
                        define el procedimiento elegido al agendar. Para horarios que no caen
                        en pasos de 30 minutos, usa el modo Lista.
                    </p>
                </div>
            )}
        </ScheduleCard>
    );
};

export default WeeklyAvailabilitySection;
