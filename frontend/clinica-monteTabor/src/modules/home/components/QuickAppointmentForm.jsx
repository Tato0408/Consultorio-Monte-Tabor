import { useState, useEffect } from "react";
import { Loader2, ChevronDown } from "lucide-react";
import apiClient from "@/lib/apiClient";
import { showSuccess, showError, confirmProceedWithoutNurse } from "@/lib/alerts";
import { Combobox, ComboboxTrigger, ComboboxContent, ComboboxItem } from "@/components/ui/combobox";
import DataCombobox from "@/components/ui/DataCombobox";
import { patientLabel, doctorLabel, nurseLabel } from "@/modules/schedule/appointments/lib/personLabels";
import { max_procedures_per_appointment } from "@/modules/schedule/appointments/lib/appointmentLimits";

const todayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// procedureIds arranca vacío: la sección de Encargados solo debe aparecer una vez que el
// usuario elige al menos un procedimiento explícitamente (ver más abajo), así que no
// puede haber uno pre-seleccionado.
const EMPTY_FORM = { patientId: "", doctorId: "", nurseId: "", procedureIds: [], date: todayStr(), selectedTime: "", description: "" };

// Un horario cuya hora de inicio ya llegó o quedó atrás no debe poder
// elegirse aquí, aunque nunca se haya ocupado. Por ejemplo, si son las
// 13:15, el bloque de las 13:00 ya no se puede agendar. Aplica el
// mismo criterio que la tabla de agenda de doctores.
const isSlotInPast = (dateStr, startTime) => new Date(`${dateStr}T${startTime}:00`) <= new Date();

