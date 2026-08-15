import { useState } from "react";
import { Plus, Trash2, ChevronDown } from "lucide-react";
import CollapsibleCard from "@/components/ui/CollapsibleCard";

const DAYS = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];

const TimeInput = ({ value, onChange }) => (
    <input
        type="time"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 bg-white transition-all"
    />
);

// La clase left-0.5 explícita junto con translate-x-4 (en vez de
// depender de la posición estática por defecto y translate-x-5) usa
// el mismo ajuste que ScheduleSettingsSection: el punto siempre queda
// dentro del track de 40px, nunca se sale al activarlo.
const Toggle = ({ checked, onChange }) => (
    <button
        type="button"
        onClick={onChange}
        className={`relative inline-flex w-10 h-5 rounded-full transition-colors flex-shrink-0 ${checked ? "bg-blue-500" : "bg-slate-200"}`}
    >
        <span className={`absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${checked ? "translate-x-4" : "translate-x-0"}`} />
    </button>
);

const fmtBlock = (b) => `${b.start_time}–${b.end_time}`;

const WeeklyAvailabilitySection = ({ availability, onChange, editing }) => {
    // Cada día disponible tiene su propio despliegue, independiente
    // del de los demás días, para que la card no se sienta tan larga.
    // Todos arrancan colapsados y solo se abre uno cuando el usuario
    // recién activa ese día (ver toggleDay). Usa un Set de índices de
    // día, no un objeto por día, porque solo importa si está abierto
    // o no, no su contenido.
    const [openDays, setOpenDays] = useState(() => new Set());

    const toggleOpen = (dayIdx) => {
        setOpenDays(prev => {
            const next = new Set(prev);
            if (next.has(dayIdx)) next.delete(dayIdx);
            else next.add(dayIdx);
            return next;
        });
    };

    const update = (dayIdx, patch) =>
        onChange(availability.map(d => d.day === dayIdx ? { ...d, ...patch } : d));

    const toggleDay = (dayIdx, isAvailable) => {
        const day = availability.find(d => d.day === dayIdx);
        update(dayIdx, {
            is_available: isAvailable,
            time_blocks: isAvailable && (!day?.time_blocks || day.time_blocks.length === 0)
                ? [{ start_time: "08:00", end_time: "17:00" }]
                : day?.time_blocks ?? [],
        });
        // Al activar un día se abre su despliegue para que el usuario
        // vea y edite el bloque recién creado sin tener que buscarlo.
        // Al desactivar no hace falta tocar openDays, sin
        // is_available no se muestra el despliegue de todos modos.
        if (isAvailable) setOpenDays(prev => new Set(prev).add(dayIdx));
    };

    const addBlock = (dayIdx) => {
        const day = availability.find(d => d.day === dayIdx);
        update(dayIdx, { time_blocks: [...(day?.time_blocks || []), { start_time: "08:00", end_time: "12:00" }] });
    };

    const updateBlock = (dayIdx, blockIdx, field, val) => {
        const day = availability.find(d => d.day === dayIdx);
        update(dayIdx, { time_blocks: day.time_blocks.map((b, i) => i === blockIdx ? { ...b, [field]: val } : b) });
    };

    const removeBlock = (dayIdx, blockIdx) => {
        const day = availability.find(d => d.day === dayIdx);
        update(dayIdx, { time_blocks: day.time_blocks.filter((_, i) => i !== blockIdx) });
    };

    return (
        <CollapsibleCard
            title="1. Disponibilidad semanal"
            subtitle="Configura los días y bloques de tiempo en los que estás disponible."
            defaultOpen={false}
        >
            <div className="divide-y divide-slate-50">
                {availability.map(dayConfig => {
                    const isOpen = openDays.has(dayConfig.day);
                    return (
                        <div key={dayConfig.day} className="py-3 first:pt-0 last:pb-0">
                            {/* Fila del día */}
                            <div className="flex items-center gap-3">
                                <Toggle
                                    checked={dayConfig.is_available}
                                    onChange={() => toggleDay(dayConfig.day, !dayConfig.is_available)}
                                />
                                <span className={`text-sm font-medium w-24 flex-shrink-0 ${dayConfig.is_available ? "text-slate-800" : "text-slate-400"}`}>
                                    {DAYS[dayConfig.day]}
                                </span>
                                {!dayConfig.is_available && (
                                    <span className="text-xs text-slate-400">No disponible</span>
                                )}
                                {/* El despliegue por día solo existe si el día está activado, si
                                    no hay bloques que mostrar, no hay nada que desplegar. */}
                                {dayConfig.is_available && (
                                    <>
                                        {!isOpen && (
                                            <span className="text-xs text-slate-400 truncate flex-1">
                                                {dayConfig.time_blocks?.length
                                                    ? dayConfig.time_blocks.map(fmtBlock).join(", ")
                                                    : "Sin bloques"}
                                            </span>
                                        )}
                                        {/* Usa un div y no un button para que siga siendo clickeable
                                            aunque la sección esté dentro de un <fieldset disabled> en
                                            modo de solo lectura (ver ScheduleConfig.jsx). Expandir o
                                            colapsar es solo visual, no edita nada, así que no debe
                                            bloquearse junto con el resto del formulario. */}
                                        <div
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => toggleOpen(dayConfig.day)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" || e.key === " ") {
                                                    e.preventDefault();
                                                    toggleOpen(dayConfig.day);
                                                }
                                            }}
                                            className="ml-auto p-1 -m-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 cursor-pointer flex-shrink-0 transition-colors"
                                        >
                                            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ease-out ${isOpen ? "rotate-180" : ""}`} />
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Bloques de tiempo */}
                            {dayConfig.is_available && isOpen && (
                                <div className="mt-2 ml-[52px] flex flex-col gap-2">
                                    {dayConfig.time_blocks.map((block, bi) => (
                                        <div key={bi} className="flex items-center gap-2 flex-wrap">
                                            <TimeInput
                                                value={block.start_time}
                                                onChange={v => updateBlock(dayConfig.day, bi, "start_time", v)}
                                            />
                                            <span className="text-slate-400 text-sm">–</span>
                                            <TimeInput
                                                value={block.end_time}
                                                onChange={v => updateBlock(dayConfig.day, bi, "end_time", v)}
                                            />
                                            {editing && dayConfig.time_blocks.length > 1 && (
                                                <button
                                                    onClick={() => removeBlock(dayConfig.day, bi)}
                                                    className="p-1 text-slate-300 hover:text-red-400 transition-colors"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    {editing && (
                                        <button
                                            onClick={() => addBlock(dayConfig.day)}
                                            className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 font-medium w-fit mt-0.5 transition-colors"
                                        >
                                            <Plus className="w-3.5 h-3.5" /> Agregar bloque
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </CollapsibleCard>
    );
};

export default WeeklyAvailabilitySection;
