import React, { useState, useEffect, useRef } from "react"
import { CheckCircle2, X, Edit2, Save, AlertCircle, Clock, Loader2, User, Stethoscope, CalendarDays, DollarSign, Plus } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import DataCombobox from "@/components/ui/DataCombobox"
import { Combobox, ComboboxContent, ComboboxItem, ComboboxTrigger } from "@/components/ui/combobox"
import { patientLabel, doctorLabel, nurseLabel } from "../lib/personLabels"
import { es } from "date-fns/locale"
import { useNavigate, useParams, useLocation } from "react-router-dom"
import useAppointments from "../hooks/useAppointments"
import useMedicalData from "../hooks/useMedicalData";
import { showSuccess, showError, confirmProceedWithoutNurse } from "@/lib/alerts";
import useSchedule from "../hooks/useSchedule";
import useNurseSchedule from "../hooks/useNurseSchedule";
import { useAuth } from "@/context/AuthContext";
import apiClient from "@/lib/apiClient";
import { formatTime12h as fmt12 } from "@/lib/timeFormat";

// Formulario único para crear, ver y editar una cita. Se usa tanto
// desde la pestaña Calendario como desde la pestaña Citas, e incluye
// la selección de tipo de procedimiento.

const timeToMins = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };

const STATUS_CONFIG = {
  pending:   { label: "Pendiente",   color: "bg-amber-100 text-amber-700 border-amber-200" },
  scheduled: { label: "Programada",  color: "bg-blue-100 text-blue-700 border-blue-200" },
  completed: { label: "Completada",  color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  cancelled: { label: "Cancelada",   color: "bg-red-100 text-red-700 border-red-200" },
};


const SectionCard = ({ title, icon: Icon, children }) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
    <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-50 bg-slate-50/60">
      {Icon && <Icon className="w-4 h-4 text-slate-400" />}
      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{title}</span>
    </div>
    <div className="p-5">{children}</div>
  </div>
);


