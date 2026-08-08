import { useState } from "react";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import InputField from "@/components/ui/InputField";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const COLORS = ["#6366f1","#10b981","#f59e0b","#ef4444","#8b5cf6","#ec4899","#14b8a6","#f97316"];
const DURATIONS = [15, 30, 45, 60, 90];

const emptyType = () => ({ name: "", duration: 30, color: COLORS[0] });

const AppointmentTypesSection = ({ types, onChange }) => {
    const [editing, setEditing] = useState(null);
    const [form, setForm]       = useState(emptyType());

    const startNew  = () => { setForm(emptyType()); setEditing("new"); };
    const startEdit = (i) => { setForm({ ...types[i] }); setEditing(i); };
    const cancel    = () => setEditing(null);

    const save = () => {
        if (!form.name.trim()) return;
        if (editing === "new") onChange([...types, form]);
        else onChange(types.map((t, i) => i === editing ? form : t));
        setEditing(null);
    };

    const remove = (i) => onChange(types.filter((_, idx) => idx !== i));

    return (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
            {/* Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-4">
                <div>
                    <h3 className="text-sm font-semibold text-slate-800">1. Tipos de citas y duración</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Configura los tipos de atención que ofreces y el tiempo que requerirá cada una.</p>
                </div>
                <button
                    onClick={startNew}
                    disabled={editing !== null}
                    title={editing !== null ? "Guarda o cancela el tipo que estás editando antes de agregar otro" : undefined}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 text-blue-600 text-xs font-medium hover:bg-blue-50 whitespace-nowrap self-start sm:flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                >
                    <Plus className="w-3.5 h-3.5" /> Agregar tipo
                </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[280px]">
                    <thead>
                        <tr className="border-b border-slate-100">
                            <th className="text-left text-xs text-slate-400 font-normal pb-2">Tipo de cita</th>
                            <th className="text-left text-xs text-slate-400 font-normal pb-2">Duración</th>
                            <th className="text-right text-xs text-slate-400 font-normal pb-2">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {types.map((t, i) => (
                            <tr key={i} className="border-b border-slate-50">
                                <td className="py-2.5 flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: t.color }} />
                                    <span className="text-slate-700 text-sm">{t.name}</span>
                                </td>
                                <td className="py-2.5 text-slate-500 text-sm">{t.duration} min</td>
                                <td className="py-2.5 text-right">
                                    {/* Deshabilitados mientras hay otra fila en edición: evita perder ese
                                        borrador sin guardar, y evita que "editing" (un índice) quede
                                        apuntando a la fila equivocada si el listado cambia de por medio. */}
                                    <button
                                        onClick={() => startEdit(i)}
                                        disabled={editing !== null}
                                        className="p-1 text-slate-400 hover:text-blue-500 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-slate-400"
                                    >
                                        <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => remove(i)}
                                        disabled={editing !== null}
                                        className="p-1 text-slate-400 hover:text-red-500 ml-1 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-slate-400"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </td>
                            </tr>
                        ))}

                        {editing !== null && (
                            <tr className="border-b border-blue-100 bg-blue-50/40">
                                <td className="py-2.5 pr-2">
                                    <div className="flex items-center gap-2">
                                        {/* Mismo dropdown de antes, solo que las opciones son círculos
                                            de color en vez de texto con el código hexadecimal. */}
                                        <Select value={form.color} onValueChange={c => setForm(p => ({ ...p, color: c }))}>
                                            <SelectTrigger className="w-11 h-9 p-0 justify-center rounded-full border-slate-200 flex-shrink-0 [&>svg]:hidden">
                                                <SelectValue>
                                                    <span className="w-6 h-6 rounded-full block border-2 border-white shadow-sm" style={{ backgroundColor: form.color }} />
                                                </SelectValue>
                                            </SelectTrigger>
                                            <SelectContent className="min-w-0 w-auto">
                                                {COLORS.map(c => (
                                                    <SelectItem key={c} value={c} className="justify-center px-2">
                                                        <span className="w-5 h-5 rounded-full block" style={{ backgroundColor: c }} />
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <InputField
                                            id="type-name"
                                            placeholder="Nombre del tipo"
                                            value={form.name}
                                            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                                            className="flex-1"
                                        />
                                    </div>
                                </td>
                                <td className="py-2.5 pr-2">
                                    <select
                                        className="text-sm border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
                                        value={form.duration}
                                        onChange={e => setForm(p => ({ ...p, duration: Number(e.target.value) }))}>
                                        {DURATIONS.map(d => <option key={d} value={d}>{d} min</option>)}
                                    </select>
                                </td>
                                <td className="py-2.5 text-right">
                                    <button onClick={save} className="p-1 text-green-600 hover:text-green-700">
                                        <Check className="w-4 h-4" />
                                    </button>
                                    <button onClick={cancel} className="p-1 text-slate-400 hover:text-red-400 ml-1">
                                        <X className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {types.length === 0 && editing === null && (
                <p className="text-center text-xs text-slate-400 py-4">Aún no has agregado tipos de cita</p>
            )}
        </div>
    );
};

export default AppointmentTypesSection;
