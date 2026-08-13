import { useState } from "react";
import { Plus, Pencil, Trash2, X, CalendarDays, Tag, FileText, Clock3 } from "lucide-react";
import InputField from "@/components/ui/InputField";
import CollapsibleCard from "@/components/ui/CollapsibleCard";

// Fecha de hoy en "YYYY-MM-DD" (hora local): ni la fecha de inicio ni la de fin de una
// excepción pueden quedar en el pasado.
const todayISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const MIN_DATE_STR = todayISO();
// Límite amplio pero real: evita años absurdos (5+ dígitos) al escribir la fecha a mano.
const MAX_DATE_STR = `${new Date().getFullYear() + 5}-12-31`;

const TYPE_LABEL = {
    non_working:    "Día no laborable",
    special_hours:  "Horario especial",
    vacation:       "Vacaciones",
    other:          "Otro",
};
const TYPE_COLOR = {
    non_working:   "bg-red-100 text-red-600",
    special_hours: "bg-orange-100 text-orange-600",
    vacation:      "bg-blue-100 text-blue-600",
    other:         "bg-purple-100 text-purple-600",
};

// Etiqueta a mostrar en la tabla: si es "other" se muestra lo que el doctor escribió a mano.
const displayType = (ex) => (ex.type === "other" ? (ex.custom_type || TYPE_LABEL.other) : TYPE_LABEL[ex.type]);

const emptyForm = () => ({
    date:          "",
    end_date:      "",
    type:          "non_working",
    custom_type:   "",
    description:   "",
    // El horario ya no es texto libre: o es "todo el día" o un rango de horas concreto.
    allDay:        true,
    start_time:    "08:00",
    end_time:      "12:00",
});

const fmt = (d) => {
    if (!d) return "—";
    const str = typeof d === "string" ? d.split("T")[0] : d.toISOString().split("T")[0];
    const [yr, mo, dy] = str.split("-");
    return `${dy}/${mo}/${yr}`;
};

const toMinutes = (t) => {
    if (!t) return 0;
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
};

// Recompone el schedule_info guardado ("HH:mm - HH:mm") de vuelta a los campos del toggle
// al editar una excepción existente; si no coincide con ese formato, se asume "todo el día".
const parseScheduleInfo = (info) => {
    const match = /^(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})$/.exec(info || "");
    if (!match) return { allDay: true, start_time: "08:00", end_time: "12:00" };
    return { allDay: false, start_time: match[1], end_time: match[2] };
};

const validate = (form) => {
    const errors = {};

    if (!form.date) errors.date = "Requerido";
    else if (form.date < MIN_DATE_STR) errors.date = "No puede ser una fecha pasada";

    if (form.end_date) {
        const minEnd = form.date && form.date > MIN_DATE_STR ? form.date : MIN_DATE_STR;
        if (form.end_date < minEnd) errors.end_date = "Debe ser igual o posterior a la fecha de inicio";
    }

    if (form.type === "other" && !form.custom_type.trim()) errors.custom_type = "Escribe el tipo de día";

    if (!form.allDay) {
        if (!form.start_time || !form.end_time) errors.horario = "Indica la hora de inicio y de fin";
        else if (toMinutes(form.end_time) <= toMinutes(form.start_time)) errors.horario = "La hora de fin debe ser posterior a la de inicio";
    }

    return errors;
};