// onCloseOverride y onSavedOverride son opcionales, para reutilizar
// este mismo formulario dentro de un modal (por ejemplo, "Agregar
// cita" del dashboard de doctor) en vez de depender siempre de la
// navegación por ruta. Sin esos props, cerrar o guardar navega a
// /calendar/appointments.
export default function AppointmentsForm({ onCloseOverride, onSavedOverride } = {}) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { id }    = useParams();

  const closeForm = () => {
    if (onCloseOverride) { onCloseOverride(); return; }
    navigate("/calendar/appointments", { state: { initialView: location.state?.fromView, initialTab: location.state?.fromTab } });
  };

  const { user, userType, hasPermission } = useAuth();
  const isDoctor = userType === "doctor";
  const canCreateAppt = hasPermission("calendar.appointments", "create");
  const canUpdateAppt = hasPermission("calendar.appointments", "update");

  const { getAppointmentById, createAppointment, updateAppointment, submitting } = useAppointments();
  const { patients, doctors, procedures, loadingData: loadingMedicalData } = useMedicalData();
  const { getAvailableSlots, getSchedule } = useSchedule();
  const { getAvailableSlots: getNurseAvailableSlots, getSchedule: getNurseSchedule } = useNurseSchedule();

  // El modo edición inicial respeta el permiso: sin create no arranca en modo
  // creación habilitado, y sin update no arranca en modo edición habilitado
  // (aunque hayan llegado con editMode: true).
  const isViewOrEditMode = !!id;
  const [isEditing, setIsEditing] = useState(
    (!isViewOrEditMode && canCreateAppt) || (!!location.state?.editMode && canUpdateAppt) || false
  );
  // Arranca en estado de carga directamente cuando hay id (vista o
  // edición). Así el primer render ya muestra el spinner en vez de un
  // formulario en blanco, por una fracción de segundo, antes de que el
  // useEffect de abajo alcance a poner loading en true.
  const [loading, setLoading]     = useState(!!id);


  const [formData, setFormData] = useState({ patient_id: "", doctor_id: "", nurse_id: "" });
  // Tipo de cita: catálogo global del admin, limitado a los tipos que el propio
  // procedimiento elegido declaró como elegibles (ver procedure.appointment_type_ids,
  // eligibleAppointmentTypes más abajo). Usado solo para color y leyenda.
  const [appointmentType, setAppointmentType] = useState("");
  // Procedimientos: uno o más selectores, uno por elemento del array (cada elemento es un
  // _id del catálogo, o "" en una fila que se agregó con el botón + y todavía no se eligió
  // nada). La cita puede combinar varios: el tipo, la duración y el precio salen de sumar
  // los realmente elegidos (selectedProcedureIds más abajo, sin las filas vacías; ver el
  // efecto de auto relleno), y si requiere enfermera alcanza con que UNO lo requiera. El
  // botón + ya no crea un procedimiento nuevo en el catálogo (eso se hace desde el módulo
  // Procedimientos): agrega otra fila para elegir un procedimiento más para esta cita.
  const [procedureSlots, setProcedureSlots] = useState([""]);
  const [date, setDate]                       = useState(() => {
    const param = new URLSearchParams(location.search).get("date");
    if (param && !id) {
      const [yr, mo, dy] = param.split("-").map(Number);
      return new Date(yr, mo - 1, dy);
    }
    return new Date();
  });
  // Crear o editar una cita desde este formulario siempre la deja en
  // Programada: cancelar y completar son acciones propias (botón
  // Cancelar cita, y al finalizar y guardar una consulta), no un
  // estado que se elija aquí. status solo guarda el estado real ya
  // cargado, para mostrarlo de forma informativa al ver/editar.
  const [status, setStatus]                   = useState("scheduled");
  // Reagendar aplica a una cita Programada, Pendiente, Por reagendar o Vencida: ninguna
  // tiene todavía una atención real comprometida — pending/needs_reschedule/expired nunca
  // fueron aceptadas por nadie, así que el doctor/admin puede reasignarles fecha/hora/
  // procedimiento antes de eso; cancelada/completada/no_show ya no se puede reagendar (ver
  // también los botones de origen en AppointmentsGrid.jsx y AppointmentsCalendar.jsx, que
  // aplican el mismo criterio).
  const canReschedule = ["scheduled", "pending", "needs_reschedule", "expired"].includes(status);
  const [notes, setNotes]                     = useState("");
  const [cancellationReason, setCancellationReason] = useState("");
  const [total, setTotal]                     = useState("");
  const [duration, setDuration]               = useState(30);
  const [availableSlots, setAvailableSlots]   = useState([]);
  const [slotsLoading, setSlotsLoading]       = useState(false);
  const [selectedSlot, setSelectedSlot]       = useState(null);
  const [scheduleData, setScheduleData]       = useState(null);
  const scheduleId = scheduleData?._id || null;
  // Enfermeras con horario disponible para el doctor, la fecha y el
  // horario ya elegidos. No es el catálogo completo (ver el efecto más
  // abajo).
  const [availableNurses, setAvailableNurses] = useState([]);
  const [loadingNurses, setLoadingNurses]     = useState(false);
  // Enfermeras con horario ya configurado, para cuando la enfermera es la proveedora
  // principal de la cita (procedimiento sin doctor): una enfermera sin horario no tiene
  // forma de calcular horarios libres, así que no debe aparecer como opción ahí. Mismo
  // criterio que QuickAppointmentForm.jsx y que "doctors" más abajo para el caso doctor.
  const [schedulableNurses, setSchedulableNurses] = useState([]);
  useEffect(() => {
    apiClient("/nurses/catalog/schedulable")
      .then((list) => setSchedulableNurses(Array.isArray(list) ? list : []))
      .catch(() => setSchedulableNurses([]));
  }, []);
  // Recuerda el horario original de la cita que se está editando
  // (fecha, doctor y horario), para no perderlo cuando el efecto de
  // abajo vuelve a pedir los horarios disponibles. El backend no
  // excluye la propia cita al calcular qué horarios ya están
  // ocupados, así que sin esto su horario desaparecería de la lista
  // apenas se carga el formulario.
  const originalSlotRef = useRef(null);
  // Evita que el auto relleno de duración y precio del procedimiento
  // (más abajo) pise los valores reales con los que se agendó una
  // cita ya existente, justo en el primer render después de cargarla.
  // Sin esto, editar o ver una cita reemplazaba silenciosamente su
  // costo y duración guardados por el precio y duración actuales del
  // procedimiento, que pudieron cambiar desde entonces.
  const justLoadedRef = useRef(false);

  // Si el usuario es doctor, pre-rellenar su propio ID en citas nuevas
  useEffect(() => {
    if (!isDoctor || !user || !doctors.length || id) return;
    const me = doctors.find(d => d.email === user.email);
    const myId = me?._id || user?.id || "";
    if (myId) setFormData(p => ({ ...p, doctor_id: myId }));
  }, [isDoctor, user, doctors, id]);


  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getAppointmentById(id).then(cita => {
      if (!cita) return;
      const doctorId = cita.doctor_id?._id || cita.doctor_id || "";
      const nurseId = cita.nurse_id?._id || cita.nurse_id || "";
      setFormData({
        patient_id: cita.patient_id?._id || "",
        doctor_id:  doctorId,
        nurse_id:   nurseId,
      });
      setAppointmentType(cita.appointment_type || "");
      // Toda cita (incluida una Consulta Médica General) tiene ahora al menos un
      // procedure_id real (puede traer varios). Una cita histórica de antes de esta
      // migración puede no traer ninguno — queda sin procedimiento seleccionado, para que
      // se vuelva a elegir explícitamente al editarla.
      const procIds = (Array.isArray(cita.procedure_id) ? cita.procedure_id : [cita.procedure_id])
        .map((p) => (typeof p === "object" ? p?._id : p))
        .filter(Boolean);
      setProcedureSlots(procIds.length > 0 ? procIds : [""]);
      const loadedDate = cita.date ? new Date(cita.date) : new Date();
      setDate(loadedDate);
      setStatus(cita.status || "pending");
      setNotes(cita.description || "");
      setCancellationReason(cita.cancellation_reason || "");
      setTotal(String(cita.total || ""));
      // Restaura la duración real con la que se agendó la cita, en vez
      // de caer siempre en el valor por defecto de 30 minutos.
      setDuration(cita.duration_minutes || 30);
      setScheduleData(cita.schedule_id ? { _id: cita.schedule_id } : null);
      if (cita.start_time && cita.end_time) {
        const slot = { start_time: cita.start_time, end_time: cita.end_time };
        setSelectedSlot(slot);
        originalSlotRef.current = {
          date: `${loadedDate.getFullYear()}-${String(loadedDate.getMonth() + 1).padStart(2, "0")}-${String(loadedDate.getDate()).padStart(2, "0")}`,
          doctor_id: doctorId,
          nurse_id: nurseId,
          ...slot,
        };
      }
      // A partir de aquí, cualquier cambio en procedure ya es decidido
      // genuinamente por el usuario (no un efecto secundario de cargar
      // la cita), así que el auto relleno de abajo puede aplicar con
      // normalidad.
      justLoadedRef.current = true;
      // Una cita cancelada, completada o no presentada ya no se puede reagendar (ver
      // también los botones de origen en AppointmentsGrid.jsx y AppointmentsCalendar.jsx,
      // que ni siquiera abren este formulario en modo edición para esos estados). Antes
      // esta condición era "!== scheduled", así que también forzaba modo solo-lectura para
      // "pending" — contradecía el propio botón "Editar" que el Grid ya mostraba para
      // citas pendientes, nunca dejaba editarlas de verdad.
      if (!["scheduled", "pending", "needs_reschedule", "expired"].includes(cita.status)) {
        setIsEditing(false);
      }
    }).catch(() => showError("No se pudo recuperar la información de la cita."))
      .finally(() => setLoading(false));
  }, [id]);


  // Ids realmente elegidos, sin las filas vacías (procedureSlots puede traer "" en la
  // última fila agregada con + mientras no se elija nada ahí todavía). Procedimientos
  // seleccionados (objetos completos) y si el conjunto exige asignar enfermera. Declarados
  // antes del efecto de horario de abajo (que depende de requiresDoctorForProcedure): un
  // const referenciado antes de su propia línea de declaración revienta con "Cannot access
  // before initialization" en cada render, aunque esté más abajo en el mismo cuerpo de
  // función — no es como una function declaration, que sí queda hoisted.
  const selectedProcedureIds = procedureSlots.filter(Boolean);
  const selectedProcedures = procedures.filter(p => selectedProcedureIds.includes(p._id));
  // Alcanza con que UNO de los procedimientos elegidos lo requiera.
  const isNurseRequired = selectedProcedures.some(p => !!p.requires_nurse);
  // Un procedimiento sin doctor (requires_doctor false) lo atiende una enfermera como
  // proveedora principal, sin doctor: ahí "Doctor asignado" se deshabilita y "Enfermera
  // asignada" pasa a ser el campo principal (elige primero, como el doctor en el resto de
  // los casos), en vez de ser un apoyo elegido después del horario. Mezclar uno que
  // requiere doctor con uno que no, el doctor pasa a ser el proveedor principal. Sin
  // ningún procedimiento elegido todavía, por defecto se asume que sí requiere doctor.
  const requiresDoctorForProcedure =
    selectedProcedures.length === 0 || selectedProcedures.some(p => p.requires_doctor !== false);

  // Horario del proveedor principal de la cita: del doctor normalmente, o de la
  // enfermera cuando el procedimiento elegido no requiere doctor. Mismo dato
  // (scheduleData) sin importar cuál de los dos sea, ambos horarios tienen la misma
  // forma (weekly_availability, breaks, exceptions, buffer_time).
  useEffect(() => {
    if (requiresDoctorForProcedure) {
      if (!formData.doctor_id) { setScheduleData(null); return; }
      getSchedule(formData.doctor_id)
        .then(s => setScheduleData(s))
        .catch(() => setScheduleData(null));
    } else {
      if (!formData.nurse_id) { setScheduleData(null); return; }
      getNurseSchedule(formData.nurse_id)
        .then(s => setScheduleData(s))
        .catch(() => setScheduleData(null));
    }
  }, [requiresDoctorForProcedure, formData.doctor_id, formData.nurse_id]);

  // Los procedimientos elegidos definen la duración y el precio: la cita combina la suma
  // de todos (incluida la Consulta Médica General, que ahora es un procedimiento real con
  // estimated_duration/price propios en vez de un valor fijo en el código). El guard de
  // justLoadedRef evita pisar los valores reales de una cita ya guardada justo después de
  // cargarla (ver ese ref más arriba).
  useEffect(() => {
    if (justLoadedRef.current) { justLoadedRef.current = false; return; }
    if (selectedProcedures.length > 0) {
      const totalDuration = selectedProcedures.reduce((sum, p) => sum + (Number(p.estimated_duration) || 30), 0);
      const totalPrice = selectedProcedures.reduce((sum, p) => sum + (Number(p.price) || 0), 0);
      setDuration(totalDuration);
      setTotal(String(totalPrice));
    }
  }, [selectedProcedureIds.join(","), selectedProcedures.length]);

  // Si el procedimiento deja de requerir enfermera, se limpia la ya elegida. Un
  // procedimiento sin doctor siempre requiere enfermera (invariante del backend), así que
  // esto nunca limpia el nurse_id de un procedimiento sin doctor por accidente.
  useEffect(() => {
    if (!isNurseRequired && formData.nurse_id) {
      setFormData(p => ({ ...p, nurse_id: "" }));
    }
  }, [isNurseRequired]);

  // Si el procedimiento pasa a no requerir doctor, se limpia el doctor ya elegido (o
  // pre-rellenado, ver el efecto de arriba para el rol doctor): "Enfermera asignada" pasa
  // a ser el proveedor principal en su lugar.
  useEffect(() => {
    if (!requiresDoctorForProcedure && formData.doctor_id) {
      setFormData(p => ({ ...p, doctor_id: "" }));
    }
  }, [requiresDoctorForProcedure]);

  // El tipo de cita (catálogo del admin) queda limitado a los que el PRIMER procedimiento
  // elegido declaró como elegibles (procedure.appointment_type_ids, ver el modelo): el
  // admin decide esto al crear o editar cada procedimiento, ya no se infiere comparando
  // categorías contra un valor especial "general". appointment_type solo colorea el
  // calendario (no afecta precio ni duración), así que basta con el primero elegido.
  // Populado por el backend con name/color.
  const eligibleAppointmentTypes = selectedProcedures[0]?.appointment_type_ids || [];
  // Autocompleta el tipo de cita al elegir procedimiento, en vez de solo limpiarlo cuando
  // deja de ser válido: usa el primer tipo elegible como valor por defecto. El usuario
  // sigue pudiendo elegir cualquier otro de la lista; esto solo decide el valor inicial.
  // No pisa un valor ya válido (ej. uno cargado al editar una cita existente).
  useEffect(() => {
    if (appointmentType && eligibleAppointmentTypes.some(t => t.name === appointmentType)) return;
    setAppointmentType(eligibleAppointmentTypes[0]?.name || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eligibleAppointmentTypes]);


  useEffect(() => {
    // Proveedor principal de la cita: el doctor normalmente, o la enfermera cuando el
    // procedimiento elegido no requiere doctor (ver requiresDoctorForProcedure arriba).
    const providerId = requiresDoctorForProcedure ? formData.doctor_id : formData.nurse_id;
    const providerKey = requiresDoctorForProcedure ? "doctor_id" : "nurse_id";
    const fetchSlots = requiresDoctorForProcedure ? getAvailableSlots : getNurseAvailableSlots;

    if (!providerId || !date) { setAvailableSlots([]); setSelectedSlot(null); return; }
    setSlotsLoading(true);
    // Usa la fecha local para evitar que cambie de día en husos
    // horarios adelantados a UTC.
    const dateStr = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
    fetchSlots(providerId, dateStr, duration)
      .then(res => {
        let slots = res.slots || [];
        // Si se está editando la cita y su horario original no aparece
        // en la lista (el backend no excluye la propia cita al
        // calcular qué horarios ya están ocupados), se reinyecta para
        // no perder la selección ya guardada.
        const original = originalSlotRef.current;
        if (original && original.date === dateStr && original[providerKey] === providerId) {
          const yaIncluido = slots.some(s => s.start_time === original.start_time);
          if (!yaIncluido) {
            slots = [{ start_time: original.start_time, end_time: original.end_time }, ...slots];
          }
        }
        setAvailableSlots(slots);
        // Conserva la selección actual si sigue siendo válida en la
        // nueva lista. Si no, mantiene el horario original de la cita
        // (mismo proveedor y fecha) en vez de dejarla en blanco.
        setSelectedSlot(prev => {
          if (prev && slots.some(s => s.start_time === prev.start_time)) return prev;
          if (original && original.date === dateStr && original[providerKey] === providerId) {
            return { start_time: original.start_time, end_time: original.end_time };
          }
          return null;
        });
      })
      .catch(() => setAvailableSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [requiresDoctorForProcedure, formData.doctor_id, formData.nurse_id, date, duration]);

  // Enfermeras disponibles para el horario ya elegido, usa el mismo
  // endpoint que AppointmentsGrid.jsx al aceptar o asignar una cita.
  // Solo tiene sentido pedirlas si el procedimiento realmente requiere
  // una (ver isNurseRequired arriba). Si no, no se hace la consulta y
  // el input queda deshabilitado.
  useEffect(() => {
    if (!isNurseRequired || !formData.doctor_id || !selectedSlot || !date) { setAvailableNurses([]); return; }
    let cancelled = false;
    setLoadingNurses(true);
    const dateStr = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
    apiClient("/appointments/nurses-for-acceptance", {
      params: {
        date: dateStr,
        start_time: selectedSlot.start_time,
        end_time: selectedSlot.end_time,
        appointment_id: id,
      },
    }).then((response) => {
      if (cancelled) return;
      const list = Array.isArray(response) ? response : response.data || [];
      setAvailableNurses(list);
      // Si la enfermera ya elegida (ej. cargada al editar una cita) no está en la lista
      // recién obtenida, se limpia en vez de dejar una asignación inválida.
      setFormData(p => (p.nurse_id && !list.some(n => n._id === p.nurse_id) ? { ...p, nurse_id: "" } : p));
    }).catch(() => {
      if (!cancelled) setAvailableNurses([]);
    }).finally(() => {
      if (!cancelled) setLoadingNurses(false);
    });
    return () => { cancelled = true; };
  }, [isNurseRequired, formData.doctor_id, date, selectedSlot, id]);

  // Agrega una fila vacía más para elegir otro procedimiento, o quita la fila i (nunca
  // deja el array vacío: si se quita la única fila que queda, la reemplaza por una vacía).
  const agregarProcedimiento = () => setProcedureSlots(prev => [...prev, ""]);
  const quitarProcedimiento = (i) => setProcedureSlots(prev => {
    const next = prev.filter((_, idx) => idx !== i);
    return next.length > 0 ? next : [""];
  });
  const elegirProcedimientoEnFila = (i, valor) => setProcedureSlots(prev =>
    prev.map((id, idx) => (idx === i ? (valor ?? "") : id))
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (selectedProcedureIds.length === 0) {
      showError("Debe seleccionar al menos un procedimiento."); return;
    }
    if (!formData.patient_id || (requiresDoctorForProcedure ? !formData.doctor_id : !formData.nurse_id)) {
      showError(requiresDoctorForProcedure ? "Debe seleccionar un paciente y un doctor." : "Debe seleccionar un paciente y una enfermera."); return;
    }
    if (!selectedSlot) {
      showError("Debe seleccionar un horario."); return;
    }
    if (!total || Number(total) <= 0) {
      showError("Debe ingresar un costo válido."); return;
    }
    if (!scheduleId) {
      showError(requiresDoctorForProcedure ? "El doctor seleccionado no tiene horario configurado." : "La enfermera seleccionada no tiene horario configurado."); return;
    }
    // Un procedimiento con doctor + enfermera de apoyo sin enfermera elegida no bloquea el
    // guardado sin salida: si hay enfermeras disponibles para este horario, sigue siendo
    // obligatorio elegir una; si de verdad no hay ninguna, se ofrece continuar igual con
    // confirmación explícita en vez de dejar atascado el flujo de agendar (ver
    // confirmProceedWithoutNurse en alerts.jsx, mismo criterio que AppointmentsGrid.jsx al
    // aceptar/asignar una cita).
    let confirmNoNurse = false;
    if (requiresDoctorForProcedure && isNurseRequired && !formData.nurse_id) {
      if (loadingNurses) {
        showError("Espera a que termine de cargar la lista de enfermeras."); return;
      }
      if (availableNurses.length > 0) {
        const nombresConEnfermera = selectedProcedures.filter(p => p.requires_nurse).map(p => p.name).join(", ");
        showError(`El procedimiento "${nombresConEnfermera}" requiere obligatoriamente asignar una enfermera.`); return;
      }
      const confirmed = await confirmProceedWithoutNurse();
      if (!confirmed) return;
      confirmNoNurse = true;
    }

    const durationMins = timeToMins(selectedSlot.end_time) - timeToMins(selectedSlot.start_time);
    const appointmentData = {
      doctor_id:         requiresDoctorForProcedure ? formData.doctor_id : undefined,
      patient_id:        formData.patient_id,
      nurse_id:          formData.nurse_id || undefined,
      procedure_ids:      selectedProcedureIds,
      schedule_id:       scheduleId,
      // "Consulta Médica General" ahora es un procedimiento real más (no un caso
      // especial): se identifica por nombre solo para mantener el mismo campo type de
      // siempre (usado por los reportes para separar consultas de procedimientos). Con
      // más de un procedimiento elegido, o con uno solo que no sea ese, es "Procedimiento"
      // (mismo criterio que resolveProcedures en el backend, que además vuelve a validar
      // esto — nunca se confía solo en lo que mande el cliente).
      type:              selectedProcedureIds.length === 1 && selectedProcedures[0]?.name === "Consulta Médica General" ? "Consulta Médica General" : "Procedimiento",
      // appointment_type (el catálogo del admin) solo categoriza y
      // colorea la cita en la leyenda del calendario, es independiente
      // del tipo de procedimiento.
      appointment_type:  appointmentType || undefined,
      date:              date.toISOString(),
      start_time:        selectedSlot.start_time,
      end_time:          selectedSlot.end_time,
      duration_minutes:  durationMins,
      description:       notes.trim(),
      // Crear o editar desde este formulario siempre deja la cita
      // Programada (ver tarjeta Estado más abajo): cancelar y
      // completar son acciones propias, no un valor que se elija aquí.
      status:            "scheduled",
      total:             Number(total),
      cancellation_reason: "",
      confirm_no_nurse:  confirmNoNurse || undefined,
    };

    try {
      if (id) {
        const success = await updateAppointment(id, appointmentData);
        if (success) {
          setIsEditing(false);
          showSuccess("Cita modificada con éxito");
          onSavedOverride ? onSavedOverride() : closeForm();
        }
      } else {
        const success = await createAppointment(appointmentData);
        if (success) { (onSavedOverride ? onSavedOverride() : closeForm()); showSuccess("Cita guardada exitosamente"); }
      }
    } catch (err) {
      showError(`No se pudo guardar la cita: ${err.message}`);
    }
  };


  const selectedPatient = patients.find(p => p._id === formData.patient_id);
  const selectedDoctor  = doctors.find(d => d._id === formData.doctor_id);
  // En modo enfermera proveedora principal, sus opciones salen del catálogo de enfermeras
  // con horario configurado (schedulableNurses), no de availableNurses (el filtro por
  // horario del modo de apoyo, que en ese modo nunca se llega a pedir).
  const selectedNurse   = (requiresDoctorForProcedure ? availableNurses : schedulableNurses).find(n => n._id === formData.nurse_id);

  // Filtra slots ya pasados cuando la fecha seleccionada es hoy
  const now = new Date();
  const isToday = date && date.toDateString() === now.toDateString();
  const currentMins = now.getHours() * 60 + now.getMinutes();
  const visibleSlots = isToday
    ? availableSlots.filter(s => timeToMins(s.start_time) > currentMins)
    : availableSlots;
  const pastCount = availableSlots.length - visibleSlots.length;

  // Deshabilita días sin horario ni excepciones en el calendario
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const toDStr = (d) =>
    `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;

  const isDateDisabled = (d) => {
    if (d < today) return true;

    // Días no disponibles por horario semanal
    if (scheduleData?.weekly_availability) {
      const cfg = scheduleData.weekly_availability.find(x => x.day === d.getDay());
      if (cfg && !cfg.is_available) return true;
    }

    // Excepciones: días no laborables y vacaciones (no aplica
    // special_hours porque en ese caso sigue habiendo atención)
    if (scheduleData?.exceptions?.length) {
      const dStr = toDStr(d);
      const blocked = scheduleData.exceptions.some(ex => {
        if (ex.type === "special_hours") return false;
        const start = (ex.date || "").split("T")[0];
        if (ex.end_date) {
          const end = (ex.end_date || "").split("T")[0];
          return dStr >= start && dStr <= end;
        }
        return start === dStr;
      });
      if (blocked) return true;
    }

    return false;
  };

  // Días con descanso recurrente (para marcar con un punto en el calendario)
  const breakDayNums = new Set(scheduleData?.breaks?.map(b => b.day) ?? []);

  // Bloquea el formulario hasta que los catálogos de los que dependen los selectores
  // (pacientes, doctores, enfermeras, procedimientos y tipos de cita) terminen de cargar,
  // tanto al crear como al editar. Sin esto, un clic en un dropdown antes de que la petición
  // resuelva mostraba la lista vacía.
  if (loading || loadingMedicalData) return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center bg-slate-50">
      <Loader2 className="h-8 w-8 text-blue-600 animate-spin mb-3" />
      <p className="text-sm text-slate-500">Cargando cita...</p>
    </div>
  );

  return (
    <div className="w-full bg-slate-50 min-h-screen">

      {/* pr-16 sm:pr-20 (en vez del px-6 parejo) le da al lado derecho el
          espacio extra que necesita la campana de notificaciones (fixed,
          ver MainLayout.jsx) para no quedar encima del botón de cerrar.
          Esta barra es sticky, así que siempre está a la vista. */}
      <div className="bg-white border-b border-slate-100 pl-6 pr-16 sm:pr-20 py-4 flex items-center justify-between sticky top-0 z-10">
        <div>
          <h1 className="text-lg font-bold text-slate-900">
            {!id ? "Nueva cita" : isEditing ? "Editar cita" : "Detalle de la cita"}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {!id ? "Completa los datos para agendar una nueva cita médica" : isEditing ? "Modifica los datos de la cita" : "Vista de solo lectura"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {id && !isEditing && canUpdateAppt && canReschedule && (
            <button onClick={() => setIsEditing(true)} disabled={submitting}
              className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
              <Edit2 className="w-3.5 h-3.5" /> Editar
            </button>
          )}
          {/* fromView y fromTab (puestos por AppointmentsCalendar.jsx o
              AppointmentsGrid.jsx al abrir esta cita) recuerdan si se
              venía del Calendario o de Citas (y su sub pestaña). Sin
              esto, siempre se volvía al Calendario por defecto (ver
              Appointments.jsx) en vez de a la pantalla exacta que el
              usuario tenía abierta. */}
          <button type="button" onClick={closeForm} disabled={submitting}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-5xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* fieldset con display:contents. Además del control existente
            por !isEditing, esto desactiva todo durante el envío
            (submitting), sin alterar el layout de grid */}
        <fieldset disabled={submitting} className="contents">

        <div className="lg:col-span-2 flex flex-col gap-5">


          <SectionCard title="Participantes" icon={User}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DataCombobox
                label="Paciente"
                value={formData.patient_id}
                onChange={v => setFormData(p => ({ ...p, patient_id: v }))}
                options={patients.map(p => ({ value: p._id, label: patientLabel(p) }))}
                placeholder="Seleccione un paciente"
                disabled={!isEditing}
              />

              {/* Procedimientos: uno o más, definen el tipo, la duración y el precio
                  totales (suma de todos) y si la cita requiere enfermera. Una fila por
                  procedimiento (selección única cada una, como antes); el botón + de la
                  última fila agrega otra para elegir uno más, en vez de crear un
                  procedimiento nuevo en el catálogo (eso ahora se hace desde el módulo
                  Procedimientos). */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Procedimientos</label>
                <div className="flex flex-col gap-2">
                  {procedureSlots.map((slotValue, i) => {
                    const esUltima = i === procedureSlots.length - 1;
                    return (
                      <div className="flex gap-2" key={i}>
                        <Combobox
                          value={slotValue ?? ""}
                          onValueChange={v => elegirProcedimientoEnFila(i, v)}
                          disabled={!isEditing}
                        >
                          <ComboboxTrigger
                            size="lg"
                            placeholder={procedureSlots.length > 1 ? `Seleccione el procedimiento ${i + 1}` : "Seleccione un procedimiento"}
                            className="h-[42px] flex-1 min-w-0 rounded-xl bg-white px-3 border-slate-200 focus-within:border-blue-400 focus-within:ring-blue-100"
                          />
                          <ComboboxContent className="max-h-72">
                            {procedures
                              .filter(proc => proc._id === slotValue || !procedureSlots.includes(proc._id))
                              .map(proc => (
                                <ComboboxItem key={proc._id} value={proc._id}>{proc.name}</ComboboxItem>
                              ))}
                          </ComboboxContent>
                        </Combobox>
                        {esUltima ? (
                          <button
                            type="button"
                            disabled={!isEditing || !slotValue || procedureSlots.length >= procedures.length}
                            onClick={agregarProcedimiento}
                            title="Agregar otro procedimiento"
                            className="h-[42px] w-[42px] flex-shrink-0 flex items-center justify-center border border-slate-200 rounded-xl text-slate-500 hover:text-blue-600 hover:border-blue-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={!isEditing}
                            onClick={() => quitarProcedimiento(i)}
                            title="Quitar este procedimiento"
                            className="h-[42px] w-[42px] flex-shrink-0 flex items-center justify-center border border-slate-200 rounded-xl text-slate-400 hover:text-red-600 hover:border-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
                {selectedProcedures.length > 0 && (
                  <p className="text-[11px] text-slate-400">
                    Duración total: {duration} min · Precio total: ${total || 0}
                    {isNurseRequired && " · Requiere enfermera"}
                  </p>
                )}
              </div>

              <DataCombobox
                label="Tipo de cita"
                value={appointmentType}
                onChange={setAppointmentType}
                options={eligibleAppointmentTypes.map(t => ({ value: t.name, label: t.name }))}
                placeholder={
                  selectedProcedures.length === 0
                    ? "Elija primero un procedimiento"
                    : eligibleAppointmentTypes.length === 0
                      ? "Este procedimiento no tiene tipos de cita configurados"
                      : "Sin especificar"
                }
                disabled={!isEditing}
              />
              <DataCombobox
                label="Doctor asignado"
                value={formData.doctor_id}
                onChange={v => setFormData(p => ({ ...p, doctor_id: v }))}
                options={doctors.map(d => ({ value: d._id, label: doctorLabel(d) }))}
                placeholder={requiresDoctorForProcedure ? "Seleccione un doctor" : "No requerido para este servicio"}
                disabled={isDoctor || !isEditing || !requiresDoctorForProcedure}
              />
              {/* Cuando el procedimiento no requiere doctor, este campo pasa a ser el
                  proveedor principal de la cita (se elige primero, como el doctor en el
                  resto de los casos): sus opciones salen del catálogo completo de
                  enfermeras, no del filtro por horario ya elegido que usa el modo de apoyo. */}
              <DataCombobox
                label="Enfermera asignada"
                value={formData.nurse_id}
                onChange={v => setFormData(p => ({ ...p, nurse_id: v }))}
                options={
                  requiresDoctorForProcedure
                    ? availableNurses.map(n => ({ value: n._id, label: nurseLabel(n) }))
                    : schedulableNurses.map(n => ({ value: n._id, label: nurseLabel(n) }))
                }
                placeholder={
                  !requiresDoctorForProcedure
                    ? "Seleccione una enfermera"
                    : !isNurseRequired
                      ? "No requerida para este servicio"
                      : !selectedSlot
                        ? "Elija primero doctor, fecha y horario"
                        : loadingNurses
                          ? "Buscando enfermeras disponibles..."
                          : availableNurses.length === 0
                            ? "Sin enfermeras disponibles en ese horario"
                            : "Seleccione una enfermera"
                }
                disabled={
                  !isEditing || (requiresDoctorForProcedure && (!isNurseRequired || !selectedSlot || loadingNurses))
                }
              />
            </div>


            {(selectedDoctor || (!requiresDoctorForProcedure && selectedNurse) || selectedPatient) && (
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-50">
                {selectedDoctor && (
                  <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-1.5">
                    <div className="w-6 h-6 rounded-full bg-blue-200 flex items-center justify-center text-blue-700 text-xs font-bold flex-shrink-0">
                      {selectedDoctor.name?.[0]}
                    </div>
                    <span className="text-xs font-medium text-blue-800">Dr. {selectedDoctor.name} {selectedDoctor.last_name}</span>
                    {selectedDoctor.specialty && <span className="text-xs text-blue-500">· {selectedDoctor.specialty}</span>}
                    {scheduleId
                      ? <span className="text-[10px] bg-green-100 text-green-600 px-1.5 py-0.5 rounded-full font-medium">Horario ✓</span>
                      : <span className="text-[10px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full font-medium">Sin horario</span>
                    }
                  </div>
                )}
                {/* Enfermera como proveedora principal (procedimiento sin doctor). La
                    enfermera de apoyo (isNurseRequired con doctor) no lleva chip propio, ya
                    lo tenía así antes de este cambio. */}
                {!requiresDoctorForProcedure && selectedNurse && (
                  <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-1.5">
                    <div className="w-6 h-6 rounded-full bg-emerald-200 flex items-center justify-center text-emerald-700 text-xs font-bold flex-shrink-0">
                      {selectedNurse.name?.[0]}
                    </div>
                    <span className="text-xs font-medium text-emerald-800">{selectedNurse.name} {selectedNurse.last_name}</span>
                    {scheduleId
                      ? <span className="text-[10px] bg-green-100 text-green-600 px-1.5 py-0.5 rounded-full font-medium">Horario ✓</span>
                      : <span className="text-[10px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full font-medium">Sin horario</span>
                    }
                  </div>
                )}
                {selectedPatient && (
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
                    <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 text-xs font-bold flex-shrink-0">
                      {selectedPatient.name?.[0]}
                    </div>
                    <span className="text-xs font-medium text-slate-700">{selectedPatient.name} {selectedPatient.last_name}</span>
                    {selectedPatient.dui && <span className="text-xs text-slate-400">· {selectedPatient.dui}</span>}
                  </div>
                )}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Fecha y horario" icon={CalendarDays}>
            <div className="flex flex-col lg:flex-row gap-5">

              <div className={`flex-shrink-0 ${!isEditing || submitting ? "pointer-events-none opacity-70" : ""}`}>
                <Calendar
                  mode="single"
                  locale={es}
                  selected={date}
                  defaultMonth={date}
                  onSelect={isEditing && !submitting ? setDate : undefined}
                  fromDate={today}
                  disabled={isDateDisabled}
                  modifiers={{
                    hasBreak: (d) => !isDateDisabled(d) && breakDayNums.has(d.getDay()),
                  }}
                  modifiersStyles={{
                    hasBreak: { borderBottom: "2px solid #fbbf24", borderRadius: "0" },
                  }}
                  className="rounded-xl border border-slate-100"
                  classNames={{
                    month: "space-y-3",
                    caption: "flex justify-center pt-1 relative items-center",
                    caption_label: "text-sm font-semibold text-slate-800 capitalize",
                    nav_button: "h-7 w-7 bg-transparent hover:bg-slate-100 rounded-lg flex items-center justify-center text-slate-500",
                    head_cell: "text-slate-400 rounded-md w-9 font-medium text-[0.8rem] uppercase",
                    day: "h-9 w-9 p-0 font-medium text-sm text-slate-700 hover:bg-blue-50 rounded-full flex items-center justify-center transition-colors",
                    day_selected: "bg-blue-600 text-white rounded-full font-bold hover:bg-blue-700",
                    day_today: "border-2 border-blue-400 text-blue-600 font-bold rounded-full",
                    day_outside: "text-slate-300",
                    day_disabled: "text-slate-200 cursor-not-allowed opacity-40",
                  }}
                />
                {scheduleData && (
                  <div className="flex flex-wrap items-center gap-3 mt-2 px-1">
                    <span className="flex items-center gap-1 text-[10px] text-slate-400">
                      <span className="w-3 h-0.5 bg-amber-400 rounded-full inline-block" />
                      Con descanso
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-slate-400">
                      <span className="w-3 h-3 rounded-full bg-slate-200 inline-block opacity-40" />
                      No disponible
                    </span>
                  </div>
                )}
              </div>

              {/* Slots */}
              <div className="flex-1 flex flex-col gap-3 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-700">Horarios disponibles</span>
                    {visibleSlots.length > 0 && (
                      <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full font-medium">
                        {visibleSlots.length} disponibles
                      </span>
                    )}
                    {pastCount > 0 && (
                      <span className="text-[10px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-full font-medium">
                        {pastCount} ya pasaron
                      </span>
                    )}
                  </div>
                  {/* La duración ya no se elige a mano: siempre la define el
                      tipo de procedimiento elegido (o el valor fijo de
                      Consulta Médica General), ver el efecto de auto
                      relleno más arriba. */}
                  <span className="text-[11px] font-medium text-slate-400 bg-slate-50 border border-slate-100 rounded-lg px-2 py-1">
                    Duración: {duration} min
                  </span>
                </div>

                {slotsLoading ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-2 text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
                    <span className="text-xs">Cargando horarios...</span>
                  </div>
                ) : (requiresDoctorForProcedure ? !formData.doctor_id : !formData.nurse_id) ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                      <Stethoscope className="w-6 h-6 text-slate-300" />
                    </div>
                    <p className="text-xs text-slate-400 max-w-[160px]">
                      {requiresDoctorForProcedure ? "Selecciona un doctor para ver los horarios" : "Selecciona una enfermera para ver los horarios"}
                    </p>
                  </div>
                ) : visibleSlots.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                      <Clock className="w-6 h-6 text-slate-300" />
                    </div>
                    <p className="text-xs font-medium text-slate-500">Sin horarios disponibles</p>
                    <p className="text-[10px] text-slate-400">
                      {pastCount > 0 ? "Todos los turnos de hoy ya pasaron — elige otro día" : "Prueba otra fecha o revisa la configuración del doctor"}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-y-auto pr-1" style={{ maxHeight: "260px" }}>
                    <div className="grid grid-cols-2 gap-1.5">
                      {visibleSlots.map((slot, i) => {
                        const isSelected = selectedSlot?.start_time === slot.start_time;
                        return (
                          <button key={i} type="button" disabled={!isEditing}
                            onClick={() => setSelectedSlot(isSelected ? null : slot)}
                            className={`flex flex-col items-center py-2.5 px-2 rounded-xl text-xs font-semibold transition-all border ${
                              isSelected
                                ? "bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-200 scale-[1.02]"
                                : "bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                            } disabled:opacity-60 disabled:cursor-not-allowed`}
                          >
                            <span className={isSelected ? "text-blue-100 text-[9px] font-medium" : "text-[9px] text-slate-400 font-medium"}>
                              {fmt12(slot.start_time).split(" ")[1]}
                            </span>
                            <span className="text-[13px] font-bold leading-tight">
                              {fmt12(slot.start_time).split(" ")[0]}
                            </span>
                            <span className={`text-[9px] mt-0.5 ${isSelected ? "text-blue-200" : "text-slate-400"}`}>
                              hasta {fmt12(slot.end_time).split(" ")[0]}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {selectedSlot && (
                  <div className="flex items-center gap-2 bg-blue-600 rounded-xl px-4 py-2.5 mt-1">
                    <Clock className="w-3.5 h-3.5 text-blue-200 flex-shrink-0" />
                    <div className="flex-1">
                      <span className="text-[10px] text-blue-300 block leading-none">Horario seleccionado</span>
                      <span className="text-xs font-bold text-white">
                        {fmt12(selectedSlot.start_time)} – {fmt12(selectedSlot.end_time)}
                      </span>
                    </div>
                    <button type="button" onClick={() => setSelectedSlot(null)}
                      className="text-blue-300 hover:text-white transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </SectionCard>
        </div>


        <div className="flex flex-col gap-5">

          <SectionCard title="Estado" icon={CheckCircle2}>
            {isEditing ? (
              <>
                <span className={`inline-flex px-3 py-1.5 rounded-lg text-xs font-semibold border w-fit ${STATUS_CONFIG.scheduled.color}`}>
                  {STATUS_CONFIG.scheduled.label}
                </span>
                <p className="text-[11px] text-slate-400 mt-2">
                  Toda cita creada o editada aquí queda Programada. Si desea cancelar una cita o marcarla como completada, hacerlo en sus respectivos apartados del calendario y consultas.
                </p>
              </>
            ) : (
              <span className={`inline-flex px-3 py-1.5 rounded-lg text-xs font-semibold border w-fit ${(STATUS_CONFIG[status] || STATUS_CONFIG.scheduled).color}`}>
                {(STATUS_CONFIG[status] || STATUS_CONFIG.scheduled).label}
              </span>
            )}

            {status === "cancelled" && (
              <div className="mt-3">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Motivo de cancelación</label>
                <Textarea disabled value={cancellationReason}
                  placeholder="Sin motivo registrado"
                  maxLength={300}
                  className="min-h-[80px] border-red-200 bg-red-50/30 rounded-xl resize-none text-sm" />
              </div>
            )}
          </SectionCard>

          <SectionCard title="Costo total" icon={DollarSign}>
            <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-blue-200 focus-within:border-blue-400 transition-all bg-white">
              <span className="text-slate-400 text-sm font-medium">$</span>
              <input type="number" min="0" max="999999" step="0.01" disabled={!isEditing}
                value={total} onChange={e => setTotal(e.target.value)}
                onKeyDown={(e) => { if (["-", "e", "E", "+"].includes(e.key)) e.preventDefault(); }}
                placeholder="0.00"
                className="flex-1 text-sm text-slate-700 bg-transparent outline-none placeholder:text-slate-300 disabled:text-slate-400" />
            </div>
          </SectionCard>


          <SectionCard title="Notas / Descripción" icon={AlertCircle}>
            <Textarea disabled={!isEditing} value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ingrese detalles adicionales de la cita..."
              maxLength={1000}
              className="min-h-[120px] border-slate-200 focus-visible:ring-blue-200 rounded-xl text-sm resize-none disabled:bg-slate-50" />
          </SectionCard>


          {isEditing && (
            <button type="submit" disabled={submitting}
              className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-60 shadow-sm shadow-blue-200 text-sm">
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
                           : <><Save className="w-4 h-4" /> {id ? "Guardar cambios" : "Crear cita"}</>}
            </button>
          )}
        </div>
        </fieldset>
      </form>
    </div>
  );
}
