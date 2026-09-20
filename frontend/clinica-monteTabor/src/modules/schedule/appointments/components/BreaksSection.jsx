import { useState } from "react";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import InputField from "@/components/ui/InputField";
import ScheduleCard from "./ScheduleCard";
import { showError } from "@/lib/alerts";

const DAYS = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];

const toMinutes = (t) => {
    if (!t) return 0;
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
};

// editing (prop): modo edición de la página completa (ver
// ScheduleConfig.jsx), controla si los botones de agregar, editar y
// eliminar existen. rowEditing (state): cuál fila de la tabla está
// siendo editada ahora mismo, solo alcanzable cuando editing es true.
const BreaksSection = ({ breaks, availability, onChange, editing }) => {
    const [rowEditing, setRowEditing] = useState(null);
    const [form, setForm]       = useState({ day: 1, start_time: "12:00", end_time: "13:00" });

    const availableDays = availability.filter(d => d.is_available).map(d => d.day);

    // Días que ya tienen una pausa asignada a OTRA fila (excluye la que se
    // está editando ahora mismo, para no quitarle su propio día de las
    // opciones). Antes el selector ofrecía cualquier día disponible sin
    // importar si ya tenía una pausa: guardar una segunda para el mismo día
    // dejaba la primera como la única visible/editable, mientras la
    // segunda seguía bloqueando ese horario en el cálculo real de slots,
    // sin ninguna forma de verla ni borrarla desde aquí.
    const daysUsedByOtherRows = new Set(
        breaks.filter((_, idx) => idx !== rowEditing).map(b => b.day)
    );
    const selectableDays = availableDays.filter(d => !daysUsedByOtherRows.has(d));
    const canAddBreak = availableDays.some(d => !new Set(breaks.map(b => b.day)).has(d));

    const startNew  = () => {
        const freeDay = availableDays.find(d => !breaks.some(b => b.day === d));
        setForm({ day: freeDay ?? availableDays[0] ?? 1, start_time: "12:00", end_time: "13:00" });
        setRowEditing("new");
    };
    const startEdit = (i) => { setForm({ ...breaks[i] }); setRowEditing(i); };
    const cancel    = () => setRowEditing(null);

    const save = () => {
        // A diferencia de Excepciones, esta fila no tenía ninguna validación: un
        // rango invertido se guardaba sin aviso y simplemente no generaba slots
        // ese bloque.
        if (toMinutes(form.end_time) <= toMinutes(form.start_time)) {
            showError("La hora de fin debe ser posterior a la de inicio.");
            return;
        }
        if (rowEditing === "new") {
            // Defensa extra por si ya hubiera datos viejos duplicados: en
            // vez de sumar una pausa más a ese día, reemplaza la existente.
            const existingIdx = breaks.findIndex(b => b.day === form.day);
            onChange(existingIdx === -1 ? [...breaks, form] : breaks.map((b, i) => i === existingIdx ? form : b));
        } else {
            onChange(breaks.map((b, i) => i === rowEditing ? form : b));
        }
        setRowEditing(null);
    };

    const remove = (i) => onChange(breaks.filter((_, idx) => idx !== i));

    const fmt = (t) => {
        if (!t) return "—";
        const [h, m] = t.split(":").map(Number);
        const ampm = h >= 12 ? "PM" : "AM";
        return `${String(h % 12 || 12).padStart(2,"0")}:${String(m).padStart(2,"0")} ${ampm}`;
    };

    return (
        <ScheduleCard
            number={2}
            title="Pausas del día"
            subtitle="Las horas en las que no atiendes aunque sea tu jornada, como el almuerzo."
            actions={
                editing && (
                    <button
                        onClick={startNew}
                        disabled={!canAddBreak}
                        title={!canAddBreak ? "Ya hay una pausa en cada día disponible" : undefined}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium whitespace-nowrap flex-shrink-0 transition-colors hover:bg-[#eaf4fd] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                        style={{ borderColor: "#cfe4f7", color: "#2E6DA4" }}
                    >
                        <Plus className="w-3.5 h-3.5" /> Agregar pausa
                    </button>
                )
            }
        >
            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[320px]">
                    <thead>
                        <tr className="border-b border-slate-100">
                            {["Día","Inicio","Fin","Acciones"].map(h => (
                                <th key={h} className="text-left text-xs text-slate-400 font-normal pb-2">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {/* Antes se recorría DAYS y se tomaba solo breaks.find(...) por
                            día: si por un dato viejo había dos pausas el mismo día, la
                            segunda quedaba invisible e imposible de borrar, aunque
                            siguiera bloqueando ese horario en el cálculo real de slots.
                            Ahora se listan TODAS las pausas guardadas para ese día, para
                            que cualquier duplicado ya existente se pueda ver y eliminar. */}
                        {availableDays.map((dayIdx) => {
                            const dayBreaks = breaks
                                .map((b, idx) => ({ ...b, idx }))
                                .filter(b => b.day === dayIdx);

                            if (dayBreaks.length === 0) {
                                return (
                                    <tr key={dayIdx} className="border-b border-slate-50">
                                        <td className="py-2.5 text-slate-700 text-sm">{DAYS[dayIdx]}</td>
                                        <td className="py-2.5 text-slate-500 text-sm">—</td>
                                        <td className="py-2.5 text-slate-500 text-sm">—</td>
                                        <td className="py-2.5" />
                                    </tr>
                                );
                            }

                            return dayBreaks.map((brk, i) => (
                                <tr key={`${dayIdx}-${brk.idx}`} className="border-b border-slate-50">
                                    <td className="py-2.5 text-slate-700 text-sm">{i === 0 ? DAYS[dayIdx] : ""}</td>
                                    <td className="py-2.5 text-slate-500 text-sm">{fmt(brk.start_time)}</td>
                                    <td className="py-2.5 text-slate-500 text-sm">{fmt(brk.end_time)}</td>
                                    <td className="py-2.5">
                                        {editing && (
                                            <div className="flex gap-1">
                                                <button onClick={() => startEdit(brk.idx)} className="p-1 text-slate-400 hover:text-[#2E6DA4]">
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </button>
                                                <button onClick={() => remove(brk.idx)} className="p-1 text-slate-400 hover:text-red-500">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ));
                        })}

                        {rowEditing !== null && (
                            <tr className="border-b" style={{ background: "#f4f9fe", borderColor: "#cfe4f7" }}>
                                <td className="py-2.5 pr-2">
                                    <select
                                        className="text-sm border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#ADD7F6]"
                                        value={form.day}
                                        onChange={e => setForm(p => ({ ...p, day: Number(e.target.value) }))}>
                                        {selectableDays.map(d => <option key={d} value={d}>{DAYS[d]}</option>)}
                                    </select>
                                </td>
                                <td className="py-2.5 pr-2">
                                    <InputField type="time" value={form.start_time}
                                        onChange={e => setForm(p => ({ ...p, start_time: e.target.value }))} />
                                </td>
                                <td className="py-2.5 pr-2">
                                    <InputField type="time" value={form.end_time}
                                        onChange={e => setForm(p => ({ ...p, end_time: e.target.value }))} />
                                </td>
                                <td className="py-2.5">
                                    <button onClick={save} className="p-1 text-green-600 hover:text-green-700"><Check className="w-4 h-4" /></button>
                                    <button onClick={cancel} className="p-1 text-slate-400 hover:text-red-400 ml-1"><X className="w-4 h-4" /></button>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </ScheduleCard>
    );
};

export default BreaksSection;
