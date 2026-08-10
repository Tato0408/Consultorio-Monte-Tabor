const fmt12 = (t) => {
    if (!t) return "";
    const [h, m] = t.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    return `${String(h % 12 || 12).padStart(2,"0")}:${String(m).padStart(2,"0")} ${ampm}`;
};

const generateSlots = (availability, breaks, bufferTime, duration) => {
    const slots = [];
    for (const day of availability) {
        if (!day.is_available) continue;
        for (const block of day.time_blocks) {
            const [sh, sm] = block.start_time.split(":").map(Number);
            const [eh, em] = block.end_time.split(":").map(Number);
            let cur = sh * 60 + sm;
            const end = eh * 60 + em;
            while (cur + duration <= end) {
                const slotEnd = cur + duration;
                const inBreak = breaks.some(br => {
                    if (br.day !== day.day) return false;
                    const [bh, bm] = br.start_time.split(":").map(Number);
                    const [xh, xm] = br.end_time.split(":").map(Number);
                    return cur < (xh * 60 + xm) && slotEnd > (bh * 60 + bm);
                });
                if (!inBreak) {
                    const hh = String(Math.floor(cur / 60)).padStart(2, "0");
                    const mm = String(cur % 60).padStart(2, "0");
                    slots.push(`${hh}:${mm}`);
                }
                cur += duration + (bufferTime || 0);
            }
        }
        // Solo tomamos un día representativo para la vista previa
        if (slots.length > 0) break;
    }
    return slots.slice(0, 5);
};

// Los tipos de cita ahora son un catálogo global (solo nombre + color, sin duración — ver
// AppointmentTypesSection.jsx), así que ya no se puede generar una vista previa POR tipo. En su
// lugar, se muestra un ejemplo genérico usando la duración mínima de bloque configurada
// (min_block_duration), que es la única duración que sigue viviendo en el horario del doctor.
const SchedulePreview = ({ availability, breaks, bufferTime, minBlockDuration }) => {
    const duration = minBlockDuration || 30;
    const slots = generateSlots(availability, breaks, bufferTime, duration);

    return (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
            <div className="mb-4">
                <h3 className="text-sm font-semibold text-slate-800">Vista previa de tu agenda (ejemplo)</h3>
                <p className="text-xs text-slate-400 mt-0.5">Así se verían tus horarios disponibles, usando la duración mínima de bloque configurada ({duration} min).</p>
            </div>

            {slots.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">Sin slots disponibles con la configuración actual</p>
            ) : (
                <div className="flex flex-wrap gap-2">
                    {slots.map(s => (
                        <span key={s} className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-medium">
                            {fmt12(s)}
                        </span>
                    ))}
                    <span className="px-2.5 py-1 rounded-lg bg-slate-50 text-slate-400 text-xs">...</span>
                </div>
            )}
        </div>
    );
};

export default SchedulePreview;
