import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Check, X, Loader2 } from "lucide-react";
import InputField from "@/components/ui/InputField";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CollapsibleCard from "@/components/ui/CollapsibleCard";
import useAppointmentTypes from "../hooks/useAppointmentTypes";
import { showError } from "@/lib/alerts";
import { maskLettersOnly } from "@/lib/inputMasks";

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

const emptyType = () => ({ name: "", color: COLORS[0] });

// Catálogo global de tipos de cita (nombre y color), solo lo ve y
// edita el rol admin (ver ScheduleConfig.jsx). Alimenta la leyenda
// del calendario y el selector de tipo de cita al agendar una cita
// (ver AppointmentsCalendar.jsx y AppointmentsForm.jsx). A diferencia
// del resto de secciones de Horarios, esta no depende del botón
// Guardar cambios: cada acción persiste de inmediato contra su propio
// endpoint, porque no vive dentro del horario de un doctor
// específico. Aun así, agregar, editar y eliminar tipos sigue
// controlado por el modo edición de la página (prop editing), para
// que la interfaz completa se sienta consistente: nada de eso se
// puede hacer sin antes presionar Editar horario.
const AppointmentTypesSection = ({ editing }) => {
    const { getAppointmentTypes, createAppointmentType, updateAppointmentType, deleteAppointmentType } = useAppointmentTypes();
    const [types, setTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [rowEditing, setRowEditing] = useState(null);
    const [form, setForm] = useState(emptyType());

    const load = () => {
        setLoading(true);
        getAppointmentTypes()
            .then(setTypes)
            .catch((err) => showError(err.message || "No se pudieron cargar los tipos de cita"))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    const startNew  = () => { setForm(emptyType()); setRowEditing("new"); };
    const startEdit = (i) => { setForm({ name: types[i].name, color: types[i].color }); setRowEditing(i); };
    const cancel    = () => setRowEditing(null);

    const save = async () => {
        if (!form.name.trim() || saving) return;
        setSaving(true);
        try {
            if (rowEditing === "new") {
                await createAppointmentType(form);
            } else {
                await updateAppointmentType(types[rowEditing]._id, form);
            }
            setRowEditing(null);
            load();
        } catch (err) {
            showError(err.message || "No se pudo guardar el tipo de cita");
        } finally {
            setSaving(false);
        }
    };

    const remove = async (i) => {
        try {
            await deleteAppointmentType(types[i]._id);
            load();
        } catch (err) {
            showError(err.message || "No se pudo eliminar el tipo de cita");
        }
    };

    return (
        <CollapsibleCard
            title="Tipos de citas"
            subtitle="Catálogo global: define el color de cada tipo de cita. Se usa en la leyenda del calendario y al agendar una cita."
            defaultOpen={false}
            actions={
                editing && (
                    <button
                        onClick={startNew}
                        disabled={rowEditing !== null}
                        title={rowEditing !== null ? "Guarda o cancela el tipo que estás editando antes de agregar otro" : undefined}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 text-blue-600 text-xs font-medium hover:bg-blue-50 whitespace-nowrap flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                    >
                        <Plus className="w-3.5 h-3.5" /> Agregar tipo
                    </button>
                )
            }
        >
            {loading ? (
                <p className="text-center text-xs text-slate-400 py-4">Cargando...</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[220px]">
                        <thead>
                            <tr className="border-b border-slate-100">
                                <th className="text-left text-xs text-slate-400 font-normal pb-2">Tipo de cita</th>
                                <th className="text-right text-xs text-slate-400 font-normal pb-2">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {types.map((t, i) => (
                                <tr key={t._id} className="border-b border-slate-50">
                                    <td className="py-2.5 flex items-center gap-2">
                                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: t.color }} />
                                        <span className="text-slate-700 text-sm">{t.name}</span>
                                    </td>
                                    <td className="py-2.5 text-right">
                                        {/* Deshabilitados mientras hay otra fila en edición: evita perder ese
                                            borrador sin guardar, y evita que rowEditing (un índice) quede
                                            apuntando a la fila equivocada si el listado cambia de por medio. */}
                                        {editing && (
                                            <>
                                                <button
                                                    onClick={() => startEdit(i)}
                                                    disabled={rowEditing !== null}
                                                    className="p-1 text-slate-400 hover:text-blue-500 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-slate-400"
                                                >
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => remove(i)}
                                                    disabled={rowEditing !== null}
                                                    className="p-1 text-slate-400 hover:text-red-500 ml-1 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-slate-400"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))}

                            {rowEditing !== null && (
                                <tr className="border-b border-blue-100 bg-blue-50/40">
                                    <td className="py-2.5 pr-2">
                                        <div className="flex items-center gap-2">
                                            {/* Círculos de color en vez de texto con el código hexadecimal. */}
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
                                                maxLength={30}
                                                value={form.name}
                                                onChange={e => setForm(p => ({ ...p, name: maskLettersOnly(e.target.value, 30) }))}
                                                className="flex-1"
                                            />
                                        </div>
                                    </td>
                                    <td className="py-2.5 text-right">
                                        <button onClick={save} disabled={saving} className="p-1 text-green-600 hover:text-green-700 disabled:opacity-50">
                                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                        </button>
                                        <button onClick={cancel} disabled={saving} className="p-1 text-slate-400 hover:text-red-400 ml-1 disabled:opacity-50">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {!loading && types.length === 0 && rowEditing === null && (
                <p className="text-center text-xs text-slate-400 py-4">Aún no has agregado tipos de cita</p>
            )}
        </CollapsibleCard>
    );
};

export default AppointmentTypesSection;
