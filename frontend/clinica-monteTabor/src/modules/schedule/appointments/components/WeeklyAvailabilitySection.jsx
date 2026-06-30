import { Plus, Trash2 } from "lucide-react";

const DAYS = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];

const TimeInput = ({ value, onChange }) => (
    <input
        type="time"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 bg-white transition-all"
    />
);

const Toggle = ({ checked, onChange }) => (
    <button
        type="button"
        onClick={onChange}
        className={`relative inline-flex w-10 h-5 rounded-full transition-colors flex-shrink-0 ${checked ? "bg-blue-500" : "bg-slate-200"}`}
    >
        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
    </button>
);

const WeeklyAvailabilitySection = ({ availability, onChange }) => {
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
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
            <div className="mb-4">
                <h3 className="text-sm font-semibold text-slate-800">2. Disponibilidad semanal</h3>
                <p className="text-xs text-slate-400 mt-0.5">Configura los días y bloques de tiempo en los que estás disponible.</p>
            </div>

            <div className="divide-y divide-slate-50">
                {availability.map(dayConfig => (
                    <div key={dayConfig.day} className="py-3 first:pt-0 last:pb-0">
                        {/* Fila del día */}
                        <div className="flex items-center gap-3">
                            <Toggle
                                checked={dayConfig.is_available}
                                onChange={() => toggleDay(dayConfig.day, !dayConfig.is_available)}
                            />
                            <span className={`text-sm font-medium w-24 ${dayConfig.is_available ? "text-slate-800" : "text-slate-400"}`}>
                                {DAYS[dayConfig.day]}
                            </span>
                            {!dayConfig.is_available && (
                                <span className="text-xs text-slate-400">No disponible</span>
                            )}
                        </div>

                        {/* Bloques de tiempo */}
                        {dayConfig.is_available && (
                            <div className="mt-2 ml-13 pl-1 flex flex-col gap-2">
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
                                        {dayConfig.time_blocks.length > 1 && (
                                            <button
                                                onClick={() => removeBlock(dayConfig.day, bi)}
                                                className="p-1 text-slate-300 hover:text-red-400 transition-colors"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <button
                                    onClick={() => addBlock(dayConfig.day)}
                                    className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 font-medium w-fit mt-0.5 transition-colors"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Agregar bloque
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default WeeklyAvailabilitySection;
