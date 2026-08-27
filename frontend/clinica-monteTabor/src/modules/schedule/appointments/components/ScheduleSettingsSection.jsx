import { useState } from "react";
import { Plus } from "lucide-react";
import CollapsibleCard from "@/components/ui/CollapsibleCard";

const DEFAULT_BUFFER_OPTIONS  = [0, 5, 10, 15, 20, 30];

// bufferOptions es propia de cada doctor (se guarda en su Schedule):
// cada quien arma su propia lista de tiempos entre citas, y esa misma
// lista es la que se refleja al agendar una cita con ese doctor
// específico. La duración de cada cita ya no es una opción del
// doctor: siempre la define el procedimiento elegido, calculada en el
// propio formulario de agendar cita.
const ScheduleSettingsSection = ({
    bufferTime,
    bufferOptions,
    allowOutsideHours,
    onChange,
    editing,
}) => {
    const [newBuffer, setNewBuffer] = useState("");

    const options = bufferOptions?.length ? bufferOptions : DEFAULT_BUFFER_OPTIONS;

    const addBufferOption = () => {
        const val = Number(newBuffer);
        if (!Number.isFinite(val) || val < 0 || val > 120 || options.includes(val)) { setNewBuffer(""); return; }
        onChange("buffer_time_options", [...options, val].sort((a, b) => a - b));
        onChange("buffer_time", val);
        setNewBuffer("");
    };

    return (
        <CollapsibleCard
            title="4. Configuración de agenda"
            subtitle="Ajusta cuanto será el tiempo entre citas y si permites citas fuera de tu horario."
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
