const BUFFER_OPTIONS      = [0, 5, 10, 15, 20, 30];
const MIN_BLOCK_OPTIONS   = [15, 30, 45, 60];

const ScheduleSettingsSection = ({ bufferTime, minBlockDuration, allowOutsideHours, onChange }) => (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
        <div className="mb-4">
            <h3 className="text-sm font-semibold text-slate-800">5. Configuración de agenda</h3>
            <p className="text-xs text-slate-400 mt-0.5">Ajusta cómo se gestionarán tus citas.</p>
        </div>

        <div className="flex flex-col gap-5">
            {/* Tiempo entre citas */}
            <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-600">Tiempo entre citas</label>
                <select
                    value={bufferTime}
                    onChange={e => onChange("buffer_time", Number(e.target.value))}
                    className="border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                    {BUFFER_OPTIONS.map(v => <option key={v} value={v}>{v === 0 ? "Sin tiempo de espera" : `${v} minutos`}</option>)}
                </select>
            </div>

            {/* Duración mínima de bloque */}
            <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-600">Duración mínima de bloque</label>
                <select
                    value={minBlockDuration}
                    onChange={e => onChange("min_block_duration", Number(e.target.value))}
                    className="border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                    {MIN_BLOCK_OPTIONS.map(v => <option key={v} value={v}>{v} minutos</option>)}
                </select>
            </div>

            {/* Permitir citas fuera del horario */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-xs font-medium text-slate-600">Permitir citas fuera del horario</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                        Los pacientes podrán solicitar citas fuera de tu horario para aprobación.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => onChange("allow_outside_hours", !allowOutsideHours)}
                    className={`w-10 h-6 rounded-full flex-shrink-0 transition-colors relative mt-0.5 ${allowOutsideHours ? "bg-blue-500" : "bg-slate-200"}`}
                >
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${allowOutsideHours ? "translate-x-5" : "translate-x-1"}`} />
                </button>
            </div>
        </div>
    </div>
);

export default ScheduleSettingsSection;
