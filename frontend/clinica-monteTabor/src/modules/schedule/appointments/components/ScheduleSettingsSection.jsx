import { useState } from "react";
import { Plus, X } from "lucide-react";
import CollapsibleCard from "@/components/ui/CollapsibleCard";

const DEFAULT_BUFFER_OPTIONS  = [0, 5, 10, 15, 20, 30];
const DEFAULT_BLOCK_DURATIONS = [15, 30, 45, 60];

// bufferOptions y blockDurations son propias de cada doctor (se
// guardan en su Schedule), cada quien arma su propia lista de tiempos
// entre citas y duraciones de bloque, y esas mismas listas son las
// que se reflejan al agendar una cita con ese doctor específico.
const ScheduleSettingsSection = ({
    bufferTime,
    bufferOptions,
    blockDurations,
    allowOutsideHours,
    onChange,
    editing,
}) => {
    const [newBuffer, setNewBuffer] = useState("");
    const [newDuration, setNewDuration] = useState("");

    const options   = bufferOptions?.length ? bufferOptions : DEFAULT_BUFFER_OPTIONS;
    const durations = blockDurations?.length ? blockDurations : DEFAULT_BLOCK_DURATIONS;

    const addBufferOption = () => {
        const val = Number(newBuffer);
        if (!Number.isFinite(val) || val < 0 || val > 120 || options.includes(val)) { setNewBuffer(""); return; }
        onChange("buffer_time_options", [...options, val].sort((a, b) => a - b));
        onChange("buffer_time", val);
        setNewBuffer("");
    };

    const addDuration = () => {
        const val = Number(newDuration);
        if (!Number.isFinite(val) || val <= 0 || val > 480 || durations.includes(val)) { setNewDuration(""); return; }
        onChange("block_durations", [...durations, val].sort((a, b) => a - b));
        setNewDuration("");
    };

    // Siempre debe quedar al menos una duración disponible para poder agendar citas.
    const removeDuration = (val) => {
        if (durations.length <= 1) return;
        onChange("block_durations", durations.filter((d) => d !== val));
    };

    return (
        <CollapsibleCard
            title="4. Configuración de agenda"
            subtitle="Ajusta cuanto será el tiempo entre citas, las duraciones de bloque disponibles y si permites citas fuera de tu horario."
            defaultOpen={false}
        >
            <div className="flex flex-col gap-5">
                {/* Tiempo entre citas */}
                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-slate-600">Tiempo entre citas</label>
                    <select
                        value={bufferTime}
                        onChange={e => onChange("buffer_time", Number(e.target.value))}
                        className="border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                        {options.map(v => <option key={v} value={v}>{v === 0 ? "Sin tiempo de espera" : `${v} minutos`}</option>)}
                    </select>

                    {/* Agrega un tiempo propio a la lista de opciones, se selecciona
                        automáticamente. */}
                    {editing && (
                        <div className="flex items-center gap-2 mt-1">
                            <input
                                type="number"
                                min={0}
                                max={120}
                                placeholder="Agregar otro (min)"
                                value={newBuffer}
                                onChange={e => setNewBuffer(e.target.value.replace(/[^0-9]/g, ""))}
                                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addBufferOption(); } }}
                                className="w-36 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
                            />
                            <button
                                type="button"
                                onClick={addBufferOption}
                                disabled={!newBuffer}
                                className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <Plus className="w-3.5 h-3.5" /> Agregar
                            </button>
                        </div>
                    )}
                </div>

                {/* Duración de bloque: lista libre, no un único valor. Cada duración
                    que se agregue queda disponible para elegir al agendar una cita. */}
                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-slate-600">Duraciones de bloque disponibles</label>
                    <p className="text-[11px] text-slate-400">Estas son las duraciones que se podrán elegir al agendar una cita contigo.</p>

                    <div className="flex flex-wrap gap-1.5 mt-1">
                        {durations.map(d => (
                            <span key={d} className="flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
                                {d} min
                                {editing && (
                                    <button
                                        type="button"
                                        onClick={() => removeDuration(d)}
                                        disabled={durations.length <= 1}
                                        className="p-0.5 rounded-full hover:bg-blue-100 disabled:opacity-30 disabled:cursor-not-allowed"
                                        title={durations.length <= 1 ? "Debe quedar al menos una duración" : "Quitar"}
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </span>
                        ))}
                    </div>

                    {editing && (
                        <div className="flex items-center gap-2 mt-1">
                            <input
                                type="number"
                                min={1}
                                max={480}
                                placeholder="Ej. 20 (min)"
                                value={newDuration}
                                onChange={e => setNewDuration(e.target.value.replace(/[^0-9]/g, ""))}
                                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addDuration(); } }}
                                className="w-36 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
                            />
                            <button
                                type="button"
                                onClick={addDuration}
                                disabled={!newDuration}
                                className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <Plus className="w-3.5 h-3.5" /> Agregar duración
                            </button>
                        </div>
                    )}
                </div>

                {/* Permitir citas fuera del horario */}
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-xs font-medium text-slate-600">Permitir citas fuera del horario</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                            Los pacientes podrán solicitar citas fuera de tu horario para aprobación.
                        </p>
                    </div>
                    {/* El punto necesita una posición base explícita (left-1), sin ella
                        queda a merced de la posición estática por defecto del navegador
                        y termina saliéndose del check al activarlo. Con left-1 junto
                        con translate-x-4 el recorrido queda siempre dentro del track
                        de 40px (4px de margen a cada lado). */}
                    <button
                        type="button"
                        onClick={() => onChange("allow_outside_hours", !allowOutsideHours)}
                        className={`w-10 h-6 rounded-full flex-shrink-0 transition-colors relative mt-0.5 ${allowOutsideHours ? "bg-blue-500" : "bg-slate-200"}`}
                    >
                        <span className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${allowOutsideHours ? "translate-x-4" : "translate-x-0"}`} />
                    </button>
                </div>
            </div>
        </CollapsibleCard>
    );
};

export default ScheduleSettingsSection;