// Mismo patrón visual del modal centrado de "Vista previa de tu agenda" (SchedulePreview.jsx):
// overlay con blur + tarjeta redondeada, en vez del formulario dentro de una fila de tabla que
// había antes (muy angosto para todos estos campos).
const ExceptionModal = ({ form, setForm, errors, setErrors, onSave, onClose, isEditing }) => {
    const setField = (field) => (value) => {
        setForm((p) => ({ ...p, [field]: value }));
        if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
    };

    return (
        <div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h2 className="text-base font-bold text-slate-900">
                            {isEditing ? "Editar excepción" : "Nueva excepción"}
                        </h2>
                        <p className="text-xs text-slate-400 mt-0.5">Día especial, vacaciones o cambio en tu horario habitual.</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-3">
                        <InputField
                            label="Fecha inicio"
                            type="date"
                            icon={<CalendarDays className="w-4 h-4" />}
                            min={MIN_DATE_STR}
                            max={MAX_DATE_STR}
                            value={form.date}
                            error={errors.date}
                            onChange={(e) => {
                                const date = e.target.value;
                                setForm((p) => ({ ...p, date, end_date: p.end_date && p.end_date < date ? "" : p.end_date }));
                                if (errors.date) setErrors((prev) => ({ ...prev, date: "" }));
                            }}
                        />
                        <InputField
                            label="Fecha fin (opcional)"
                            type="date"
                            icon={<CalendarDays className="w-4 h-4" />}
                            min={form.date || MIN_DATE_STR}
                            max={MAX_DATE_STR}
                            value={form.end_date}
                            error={errors.end_date}
                            onChange={(e) => setField("end_date")(e.target.value)}
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                            <Tag className="w-3.5 h-3.5 text-gray-400" /> Tipo
                        </label>
                        <select
                            value={form.type}
                            onChange={(e) => setField("type")(e.target.value)}
                            className="px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 outline-none focus:border-[#3B6FCA] focus:ring-2 focus:ring-[#3B6FCA]/20 transition-all duration-200"
                        >
                            {Object.entries(TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                        {form.type === "other" && (
                            <InputField
                                className="mt-1.5"
                                placeholder="Ej. Capacitación, permiso administrativo..."
                                value={form.custom_type}
                                maxLength={40}
                                error={errors.custom_type}
                                onChange={(e) => setField("custom_type")(e.target.value)}
                            />
                        )}
                    </div>

                    <InputField
                        label="Descripción"
                        icon={<FileText className="w-4 h-4" />}
                        value={form.description}
                        maxLength={200}
                        onChange={(e) => setField("description")(e.target.value)}
                        placeholder="Ej. Congreso médico anual"
                    />

                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                            <Clock3 className="w-3.5 h-3.5 text-gray-400" /> Horario
                        </label>
                        <div className="flex gap-2">
                            {[{ v: true, l: "Todo el día" }, { v: false, l: "Horario específico" }].map(({ v, l }) => (
                                <button
                                    key={l}
                                    type="button"
                                    onClick={() => setField("allDay")(v)}
                                    className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                                        form.allDay === v
                                            ? "bg-blue-600 text-white border-blue-600"
                                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                    }`}
                                >
                                    {l}
                                </button>
                            ))}
                        </div>

                        {!form.allDay && (
                            <div className="grid grid-cols-2 gap-3 mt-1.5">
                                <InputField
                                    label="Hora inicio"
                                    type="time"
                                    value={form.start_time}
                                    onChange={(e) => setField("start_time")(e.target.value)}
                                />
                                <InputField
                                    label="Hora fin"
                                    type="time"
                                    value={form.end_time}
                                    onChange={(e) => setField("end_time")(e.target.value)}
                                />
                            </div>
                        )}
                        {errors.horario && <p className="text-xs text-red-500 mt-0.5">{errors.horario}</p>}
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-sm font-medium text-slate-500 hover:bg-slate-50 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={onSave}
                        className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
                    >
                        Guardar
                    </button>
                </div>
            </div>
        </div>
    );
};

// editing (prop): modo edición de la PÁGINA completa (ver ScheduleConfig.jsx) — controla si los
// botones de agregar/editar/eliminar existen. rowEditing (state): qué excepción está siendo
// editada ahora mismo ("new" | índice | null), solo alcanzable cuando editing=true.
const ExceptionsSection = ({ exceptions, onChange, editing }) => {
    const [rowEditing, setRowEditing] = useState(null);
    const [form, setForm]       = useState(emptyForm());
    const [errors, setErrors]   = useState({});

    const startNew = () => { setForm(emptyForm()); setErrors({}); setRowEditing("new"); };
    const startEdit = (i) => {
        const ex = exceptions[i];
        setForm({
            ...emptyForm(),
            ...ex,
            date:        ex.date?.split?.("T")[0] ?? ex.date,
            end_date:    ex.end_date?.split?.("T")[0] ?? "",
            custom_type: ex.custom_type || "",
            ...parseScheduleInfo(ex.schedule_info),
        });
        setErrors({});
        setRowEditing(i);
    };
    const cancel = () => setRowEditing(null);

    const save = () => {
        const validationErrors = validate(form);
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        const entry = {
            date:          form.date,
            end_date:      form.end_date || undefined,
            type:          form.type,
            custom_type:   form.type === "other" ? form.custom_type.trim() : undefined,
            description:   form.description,
            schedule_info: form.allDay ? "Todo el día" : `${form.start_time} - ${form.end_time}`,
        };
        if (rowEditing === "new") onChange([...exceptions, entry]);
        else onChange(exceptions.map((e, i) => i === rowEditing ? entry : e));
        setRowEditing(null);
    };

    const remove = (i) => onChange(exceptions.filter((_, idx) => idx !== i));

    return (
        <CollapsibleCard
            title="3. Excepciones y días no laborables"
            subtitle="Administralas excepciones que tendras en días especiales, tus vacaciones o cambios a tu horario habitual"
            actions={
                editing && (
                    <button
                        onClick={startNew}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 text-blue-600 text-xs font-medium hover:bg-blue-50 whitespace-nowrap flex-shrink-0"
                    >
                        <Plus className="w-3.5 h-3.5" /> Agregar excepción
                    </button>
                )
            }
        >
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
                                        {displayType(ex)}
                                    </span>
                                </td>
                                <td className="py-2.5 pr-2 text-xs text-slate-500">{ex.description || "—"}</td>
                                <td className="py-2.5 pr-2 text-xs text-slate-500">{ex.schedule_info || "—"}</td>
                                <td className="py-2.5">
                                    {editing && (
                                        <>
                                            <button onClick={() => startEdit(i)} className="p-1 text-slate-400 hover:text-blue-500"><Pencil className="w-3.5 h-3.5" /></button>
                                            <button onClick={() => remove(i)} className="p-1 text-slate-400 hover:text-red-500 ml-1"><Trash2 className="w-3.5 h-3.5" /></button>
                                        </>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {exceptions.length === 0 && (
                <p className="text-center text-xs text-slate-400 py-4">Sin excepciones registradas</p>
            )}

            {rowEditing !== null && (
                <ExceptionModal
                    form={form}
                    setForm={setForm}
                    errors={errors}
                    setErrors={setErrors}
                    onSave={save}
                    onClose={cancel}
                    isEditing={rowEditing !== "new"}
                />
            )}
        </CollapsibleCard>
    );
};

export default ExceptionsSection;