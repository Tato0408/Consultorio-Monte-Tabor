import { useState } from "react";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import InputField from "@/components/ui/InputField";

// Límite amplio pero real: evita años absurdos (5+ dígitos) al escribir la fecha a mano.
const MIN_DATE_STR = "2000-01-01";
const MAX_DATE_STR = `${new Date().getFullYear() + 5}-12-31`;

const TYPE_LABEL = {
    non_working:    "Día no laborable",
    special_hours:  "Horario especial",
    vacation:       "Vacaciones",
};
const TYPE_COLOR = {
    non_working:   "bg-red-100 text-red-600",
    special_hours: "bg-orange-100 text-orange-600",
    vacation:      "bg-blue-100 text-blue-600",
};

const emptyForm = () => ({
    date:          "",
    end_date:      "",
    type:          "non_working",
    description:   "",
    schedule_info: "Todo el día",
});

const fmt = (d) => {
    if (!d) return "—";
    const str = typeof d === "string" ? d.split("T")[0] : d.toISOString().split("T")[0];
    const [yr, mo, dy] = str.split("-");
    return `${dy}/${mo}/${yr}`;
};

const ExceptionsSection = ({ exceptions, onChange }) => {
    const [editing, setEditing] = useState(null);
    const [form, setForm]       = useState(emptyForm());

    const startNew  = () => { setForm(emptyForm()); setEditing("new"); };
    const startEdit = (i) => {
        const ex = exceptions[i];
        setForm({ ...ex, date: ex.date?.split?.("T")[0] ?? ex.date, end_date: ex.end_date?.split?.("T")[0] ?? "" });
        setEditing(i);
    };
    const cancel = () => setEditing(null);

    const save = () => {
        if (!form.date) return;
        const entry = { ...form, end_date: form.end_date || undefined };
        if (editing === "new") onChange([...exceptions, entry]);
        else onChange(exceptions.map((e, i) => i === editing ? entry : e));
        setEditing(null);
    };

    const remove = (i) => onChange(exceptions.filter((_, idx) => idx !== i));

    return (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
            {/* Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-4">
                <div>
                    <h3 className="text-sm font-semibold text-slate-800">4. Excepciones y días no laborables</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Administra días especiales, vacaciones o cambios en tu horario habitual.</p>
                </div>
                <button
                    onClick={startNew}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 text-blue-600 text-xs font-medium hover:bg-blue-50 whitespace-nowrap self-start sm:flex-shrink-0"
                >
                    <Plus className="w-3.5 h-3.5" /> Agregar excepción
                </button>
            </div>

            {/* Table with horizontal scroll */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[420px]">
                    <thead>
                        <tr className="border-b border-slate-100">
                            {["Fecha","Tipo","Descripción","Horario","Acciones"].map(h => (
                                <th key={h} className="text-left text-xs text-slate-400 font-normal pb-2 pr-2">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {exceptions.map((ex, i) => (
                            <tr key={i} className="border-b border-slate-50">
                                <td className="py-2.5 pr-2 text-xs text-slate-600 whitespace-nowrap">
                                    {ex.end_date ? `${fmt(ex.date)} – ${fmt(ex.end_date)}` : fmt(ex.date)}
                                </td>
                                <td className="py-2.5 pr-2">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLOR[ex.type]}`}>
                                        {TYPE_LABEL[ex.type]}
                                    </span>
                                </td>
                                <td className="py-2.5 pr-2 text-xs text-slate-500">{ex.description || "—"}</td>
                                <td className="py-2.5 pr-2 text-xs text-slate-500">{ex.schedule_info || "—"}</td>
                                <td className="py-2.5">
                                    <button onClick={() => startEdit(i)} className="p-1 text-slate-400 hover:text-blue-500"><Pencil className="w-3.5 h-3.5" /></button>
                                    <button onClick={() => remove(i)} className="p-1 text-slate-400 hover:text-red-500 ml-1"><Trash2 className="w-3.5 h-3.5" /></button>
                                </td>
                            </tr>
                        ))}

                        {editing !== null && (
                            <tr className="bg-blue-50/40 border-b border-blue-100">
                                <td className="py-2.5 pr-2">
                                    <div className="flex flex-col gap-1">
                                        <InputField type="date" min={MIN_DATE_STR} max={MAX_DATE_STR} value={form.date}
                                            onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
                                        <InputField type="date" min={MIN_DATE_STR} max={MAX_DATE_STR} value={form.end_date}
                                            placeholder="Fecha fin (opcional)"
                                            onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))} />
                                    </div>
                                </td>
                                <td className="py-2.5 pr-2">
                                    <select value={form.type}
                                        onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                                        className="text-xs border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400">
                                        {Object.entries(TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                                    </select>
                                </td>
                                <td className="py-2.5 pr-2">
                                    <InputField value={form.description} maxLength={200}
                                        onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                                        placeholder="Descripción" />
                                </td>
                                <td className="py-2.5 pr-2">
                                    <InputField value={form.schedule_info} maxLength={100}
                                        onChange={e => setForm(p => ({ ...p, schedule_info: e.target.value }))}
                                        placeholder="Ej. Todo el día" />
                                </td>
                                <td className="py-2.5">
                                    <button onClick={save} className="p-1 text-green-600"><Check className="w-4 h-4" /></button>
                                    <button onClick={cancel} className="p-1 text-slate-400 ml-1"><X className="w-4 h-4" /></button>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {exceptions.length === 0 && editing === null && (
                <p className="text-center text-xs text-slate-400 py-4">Sin excepciones registradas</p>
            )}
        </div>
    );
};

export default ExceptionsSection;