// Formulario de registro rápido de citas: versión condensada de
// AppointmentsFormCalendar.jsx para los dashboards de recepción y
// enfermería. Reutiliza el mismo catálogo (useMedicalData, ya cargado
// por el dashboard) y el mismo endpoint POST /api/appointments, sin
// duplicar lógica de negocio, solo el formulario.
//
// Flujo: 1) Paciente, 2) Procedimiento (decide si la cita requiere doctor,
// enfermera o ambos, ver requiresDoctorForProcedure e isNurseRequired más
// abajo), 3) Fecha/horario (horarios agregados: "al menos un doctor o
// enfermera libre", el mismo criterio que usa el portal del paciente en
// /schedule/patient-available-slots, sin depender de haber elegido antes a
// alguien puntual) y 4) Encargados: recién ahí se pide, para ese horario
// EXACTO ya elegido, quién específicamente está disponible
// (/schedule/patient-doctors-for-slot, /nurse-schedule/patient-nurses-for-slot
// o /appointments/nurses-for-acceptance según el caso), para elegir entre
// esas personas y no de todo el catálogo.
const QuickAppointmentForm = ({ medicalData, prefill, onCreated, onRequestNewPatient, onProcedureInfoChange }) => {
    const { patients, procedures } = medicalData;

    const [form, setForm] = useState(EMPTY_FORM);
    // Pestaña visible del paso "Encargados" cuando el procedimiento
    // requiere doctor y enfermera a la vez (ver requiresDoctorForProcedure
    // e isNurseRequired más abajo). Sin sentido en los otros dos casos,
    // donde solo hay un selector.
    const [activeTab, setActiveTab] = useState("doctor");
    const [rawSlots, setRawSlots] = useState([]);
    const [availableSlots, setAvailableSlots] = useState([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    // Doctores y/o enfermeras realmente disponibles para la fecha y hora ya
    // elegidas (paso 4, ver el efecto que las pide más abajo). Nunca es el
    // catálogo completo.
    const [slotDoctors, setSlotDoctors] = useState([]);
    const [slotNurses, setSlotNurses] = useState([]);
    const [loadingProviders, setLoadingProviders] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    // Horario elegido con un clic en la agenda de doctores (cuadrícula
    // fija de 30 minutos). El horario agregado (tileFreeSlots) deja un
    // margen (buffer_time) entre citas, por lo que no siempre coincide con
    // esa cuadrícula de 30 minutos. Sin este valor guardado, el select no
    // podía mostrar la hora elegida porque no existía ninguna opción con
    // ese valor exacto.
    const [pinnedSlot, setPinnedSlot] = useState(null);
    const [procedurePickerOpen, setProcedurePickerOpen] = useState(false);

    // Precarga doctor, fecha y hora cuando el recepcionista o la
    // enfermera hacen clic en un espacio libre de la agenda. El clic
    // siempre viene de la agenda de doctores, así que este prefill nunca
    // trae una enfermera: si el usuario termina eligiendo un
    // procedimiento sin doctor, el efecto de abajo que limpia doctorId
    // se encarga de descartarlo. Falta elegir procedimiento para que el
    // horario agregado se pida y esta hora quede seleccionable (ver
    // pinnedSlot en el efecto de horarios). El clic puede venir de la
    // agenda de doctores o de la de enfermeras (DoctorsAgendaSection.jsx),
    // por eso prefill trae uno de los dos ids, nunca ambos.
    useEffect(() => {
        if (!prefill) return;
        setForm((prev) => ({ ...prev, doctorId: prefill.doctorId || "", nurseId: prefill.nurseId || "", date: prefill.date, selectedTime: prefill.start_time }));
        setPinnedSlot({ date: prefill.date, start_time: prefill.start_time, end_time: prefill.end_time });
    }, [prefill]);

    const selectedProcedures = procedures.filter((p) => form.procedureIds.includes(p._id?.toString()));
    const procedureChosen = form.procedureIds.length > 0;
    const duration = selectedProcedures.reduce((sum, p) => sum + (Number(p.estimated_duration) || 30), 0) || 30;
    // Un procedimiento sin doctor (requires_doctor false) lo atiende una enfermera como
    // proveedora principal: ahí el selector de doctor no aplica y "Enfermera" pasa a ser
    // el campo principal. Mezclar uno que requiere doctor con uno que no, el doctor pasa a
    // ser el proveedor principal. Sin ningún procedimiento elegido todavía, por defecto se
    // asume que sí requiere doctor. Mismo criterio que AppointmentsFormCalendar.jsx.
    const requiresDoctorForProcedure = !procedureChosen || selectedProcedures.some((p) => p.requires_doctor !== false);
    // Enfermera de apoyo obligatoria (alcanza con que UNO de los procedimientos la exija).
    const isNurseRequired = procedureChosen && selectedProcedures.some((p) => !!p.requires_nurse);

    // Informa al dashboard qué debe mostrar la agenda (DoctorsAgendaSection.jsx): vacía
    // hasta elegir procedimiento, luego doctores, enfermeras o ambos según el caso, y con qué
    // duración tilear los horarios "disponible" (duration): la agenda debe reflejar la
    // duración real del procedimiento elegido, no un valor fijo.
    useEffect(() => {
        onProcedureInfoChange?.({ procedureChosen, requiresDoctorForProcedure, isNurseRequired, duration });
    }, [procedureChosen, requiresDoctorForProcedure, isNurseRequired, duration, onProcedureInfoChange]);

    // Si el procedimiento deja de requerir enfermera, se limpia la ya elegida.
    useEffect(() => {
        if (!isNurseRequired && form.nurseId) {
            setForm((f) => ({ ...f, nurseId: "" }));
        }
    }, [isNurseRequired]);

    // Si el procedimiento pasa a no requerir doctor, se limpia el doctor ya elegido (o
    // precargado por el prefill de la agenda): "Enfermera" pasa a ser el proveedor
    // principal en su lugar.
    useEffect(() => {
        if (!requiresDoctorForProcedure && form.doctorId) {
            setForm((f) => ({ ...f, doctorId: "" }));
        }
    }, [requiresDoctorForProcedure]);

    // Horarios agregados: "al menos un doctor libre" normalmente, o "al menos una
    // enfermera libre" cuando el procedimiento no requiere doctor (la propia ruta lo
    // decide según procedure_id, ver scheduleController.getPatientAvailableSlots). No
    // depende de haber elegido antes a alguien puntual, solo del procedimiento y la fecha.
    useEffect(() => {
        if (!procedureChosen || !form.date) { setRawSlots([]); return; }
        let cancelled = false;
        setLoadingSlots(true);
        apiClient("/schedule/patient-available-slots", { params: { date: form.date, procedure_id: form.procedureIds.join(",") } })
            .then((res) => { if (!cancelled) setRawSlots(res.slots || []); })
            .catch(() => { if (!cancelled) setRawSlots([]); })
            .finally(() => !cancelled && setLoadingSlots(false));
        return () => { cancelled = true; };
    }, [procedureChosen, form.procedureIds.join(","), form.date]);

    // Combina los horarios agregados con el horario fijado por un clic en la agenda, si
    // corresponde a la fecha actual, sin volver a pedir datos al backend. Si la fecha
    // elegida es hoy, además descarta cualquier horario cuya hora ya haya pasado o esté
    // en curso.
    useEffect(() => {
        let list = rawSlots;
        if (
            pinnedSlot &&
            pinnedSlot.date === form.date &&
            !list.some((s) => s.start_time === pinnedSlot.start_time)
        ) {
            list = [...list, { start_time: pinnedSlot.start_time, end_time: pinnedSlot.end_time }]
                .sort((a, b) => a.start_time.localeCompare(b.start_time));
        }
        if (form.date === todayStr()) {
            list = list.filter((s) => !isSlotInPast(form.date, s.start_time));
        }
        setAvailableSlots(list);
    }, [rawSlots, pinnedSlot, form.date]);

    // Paso 4: recién con fecha y hora ya elegidas se pide quién específicamente está
    // disponible para ESE horario exacto (doctor, enfermera de apoyo o enfermera
    // proveedora principal, según el caso), en vez de mostrar todo el catálogo. Si la
    // persona ya elegida (por ejemplo, precargada por el clic en la agenda) no aparece en
    // la lista recién obtenida, se limpia en vez de dejar una asignación inválida.
    useEffect(() => {
        if (!procedureChosen || !form.date || !form.selectedTime) {
            setSlotDoctors([]);
            setSlotNurses([]);
            return;
        }
        const slot = availableSlots.find((s) => s.start_time === form.selectedTime);
        if (!slot) { setSlotDoctors([]); setSlotNurses([]); return; }

        let cancelled = false;
        let pending = 0;
        setLoadingProviders(true);
        const done = () => { pending -= 1; if (pending === 0 && !cancelled) setLoadingProviders(false); };

        if (requiresDoctorForProcedure) {
            pending += 1;
            apiClient("/schedule/patient-doctors-for-slot", {
                params: { date: form.date, start_time: slot.start_time, procedure_id: form.procedureIds.join(",") },
            }).then((res) => {
                if (cancelled) return;
                const list = res.doctors || [];
                setSlotDoctors(list);
                setForm((f) => (f.doctorId && !list.some((d) => d._id === f.doctorId) ? { ...f, doctorId: "" } : f));
            }).catch(() => !cancelled && setSlotDoctors([])).finally(done);
        } else {
            setSlotDoctors([]);
        }

        if (!requiresDoctorForProcedure) {
            // Enfermera como proveedora principal (procedimiento sin doctor): mismo criterio
            // que scheduleController.getPatientDoctorsForSlot, pero sobre horarios de
            // enfermería (isSlotFreeForNurse, con excepciones y buffer_time incluidos).
            pending += 1;
            apiClient("/nurse-schedule/patient-nurses-for-slot", {
                params: { date: form.date, start_time: slot.start_time, procedure_id: form.procedureIds.join(",") },
            }).then((res) => {
                if (cancelled) return;
                const list = res.nurses || [];
                setSlotNurses(list);
                setForm((f) => (f.nurseId && !list.some((n) => n._id === f.nurseId) ? { ...f, nurseId: "" } : f));
            }).catch(() => !cancelled && setSlotNurses([])).finally(done);
        } else if (isNurseRequired) {
            // Enfermera de apoyo (caso doctor + enfermera): mismo endpoint que usa
            // AppointmentsFormCalendar.jsx al aceptar o asignar una cita.
            pending += 1;
            apiClient("/appointments/nurses-for-acceptance", {
                params: { date: form.date, start_time: slot.start_time, end_time: slot.end_time },
            }).then((response) => {
                if (cancelled) return;
                const list = Array.isArray(response) ? response : response.data || [];
                setSlotNurses(list);
                setForm((f) => (f.nurseId && !list.some((n) => n._id === f.nurseId) ? { ...f, nurseId: "" } : f));
            }).catch(() => !cancelled && setSlotNurses([])).finally(done);
        } else {
            setSlotNurses([]);
        }

        if (pending === 0) setLoadingProviders(false);
        return () => { cancelled = true; };
    }, [procedureChosen, requiresDoctorForProcedure, isNurseRequired, form.date, form.selectedTime, form.procedureIds.join(","), availableSlots]);

    const missingRoleLabel = requiresDoctorForProcedure ? "doctores" : "enfermeras";
    const noAvailabilityMsg = `No hay ${missingRoleLabel} disponibles para esta fecha y/o horario, por favor escoge otra fecha y/o horario.`;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (submitting) return;

        if (!form.patientId) return showError("Selecciona un paciente.");
        if (form.procedureIds.length === 0) return showError("Selecciona al menos un procedimiento.");
        if (!form.selectedTime) return showError("Selecciona una fecha y un horario.");
        if (requiresDoctorForProcedure && !form.doctorId) return showError("Selecciona un doctor.");
        if (!requiresDoctorForProcedure && !form.nurseId) return showError("Selecciona una enfermera.");
        // Mismo criterio que AppointmentsFormCalendar.jsx: sin enfermeras disponibles para
        // este horario (no solo mientras carga), se ofrece continuar igual con confirmación
        // explícita en vez de bloquear el registro sin ninguna salida.
        let confirmNoNurse = false;
        if (requiresDoctorForProcedure && isNurseRequired && !form.nurseId) {
            if (loadingProviders) return showError("Espera a que termine de cargar la lista de enfermeras.");
            if (slotNurses.length > 0) {
                const nombresConEnfermera = selectedProcedures.filter((p) => p.requires_nurse).map((p) => p.name).join(", ");
                return showError(`El procedimiento "${nombresConEnfermera}" requiere obligatoriamente asignar una enfermera.`);
            }
            const confirmed = await confirmProceedWithoutNurse();
            if (!confirmed) return;
            confirmNoNurse = true;
        }

        const slot = availableSlots.find((s) => s.start_time === form.selectedTime);
        if (!slot) return showError(noAvailabilityMsg);

        const total = selectedProcedures.reduce((sum, p) => sum + (Number(p.price) || 0), 0);

        setSubmitting(true);
        try {
            await apiClient("/appointments", {
                method: "POST",
                body: {
                    doctor_id: requiresDoctorForProcedure ? form.doctorId : undefined,
                    nurse_id: form.nurseId || undefined,
                    patient_id: form.patientId,
                    procedure_ids: form.procedureIds,
                    // "Consulta Médica General" ahora es un procedimiento real más: se
                    // identifica por nombre solo para mantener el campo type de siempre
                    // (lo usan los reportes para separar consultas de procedimientos). Con
                    // más de un procedimiento elegido, o con uno solo que no sea ese, es
                    // "Procedimiento" (mismo criterio que resolveProcedures en el backend).
                    type: form.procedureIds.length === 1 && selectedProcedures[0]?.name === "Consulta Médica General" ? "Consulta Médica General" : "Procedimiento",
                    date: new Date(`${form.date}T00:00:00`).toISOString(),
                    start_time: slot.start_time,
                    end_time: slot.end_time,
                    duration_minutes: duration,
                    description: form.description.trim() || undefined,
                    status: "pending",
                    total,
                    confirm_no_nurse: confirmNoNurse || undefined,
                },
            });
            showSuccess("Cita guardada correctamente.");
            setForm(EMPTY_FORM);
            setPinnedSlot(null);
            setActiveTab("doctor");
            onCreated?.();
        } catch (err) {
            showError(err.message || "No se pudo guardar la cita.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        // flex-1 es un no-op mientras la fila del dashboard use items-start (formulario vacío
        // o en su estado por default: sin espacio extra que llenar). Cuando el dashboard pasa
        // esa fila a items-stretch (formulario ya lleno, ver NurseDashboard.jsx y
        // RecepcionistDashboard.jsx), esta card sí crece para llenar la altura de la columna
        // estirada, igualando la altura de la agenda a su izquierda.
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5 flex-1 flex flex-col">
            <h3 className="font-bold text-slate-800 text-sm mb-4">Registro rápido de citas</h3>

            {/* flex-1 + justify-between (solo con procedimiento elegido, que es cuando la
                card puede llegar a estar más alta que su contenido, ver flex-1 arriba):
                reparte el espacio extra entre los grupos de campos en vez de dejarlo todo
                junto debajo del botón. Una vez que Encargados aparece y el contenido ya llena
                o supera esa altura, justify-between no tiene espacio extra que repartir y no
                cambia nada frente al apilado normal. */}
            <form onSubmit={handleSubmit} className={`flex flex-col gap-3 flex-1 ${procedureChosen ? "justify-between" : ""}`}>
                <fieldset disabled={submitting} className="contents">
                    <div>
                        <label className="text-xs font-semibold text-slate-500 block mb-1">Paciente</label>
                        <div className="flex gap-2 items-start">
                            <DataCombobox
                                value={form.patientId}
                                onChange={(v) => setForm((f) => ({ ...f, patientId: v }))}
                                options={patients.map((p) => ({ value: p._id, label: patientLabel(p) }))}
                                placeholder="Buscar paciente..."
                                size="sm"
                                className="flex-1 min-w-0"
                                labelClassName="hidden"
                            />
                            {/* El botón de nuevo paciente solo aparece si el dashboard que
                                usa este formulario tiene registro rápido de pacientes, como
                                recepción. Enfermería no lo pasa. */}
                            {onRequestNewPatient && (
                                <button
                                    type="button"
                                    onClick={onRequestNewPatient}
                                    className="h-[34px] flex-shrink-0 text-[11px] font-semibold text-blue-600 border border-blue-200 rounded-lg px-2 hover:bg-blue-50"
                                >
                                    Nuevo
                                </button>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-slate-500 block mb-1">Procedimientos</label>
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setProcedurePickerOpen((o) => !o)}
                                className="h-[34px] w-full flex items-center justify-between gap-2 rounded-lg bg-white px-3 border border-slate-200 text-xs focus:outline-none focus:border-blue-400"
                            >
                                <span className={`truncate text-left ${selectedProcedures.length ? "text-slate-700" : "text-slate-400"}`}>
                                    {selectedProcedures.length === 0
                                        ? "Buscar procedimiento..."
                                        : selectedProcedures.map((p) => p.name).join(", ")}
                                </span>
                                <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            </button>
                            {procedurePickerOpen && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setProcedurePickerOpen(false)} />
                                    <div className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg py-1">
                                        {procedures.map((p) => {
                                            const idStr = p._id?.toString();
                                            const checked = form.procedureIds.includes(idStr);
                                            // Con el máximo de procedimientos ya elegido, los demás
                                            // quedan deshabilitados hasta quitar alguno.
                                            const blocked = !checked && form.procedureIds.length >= max_procedures_per_appointment;
                                            return (
                                                <label key={p._id} className={`flex items-center gap-2 px-3 py-1.5 text-xs ${blocked ? "opacity-50 cursor-not-allowed" : "hover:bg-slate-50 cursor-pointer"}`}>
                                                    <input
                                                        type="checkbox"
                                                        checked={checked}
                                                        disabled={blocked}
                                                        onChange={() => {
                                                            setForm((f) => ({
                                                                ...f,
                                                                procedureIds: checked
                                                                    ? f.procedureIds.filter((id) => id !== idStr)
                                                                    : [...f.procedureIds, idStr],
                                                                selectedTime: "",
                                                            }));
                                                            setActiveTab("doctor");
                                                        }}
                                                        className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-400"
                                                    />
                                                    <span className="flex-1 text-slate-700">{p.name}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </>
                            )}
                        </div>
                        {selectedProcedures.length > 0 && (
                            <p className="text-[11px] text-slate-400 mt-1">
                                Duración total: {duration} min · Precio total: ${selectedProcedures.reduce((sum, p) => sum + (Number(p.price) || 0), 0)}
                                {form.procedureIds.length >= max_procedures_per_appointment && (
                                    <span className="text-amber-600"> · Límite de procedimientos por consulta alcanzado</span>
                                )}
                            </p>
                        )}
                    </div>

                    {/* Fecha y horario: oculto hasta elegir procedimiento, porque recién ahí se
                        sabe si el horario agregado sale de doctores o de enfermeras. */}
                    {procedureChosen && (
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-semibold text-slate-500 block mb-1">Fecha</label>
                                <input
                                    type="date"
                                    min={todayStr()}
                                    max={`${new Date().getFullYear() + 1}-12-31`}
                                    value={form.date}
                                    onChange={(e) => {
                                        const value = e.target.value < todayStr() ? todayStr() : e.target.value;
                                        setForm((f) => ({ ...f, date: value, selectedTime: "" }));
                                    }}
                                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-500 block mb-1">Hora</label>
                                <select
                                    value={form.selectedTime}
                                    onChange={(e) => setForm((f) => ({ ...f, selectedTime: e.target.value }))}
                                    disabled={!form.date || loadingSlots}
                                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 bg-white disabled:bg-slate-50"
                                >
                                    <option value="">{loadingSlots ? "Cargando..." : "Seleccionar hora"}</option>
                                    {availableSlots.map((s) => (
                                        <option key={s.start_time} value={s.start_time}>{s.start_time} - {s.end_time}</option>
                                    ))}
                                </select>
                                {!loadingSlots && form.date && availableSlots.length === 0 && (
                                    <p className="text-[11px] text-red-500 mt-1">{noAvailabilityMsg}</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Encargados: oculto hasta elegir fecha y hora, porque recién ahí se sabe
                        quién específicamente está disponible para ese horario exacto. */}
                    {procedureChosen && form.date && form.selectedTime && (
                        <div>
                            <label className="text-xs font-semibold text-slate-500 block mb-1">Encargados</label>

                            {requiresDoctorForProcedure && isNurseRequired ? (
                                <>
                                    <div className="flex gap-1 p-0.5 bg-slate-100 rounded-lg mb-2">
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab("doctor")}
                                            className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-colors ${activeTab === "doctor" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"}`}
                                        >
                                            Doctor
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab("nurse")}
                                            className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-colors ${activeTab === "nurse" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"}`}
                                        >
                                            Enfermera
                                        </button>
                                    </div>

                                    {activeTab === "doctor" ? (
                                        <>
                                            <Combobox
                                                value={form.doctorId}
                                                onValueChange={(value) => setForm((f) => ({ ...f, doctorId: value ?? "" }))}
                                                disabled={loadingProviders}
                                            >
                                                <ComboboxTrigger
                                                    placeholder={loadingProviders ? "Buscando doctores disponibles..." : "Buscar doctor..."}
                                                    className="h-[34px] text-xs bg-white"
                                                />
                                                <ComboboxContent>
                                                    {slotDoctors.map((d) => (
                                                        <ComboboxItem key={d._id} value={d._id}>{doctorLabel(d)}</ComboboxItem>
                                                    ))}
                                                </ComboboxContent>
                                            </Combobox>
                                            {!loadingProviders && slotDoctors.length === 0 && (
                                                <p className="text-[11px] text-red-500 mt-1">
                                                    No hay doctores disponibles para esta fecha y/o horario, por favor escoge otra fecha y/o horario.
                                                </p>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            <Combobox
                                                value={form.nurseId}
                                                onValueChange={(value) => setForm((f) => ({ ...f, nurseId: value ?? "" }))}
                                                disabled={loadingProviders}
                                            >
                                                <ComboboxTrigger
                                                    placeholder={loadingProviders ? "Buscando enfermeras disponibles..." : "Buscar enfermera..."}
                                                    className="h-[34px] text-xs bg-white"
                                                />
                                                <ComboboxContent>
                                                    {slotNurses.map((n) => (
                                                        <ComboboxItem key={n._id} value={n._id}>{nurseLabel(n)}</ComboboxItem>
                                                    ))}
                                                </ComboboxContent>
                                            </Combobox>
                                            {!loadingProviders && slotNurses.length === 0 && (
                                                <p className="text-[11px] text-red-500 mt-1">
                                                    No hay enfermeras disponibles para esta fecha y/o horario, por favor escoge otra fecha y/o horario.
                                                </p>
                                            )}
                                        </>
                                    )}
                                </>
                            ) : requiresDoctorForProcedure ? (
                                <>
                                    <Combobox
                                        value={form.doctorId}
                                        onValueChange={(value) => setForm((f) => ({ ...f, doctorId: value ?? "" }))}
                                        disabled={loadingProviders}
                                    >
                                        <ComboboxTrigger
                                            placeholder={loadingProviders ? "Buscando doctores disponibles..." : "Buscar doctor..."}
                                            className="h-[34px] text-xs bg-white"
                                        />
                                        <ComboboxContent>
                                            {slotDoctors.map((d) => (
                                                <ComboboxItem key={d._id} value={d._id}>{doctorLabel(d)}</ComboboxItem>
                                            ))}
                                        </ComboboxContent>
                                    </Combobox>
                                    {!loadingProviders && slotDoctors.length === 0 && (
                                        <p className="text-[11px] text-red-500 mt-1">
                                            No hay doctores disponibles para esta fecha y/o horario, por favor escoge otra fecha y/o horario.
                                        </p>
                                    )}
                                </>
                            ) : (
                                // Procedimiento sin doctor: la enfermera es la proveedora principal.
                                <>
                                    <Combobox
                                        value={form.nurseId}
                                        onValueChange={(value) => setForm((f) => ({ ...f, nurseId: value ?? "" }))}
                                        disabled={loadingProviders}
                                    >
                                        <ComboboxTrigger
                                            placeholder={loadingProviders ? "Buscando enfermeras disponibles..." : "Buscar enfermera..."}
                                            className="h-[34px] text-xs bg-white"
                                        />
                                        <ComboboxContent>
                                            {slotNurses.map((n) => (
                                                <ComboboxItem key={n._id} value={n._id}>{nurseLabel(n)}</ComboboxItem>
                                            ))}
                                        </ComboboxContent>
                                    </Combobox>
                                    {!loadingProviders && slotNurses.length === 0 && (
                                        <p className="text-[11px] text-red-500 mt-1">
                                            No hay enfermeras disponibles para esta fecha y/o horario, por favor escoge otra fecha y/o horario.
                                        </p>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    <div>
                        <label className="text-xs font-semibold text-slate-500 block mb-1">Motivo de la consulta</label>
                        <textarea
                            rows={2}
                            placeholder="Ej. Control, revisión, síntomas..."
                            maxLength={300}
                            value={form.description}
                            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 resize-none"
                        />
                        <span className="block text-right text-[11px] text-slate-400 mt-0.5">
                            {form.description.length}/300
                        </span>
                    </div>

                    <button
                        type="submit"
                        className="w-full mt-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                        {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        Guardar cita
                    </button>
                </fieldset>
            </form>
        </div>
    );
};

export default QuickAppointmentForm;
