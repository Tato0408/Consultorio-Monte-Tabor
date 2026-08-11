import { useState } from "react";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import InputField from "@/components/ui/InputField";

const DAYS = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];

const BreaksSection = ({ breaks, availability, onChange }) => {
    const [editing, setEditing] = useState(null);
    const [form, setForm]       = useState({ day: 1, start_time: "12:00", end_time: "13:00" });

    const availableDays = availability.filter(d => d.is_available).map(d => d.day);

    const startNew  = () => { setForm({ day: availableDays[0] ?? 1, start_time: "12:00", end_time: "13:00" }); setEditing("new"); };
    const startEdit = (i) => { setForm({ ...breaks[i] }); setEditing(i); };
    const cancel    = () => setEditing(null);

    const save = () => {
        if (editing === "new") onChange([...breaks, form]);
        else onChange(breaks.map((b, i) => i === editing ? form : b));
        setEditing(null);
    };

    const remove = (i) => onChange(breaks.filter((_, idx) => idx !== i));

    const fmt = (t) => {
        if (!t) return "—";
        const [h, m] = t.split(":").map(Number);
        const ampm = h >= 12 ? "PM" : "AM";
        return `${String(h % 12 || 12).padStart(2,"0")}:${String(m).padStart(2,"0")} ${ampm}`;
    };

    return (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
            {/* Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-4">
                <div>
                    <h3 className="text-sm font-semibold text-slate-800">2. Descansos</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Agrega los horarios de descanso dentro de tu jornada.</p>
                </div>
                <button
                    onClick={startNew}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 text-blue-600 text-xs font-medium hover:bg-blue-50 whitespace-nowrap self-start sm:flex-shrink-0"
                >
                    <Plus className="w-3.5 h-3.5" /> Agregar descanso
                </button>
            </div>

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
                        {DAYS.map((name, dayIdx) => {
                            if (!availableDays.includes(dayIdx)) return null;
                            const brk    = breaks.find(b => b.day === dayIdx);
                            const brkIdx = breaks.findIndex(b => b.day === dayIdx);
                            return (
                                <tr key={dayIdx} className="border-b border-slate-50">
                                    <td className="py-2.5 text-slate-700 text-sm">{name}</td>
                                    <td className="py-2.5 text-slate-500 text-sm">{brk ? fmt(brk.start_time) : "—"}</td>
                                    <td className="py-2.5 text-slate-500 text-sm">{brk ? fmt(brk.end_time) : "—"}</td>
                                    <td className="py-2.5">
                                        {brk && (
                                            <div className="flex gap-1">
                                                <button onClick={() => startEdit(brkIdx)} className="p-1 text-slate-400 hover:text-blue-500">
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </button>
                                                <button onClick={() => remove(brkIdx)} className="p-1 text-slate-400 hover:text-red-500">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}

                        {editing !== null && (
                            <tr className="bg-blue-50/40 border-b border-blue-100">
                                <td className="py-2.5 pr-2">
                                    <select
                                        className="text-sm border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
                                        value={form.day}
                                        onChange={e => setForm(p => ({ ...p, day: Number(e.target.value) }))}>
                                        {availableDays.map(d => <option key={d} value={d}>{DAYS[d]}</option>)}
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
        </div>
    );
};

export default BreaksSection;
