import { useState, useEffect, useRef } from "react";
import { Search, Loader2 } from "lucide-react";
import apiClient from "@/lib/apiClient";
import { showSuccess, showError } from "@/lib/alerts";

const todayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const EMPTY_FORM = { patientId: "", doctorId: "", procedure: "general", date: todayStr(), selectedTime: "", description: "" };

// Un horario cuya hora de inicio ya llegó o quedó atrás (ej. son las 13:15 -> ya no se puede
// agendar el bloque de las 13:00, aunque nunca se haya ocupado) no debe poder elegirse aquí,
// igual que en la tabla de "Agenda de doctores".
const isSlotInPast = (dateStr, startTime) => new Date(`${dateStr}T${startTime}:00`) <= new Date();

// "Registro rápido de citas": versión condensada de AppointmentsForm.jsx para el dashboard de
// recepción. Reutiliza el mismo catálogo (useMedicalData, ya cargado por el dashboard) y el
// mismo endpoint POST /api/appointments — no duplica lógica de negocio, solo el formulario.
const QuickAppointmentForm = ({ medicalData, prefill, onCreated, onRequestNewPatient }) => {
    const { patients, doctors, procedures, getAvailableSlots } = medicalData;

    const [form, setForm] = useState(EMPTY_FORM);
    const [patientSearch, setPatientSearch] = useState("");
    const [showPatientList, setShowPatientList] = useState(false);
    const [rawSlots, setRawSlots] = useState([]);
    const [availableSlots, setAvailableSlots] = useState([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    // Horario elegido con un clic en "Agenda de doctores" (grid fijo de 30 min). El endpoint de
    // horarios sugeridos (getAvailableSlots) deja un margen (buffer_time) entre citas, así que no
    // siempre coincide con esa cuadrícula de 30 min — sin esto, el <select> no podía mostrar la
    // hora elegida porque no había ninguna <option> con ese valor exacto.
    const [pinnedSlot, setPinnedSlot] = useState(null);
    const wrapRef = useRef(null);

    // Precarga doctor/fecha/hora cuando el recepcionista da clic en un espacio libre de la agenda
    useEffect(() => {
        if (!prefill) return;
        setForm((prev) => ({ ...prev, doctorId: prefill.doctorId, date: prefill.date, selectedTime: prefill.start_time }));
        setPinnedSlot({ doctorId: prefill.doctorId, date: prefill.date, start_time: prefill.start_time, end_time: prefill.end_time });
    }, [prefill]);

    useEffect(() => {
        const handler = (e) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target)) setShowPatientList(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const selectedProcedure = procedures.find((p) => p._id?.toString() === form.procedure);
    const duration = form.procedure === "general" ? 30 : Number(selectedProcedure?.estimated_duration) || 30;

    // Vuelve a pedir horarios libres cuando cambia doctor, fecha o duración
    useEffect(() => {
        if (!form.doctorId || !form.date) { setRawSlots([]); return; }
        let cancelled = false;
        setLoadingSlots(true);
        getAvailableSlots(form.doctorId, form.date, duration).then((slots) => {
            if (cancelled) return;
            setRawSlots(slots || []);
        }).finally(() => !cancelled && setLoadingSlots(false));
        return () => { cancelled = true; };
    }, [form.doctorId, form.date, duration]);

    // Combina los horarios sugeridos con el horario "fijado" por un clic en la agenda (si aplica
    // al doctor/fecha actuales), sin volver a pedir datos al backend. Si la fecha elegida es hoy,
    // además descarta cualquier horario cuya hora ya haya pasado o esté en curso.
    useEffect(() => {
        let list = rawSlots;
        if (
            pinnedSlot &&
            pinnedSlot.doctorId === form.doctorId &&
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
    }, [rawSlots, pinnedSlot, form.doctorId, form.date]);

    const selectedPatient = patients.find((p) => p._id === form.patientId);
    const filteredPatients = patientSearch.trim()
        ? patients.filter((p) => `${p.name} ${p.last_name}`.toLowerCase().includes(patientSearch.trim().toLowerCase()))
        : patients.slice(0, 8);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (submitting) return;

        if (!form.patientId) return showError("Selecciona un paciente.");
        if (!form.doctorId) return showError("Selecciona un doctor.");
        if (!form.selectedTime) return showError("Selecciona un horario disponible.");

        const slot = availableSlots.find((s) => s.start_time === form.selectedTime);
        if (!slot) return showError("El horario seleccionado ya no está disponible, elige otro.");

        const total = form.procedure === "general" ? 15 : Number(selectedProcedure?.price) || 0;

        setSubmitting(true);
        try {
            await apiClient("/appointments", {
                method: "POST",
                body: {
                    doctor_id: form.doctorId,
                    patient_id: form.patientId,
                    procedure_id: form.procedure === "general" ? null : form.procedure,
                    type: form.procedure === "general" ? "Consulta Médica General" : (selectedProcedure?.name || "Procedimiento"),
                    date: new Date(`${form.date}T00:00:00`).toISOString(),
                    start_time: slot.start_time,
                    end_time: slot.end_time,
                    duration_minutes: duration,
                    description: form.description.trim() || undefined,
                    status: "pending",
                    total,
                },
            });
            showSuccess("Cita guardada correctamente.");
            setForm(EMPTY_FORM);
            setPatientSearch("");
            setPinnedSlot(null);
            onCreated?.();
        } catch (err) {
            showError(err.message || "No se pudo guardar la cita.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5">
            <h3 className="font-bold text-slate-800 text-sm mb-4">Registro rápido de citas</h3>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <fieldset disabled={submitting} className="contents">
                    <div ref={wrapRef} className="relative">
                        <label className="text-xs font-semibold text-slate-500 block mb-1">Paciente</label>
                        <div className="relative">
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Buscar paciente..."
                                maxLength={100}
                                value={selectedPatient ? `${selectedPatient.name} ${selectedPatient.last_name}` : patientSearch}
                                onChange={(e) => {
                                    setPatientSearch(e.target.value);
                                    setForm((f) => ({ ...f, patientId: "" }));
                                    setShowPatientList(true);
                                }}
                                onFocus={() => setShowPatientList(true)}
                                className={`w-full pl-8 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 ${onRequestNewPatient ? "pr-16" : "pr-3"}`}
                            />
                            {/* El botón "Nuevo" solo tiene sentido si el dashboard que usa este formulario
                                tiene registro rápido de pacientes (recepción); enfermería no lo pasa. */}
                            {onRequestNewPatient && (
                                <button
                                    type="button"
                                    onClick={onRequestNewPatient}
                                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-blue-600 border border-blue-200 rounded-md px-1.5 py-0.5 hover:bg-blue-50"
                                >
                                    Nuevo
                                </button>
                            )}
                        </div>
                        {showPatientList && !selectedPatient && (
                            <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-44 overflow-y-auto">
                                {filteredPatients.length === 0 ? (
                                    <p className="px-3 py-2 text-xs text-slate-400">Sin resultados</p>
                                ) : filteredPatients.map((p) => (
                                    <button
                                        key={p._id}
                                        type="button"
                                        onClick={() => { setForm((f) => ({ ...f, patientId: p._id })); setPatientSearch(""); setShowPatientList(false); }}
                                        className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50"
                                    >
                                        {p.name} {p.last_name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-slate-500 block mb-1">Doctor</label>
                        <select
                            value={form.doctorId}
                            onChange={(e) => setForm((f) => ({ ...f, doctorId: e.target.value, selectedTime: "" }))}
                            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 bg-white"
                        >
                            <option value="">Seleccionar doctor</option>
                            {doctors.map((d) => (
                                <option key={d._id} value={d._id}>Dr. {d.name} {d.last_name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-slate-500 block mb-1">Especialidad</label>
                        <select
                            value={form.procedure}
                            onChange={(e) => setForm((f) => ({ ...f, procedure: e.target.value, selectedTime: "" }))}
                            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 bg-white"
                        >
                            <option value="general">Consulta Médica General</option>
                            {procedures.map((p) => (
                                <option key={p._id} value={p._id}>{p.name}</option>
                            ))}
                        </select>
                    </div>

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
                                disabled={!form.doctorId || loadingSlots}
                                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 bg-white disabled:bg-slate-50"
                            >
                                <option value="">{loadingSlots ? "Cargando..." : "Seleccionar hora"}</option>
                                {availableSlots.map((s) => (
                                    <option key={s.start_time} value={s.start_time}>{s.start_time} - {s.end_time}</option>
                                ))}
                            </select>
                        </div>
                    </div>

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
