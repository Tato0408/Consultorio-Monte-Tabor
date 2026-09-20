import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Check, X, Loader2 } from "lucide-react";
import InputField from "@/components/ui/InputField";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ScheduleCard from "./ScheduleCard";
import useAppointmentTypes from "../hooks/useAppointmentTypes";
import { showError, confirmDelete } from "@/lib/alerts";
import { maskLettersOnly } from "@/lib/inputMasks";

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

// A qué tipo de procedimiento queda anclado el tipo de cita: uno
// "consulta" solo aparece como opción cuando la cita es Consulta
// Médica General, uno "procedimiento" solo cuando se eligió un
// procedimiento real (ver el selector "Tipo de cita" en
// AppointmentsFormCalendar.jsx).
const CATEGORIES = [
    { value: "ambos", label: "Ambos" },
    { value: "consulta", label: "Consulta" },
    { value: "procedimiento", label: "Procedimiento" },
];

const CATEGORY_LABELS = { ambos: "Ambos", procedimiento: "Procedimiento", consulta: "Consulta" };

const emptyType = () => ({ name: "", color: COLORS[0], category: "consulta" });

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
    const startEdit = (i) => { setForm({ name: types[i].name, color: types[i].color, category: types[i].category || "consulta" }); setRowEditing(i); };
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
        // Era el único botón de eliminar de todo el sistema sin este
        // aviso: un clic accidental borraba el tipo de cita sin ninguna
        // confirmación ni forma de deshacerlo.
        const confirmed = await confirmDelete({
            title: "¿Eliminar este tipo de cita?",
            text: `Se eliminará "${types[i].name}". Esta acción no se puede deshacer.`,
        });
        if (!confirmed) return;

        try {
            await deleteAppointmentType(types[i]._id);
            load();
        } catch (err) {
            showError(err.message || "No se pudo eliminar el tipo de cita");
        }
    };

    return (
        <ScheduleCard
            title="Tipos de citas"
            subtitle="Catálogo global: define el color de cada tipo de cita. Se usa en la leyenda del calendario y al agendar una cita."
            actions={
                editing && (
                    <button
                        onClick={startNew}
                        disabled={rowEditing !== null}
                        title={rowEditing !== null ? "Guarda o cancela el tipo que estás editando antes de agregar otro" : undefined}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-[#eaf4fd] whitespace-nowrap flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                        style={{ borderColor: "#cfe4f7", color: "#2E6DA4" }}
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
                                <th className="text-left text-xs text-slate-400 font-normal pb-2">Anclado a</th>
                                <th className="text-right text-xs text-slate-400 font-normal pb-2">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {types.map((t, i) => (
                                <tr key={t._id} className="border-b border-slate-50">
                                    <td className="py-2.5">
                                        <div className="flex items-center gap-2">
                                            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: t.color }} />
                                            <span className="text-slate-700 text-sm">{t.name}</span>
                                        </div>
                                    </td>
                                    <td className="py-2.5">
                                        <span className="text-xs text-slate-400">
                                            {CATEGORY_LABELS[t.category] || "Consulta"}
                                        </span>
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
                                                    className="p-1 text-slate-400 hover:text-[#2E6DA4] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-slate-400"
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
                                <tr className="border-b" style={{ background: "#f4f9fe", borderColor: "#cfe4f7" }}>
                                    <td className="py-2.5 pr-2" colSpan={2}>
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
                                            <Select value={form.category} onValueChange={c => setForm(p => ({ ...p, category: c }))}>
                                                <SelectTrigger className="w-36 h-9 flex-shrink-0">
                                                    <SelectValue placeholder="Anclado a" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {CATEGORIES.map(c => (
                                                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
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
        </ScheduleCard>
    );
};

export default AppointmentTypesSection;
