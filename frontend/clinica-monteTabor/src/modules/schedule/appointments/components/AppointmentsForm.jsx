import React, { useState, useEffect, useRef } from "react";
import { Search, Plus, CheckCircle2, X, Edit2, Save, AlertCircle, Clock, CalendarDays } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { PublicStyleCalendar } from "@/components/ui/calendar-public-style";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { es } from "date-fns/locale";
import useAppointments from "../hooks/useAppointment.js";
import useMedicalData from "../hooks/useMedicalData";
import useAppointmentTypes from "../hooks/useAppointmentTypes";
import { showSuccess, showError } from "@/lib/alerts";
import ProcedureModal from "./ProcedureModal.jsx";
import { useAuth } from "@/context/AuthContext";
import apiClient from "@/lib/apiClient";

// Formulario único para crear, ver y editar una cita. El modo depende de si
// hay "id" en la URL y del estado isEditing.
export default function AppointmentsForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const { hasPermission, userType, user } = useAuth();
  const canCreateAppt = hasPermission("calendar.appointments", "create");
  const canUpdateAppt = hasPermission("calendar.appointments", "update");
  // Al crear, el estado de la recepcionista queda fijo en "scheduled" (el
  // backend lo fuerza igual); esto es solo para no mostrar un selector inútil.
  const lockStatusForCreate = userType === "receptionist" && !id;
  // Al crear una cita, el doctor solo puede asignársela a sí mismo. El
  // backend aplica la misma regla para que no dependa solo de la interfaz.
  const isDoctorCreating = userType === "doctor" && !id;

  const {
    getAppointmentById,
    createAppointment,
    updateAppointment,
    submitting,
  } = useAppointments();

  const {
    patients,
    doctors,
    procedures,
    loadingData,
    addLocalProcedure,
    getAvailableSlots,
    fetchMedicalData
  } = useMedicalData();

  // Catálogo global de tipos de cita (nombre + color, solo lectura aquí — lo administra el rol
  // admin desde Horarios). Es un campo aparte de "Tipo de Procedimiento": no afecta precio ni
  // duración, solo cómo se ve la cita en la leyenda del calendario.
  const { getAppointmentTypes } = useAppointmentTypes();
  const [appointmentTypes, setAppointmentTypes] = useState([]);
  useEffect(() => {
    getAppointmentTypes().then(setAppointmentTypes).catch(() => setAppointmentTypes([]));
  }, []);

  // Con id se ve/edita una cita existente; sin id, se crea una nueva. El modo
  // edición inicial respeta los permisos, aunque llegue editMode: true por state.
  const isViewOrEditMode = !!id;
  const [isEditing, setIsEditing] = useState(
    (!isViewOrEditMode && canCreateAppt) || (!!location.state?.editMode && canUpdateAppt) || false
  );
  const [loading, setLoading] = useState(false);

  // Estado de interfaz aparte del formulario: mes mostrado en el calendario,
  // horarios disponibles/mensaje, y visibilidad del modal de procedimiento.
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [availableTimeSlots, setAvailableTimeSlots] = useState([]);
  const [scheduleMessage, setScheduleMessage] = useState("");
  const [isProcedureModalOpen, setIsProcedureModalOpen] = useState(false);
  // Enfermeras con horario disponible para el doctor/fecha/hora ya elegidos — no el catálogo
  // completo. Se recalcula cada vez que cambia el horario elegido (ver efecto más abajo).
  const [availableNurses, setAvailableNurses] = useState([]);
  const [loadingNurses, setLoadingNurses] = useState(false);
  const originalSlotRef = useRef(null);

  // Se usa Controller en todos los campos porque los Input/Textarea/Select
  // de la UI no reenvían el ref; Controller los maneja de forma controlada.
  const { control, handleSubmit, watch, setValue, getValues, reset } = useForm({
    defaultValues: {
      patient_id: "",
      doctor_id: "",
      nurse_id: "",
      procedure: "general",
      appointment_type: "",
      date: new Date(),
      selectedTime: "",
      status: "",
      notes: "",
      cancellationReason: "",
      total: "",
    },
  });

  // Valores actuales de cada campo, para usarlos en la lógica del componente.
  const patientId = watch("patient_id");
  const doctorId = watch("doctor_id");
  const nurseId = watch("nurse_id");
  const procedure = watch("procedure");
  const date = watch("date");
  const selectedTime = watch("selectedTime");
  const status = watch("status");

  // Carga los datos de la cita cuando hay id (ver/editar). En creación no
  // corre y el formulario queda con los defaultValues.
  useEffect(() => {
    if (id) {
      const loadAppointmentDetails = async () => {
        try {
          setLoading(true);
          const appointment = await getAppointmentById(id);

          if (appointment) {
            // "general" identifica una Consulta Médica General frente a un
            // procedimiento real con su propio id.
            let procedureValue = "general";
            if (appointment.type !== "Consulta Médica General" && appointment.procedure_id) {
              const procId = typeof appointment.procedure_id === "object"
                ? appointment.procedure_id._id
                : appointment.procedure_id;
              procedureValue = procId || "general";
            }

            const loadedDate = appointment.date ? new Date(appointment.date) : new Date();

            // Llena el formulario completo con los datos del backend.
            reset({
              patient_id: appointment.patient_id?._id || appointment.patient_id || "",
              doctor_id: appointment.doctor_id?._id || appointment.doctor_id || "",
              nurse_id: appointment.nurse_id?._id || appointment.nurse_id || "",
              procedure: procedureValue,
              appointment_type: appointment.appointment_type || "",
              date: loadedDate,
              selectedTime: appointment.start_time || "",
              status: appointment.status || "pending",
              notes: appointment.description || "",
              cancellationReason: appointment.cancellation_reason || "",
              total: appointment.total || 15,
            });
            // calendarMonth no es parte del form; se actualiza aparte.
            setCalendarMonth(loadedDate);

            // En modo lectura no se consultan horarios disponibles, así que
            // se precarga solo el horario real de la cita.
            if (appointment.start_time) {
              const slot = { start_time: appointment.start_time, end_time: appointment.end_time || "" };
              setAvailableTimeSlots([slot]);
              originalSlotRef.current = {
                date: loadedDate.toISOString().split("T")[0],
                doctor_id: appointment.doctor_id?._id || appointment.doctor_id || "",
                ...slot,
              };
            }
          }
        } catch (err) {
          console.error("Error loading appointment:", err);
          showError("No se pudo recuperar la información de la cita.");
        } finally {
          setLoading(false);
        }
      };

      loadAppointmentDetails();
    }
  }, [id, getAppointmentById, reset]);

  // Traducción de los status al texto mostrado al usuario.
  const statusLabels = {
    pending: "Pendiente",
    scheduled: "Programada",
    completed: "Completada",
    cancelled: "Cancelada",
    no_show: "No se presentó",
    expired: "Vencida",
  };

  // Fuerza el status a "scheduled" cuando la recepcionista está creando una
  // cita nueva (el backend lo va a forzar de todos modos al guardar).
  useEffect(() => {
    if (lockStatusForCreate) {
      setValue("status", "scheduled");
    }
  }, [lockStatusForCreate, setValue]);

  useEffect(() => {
    if (isDoctorCreating && user?.id) {
      setValue("doctor_id", String(user.id));
    }
  }, [isDoctorCreating, setValue, user?.id]);

  // Sin doctor elegido no se habilita fecha ni horario.
  const canSelectSchedule = !!doctorId;

  // Objetos completos a partir de los ids guardados en el formulario.
  const selectedPatient = patients.find(p => p._id === patientId);
  const selectedDoctor = doctors.find(p => p._id === doctorId);
  const selectedNurse = availableNurses.find(p => p._id === nurseId);

  const selectedProcedure = procedures.find(p => {
    const targetId = typeof procedure === "object" ? procedure?._id : procedure;
    return p._id?.toString() === targetId?.toString();
  });

  // Duración fija de 30 min para consulta general; si no, la del procedimiento.
  const duration = procedure === "general"
    ? 30
    : Number(selectedProcedure?.estimated_duration) || 30;

  // Slot completo (start_time + end_time) del horario elegido.
  const selectedSlot = availableTimeSlots.find(slot => slot.start_time === selectedTime);

  // Indica si el procedimiento elegido exige asignar una enfermera.
  const isNurseRequired = procedure !== "general" && selectedProcedure && (selectedProcedure.requires_nurse);

  // Limpia la enfermera seleccionada si el procedimiento deja de requerirla.
  useEffect(() => {
    if (!isNurseRequired && nurseId !== "") {
      setValue("nurse_id", "");
    }
  }, [procedure, isNurseRequired, nurseId, setValue]);

  // Pide el catálogo de enfermeras DISPONIBLES para el doctor/fecha/horario ya elegidos —
  // mismo endpoint y mismo criterio (horario configurado, sin descansos, sin otra cita) que usa
  // AppointmentsGrid.jsx al aceptar/asignar una cita. Depende de start_time/end_time (no del
  // objeto selectedSlot completo) para no re-disparar el efecto en cada render.
  const selectedSlotStart = selectedSlot?.start_time;
  const selectedSlotEnd = selectedSlot?.end_time;
  useEffect(() => {
    if (!isEditing || !isNurseRequired || !doctorId || !selectedSlotStart || !selectedSlotEnd) {
      setAvailableNurses([]);
      return;
    }
    let cancelled = false;
    setLoadingNurses(true);
    apiClient("/appointments/nurses-for-acceptance", {
      params: {
        date: date.toISOString().split("T")[0],
        start_time: selectedSlotStart,
        end_time: selectedSlotEnd,
        appointment_id: id,
      },
    }).then((response) => {
      if (cancelled) return;
      const list = Array.isArray(response) ? response : response.data || [];
      setAvailableNurses(list);
      // Si la enfermera ya elegida (ej. cargada al editar una cita) no está en la lista recién
      // obtenida, se limpia en vez de dejar una asignación inválida. Se lee con getValues (no
      // como dependencia del efecto) para no volver a pedir el catálogo cada vez que cambia.
      const currentNurseId = getValues("nurse_id");
      if (currentNurseId && !list.some(n => n._id === currentNurseId)) {
        setValue("nurse_id", "");
      }
    }).catch(() => {
      if (!cancelled) setAvailableNurses([]);
    }).finally(() => {
      if (!cancelled) setLoadingNurses(false);
    });
    return () => { cancelled = true; };
  }, [isEditing, isNurseRequired, doctorId, date, selectedSlotStart, selectedSlotEnd, id, getValues, setValue]);

  // Se ejecuta solo si pasan todas las reglas de validación de los
  // Controller definidos en el JSX.
  const onSubmit = async (data) => {
    if (!isEditing || submitting) return;

    // Verificación adicional: se necesita el slot completo para el payload.
    if (!selectedSlot) {
      showError("Debe seleccionar un horario válido.");
      return;
    }

    const appointmentData = {
      doctor_id: data.doctor_id,
      patient_id: data.patient_id,
      nurse_id: data.nurse_id || null,
      procedure_id: data.procedure === "general" ? null : data.procedure,
      type: data.procedure === "general" ? "Consulta Médica General" : "Procedimiento",
      // Aparte de "type" (que sigue definiendo precio/duración vía Procedimientos): solo
      // categoriza/colorea la cita en la leyenda del calendario.
      appointment_type: data.appointment_type || undefined,
      start_time: selectedSlot.start_time,
      end_time: selectedSlot.end_time,
      duration_minutes: duration,
      date: data.date ? data.date.toISOString() : new Date().toISOString(),
      description: data.notes.trim(),
      status: data.status,
      total: Number(data.total),
      cancellation_reason: data.status === "cancelled" ? data.cancellationReason.trim() : "",
    };

    try {
      if (id) {
        const success = await updateAppointment(id, appointmentData);
        if (success) {
          setIsEditing(false);
          showSuccess("Cita modificada con éxito");
          navigate("/calendar/appointments");
        }
      } else {
        const success = await createAppointment(appointmentData);
        if (success) {
          // No se espera el toast antes de navegar, para no retrasar el
          // regreso al listado.
          showSuccess("Cita guardada exitosamente");
          navigate("/calendar/appointments");
        }
      }
    } catch (err) {
      console.error("Detailed error saving appointment:", err);
      showError(`No se pudo guardar la cita: ${err.message}`);
    }
  };

  // Título del encabezado según el modo actual.
  const getHeaderTitle = () => {
    if (!id) return "Creación de Cita";
    return isEditing ? "Editar Cita" : "Detalles de la Cita";
  };

  // Si el horario elegido deja de estar disponible, se reemplaza por el
  // primero de la lista. Solo aplica en modo edición.
  useEffect(() => {
    if (!isEditing) return;
    if (selectedTime && !availableTimeSlots.map(s => s.start_time).includes(selectedTime)) {
      setValue("selectedTime", availableTimeSlots[0]?.start_time || "");
    }
  }, [availableTimeSlots, selectedTime, isEditing, setValue]);

  // Autocompleta el costo según el procedimiento elegido; se puede
  // sobrescribir manualmente después.
  useEffect(() => {
    if (procedure === "general") {
      setValue("total", 15);
    } else if (selectedProcedure) {
      setValue("total", selectedProcedure.price);
    }
  }, [procedure, selectedProcedure, setValue]);

  // Vuelve a pedir los horarios disponibles cuando cambia doctor, fecha o
  // duración, mientras se está editando.
  useEffect(() => {
    if (!isEditing) return;

    // En creación el formulario arranca sin doctor: sin esto se construiría
    // una URL como /schedule//slots o se mostrarían horarios de otro médico.
    if (!doctorId) {
      setAvailableTimeSlots([]);
      setScheduleMessage("");
      setValue("selectedTime", "");
      return;
    }

    const loadSlots = async () => {
      const formattedDate = date.toISOString().split("T")[0];
      let response = await getAvailableSlots(doctorId, formattedDate, duration);

      const today = new Date();
      const isToday = date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear();

      if (isToday) {
        const currentHourString = `${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`;
        response = response.filter(slot => slot.start_time > currentHourString);
      }

      // En la misma fecha/doctor original, se agrega su horario aunque el
      // backend no lo reporte "disponible" por estar ocupado por esta cita.
      const original = originalSlotRef.current;
      if (original && original.date === formattedDate && original.doctor_id === doctorId) {
        const yaIncluido = response.some(s => s.start_time === original.start_time);
        if (!yaIncluido) {
          response = [{ start_time: original.start_time, end_time: original.end_time }, ...response];
        }
      }

      setAvailableTimeSlots(response);
      setScheduleMessage(response.length === 0 ? "No hay horarios disponibles para el resto del día." : "");

      if (response.length > 0) {
        if (!response.map(s => s.start_time).includes(selectedTime)) {
          setValue("selectedTime", response[0].start_time);
        }
      } else {
        setValue("selectedTime", "");
      }
    };

    loadSlots();
  }, [doctorId, date, duration, getAvailableSlots, isEditing]);

  // Límite de fechas seleccionables: desde hoy hasta el domingo de la
  // semana actual. Solo restringe creación/edición, no la visualización.
  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);

  const currentDayOfWeek = todayMidnight.getDay();
  const daysUntilSunday = currentDayOfWeek === 0 ? 0 : 7 - currentDayOfWeek;

  const endOfCurrentWeek = new Date(todayMidnight);
  endOfCurrentWeek.setDate(todayMidnight.getDate() + daysUntilSunday);
  endOfCurrentWeek.setHours(23, 59, 59, 999);

  // Se llama al crear un procedimiento desde ProcedureModal: refresca el
  // catálogo completo para tener el procedimiento con su id real.
  const handleProcedureCreated = async (savedSuccess) => {
    if (!savedSuccess) return;

    try {
      await fetchMedicalData();

      showSuccess("Procedimiento creado. Ya puedes seleccionarlo en la lista.");
    } catch (error) {
      console.error("Error al actualizar la lista de procedimientos:", error);
      showError("El procedimiento se guardó pero hubo un problema al actualizar la lista.");
    }
  };

  return (
    <div className="w-full p-8 bg-[#f8fafc] min-h-screen">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{getHeaderTitle()}</h1>
          {id && (
            <p className="text-sm text-slate-500 mt-1">
              {isEditing ? "Modificando registros de la cita" : "Modo lectura"}
            </p>
          )}
        </div>
        <div className="flex items-center gap-4">
          {id && !isEditing && canUpdateAppt && (
            <Button
              type="button"
              onClick={() => setIsEditing(true)}
              disabled={submitting}
              className="bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl flex items-center gap-2 px-4 h-10 shadow-sm"
            >
              <Edit2 className="h-4 w-4" />
              Editar Cita
            </Button>
          )}
          <button
            type="button"
            onClick={() => navigate("/calendar/appointments")}
            disabled={submitting}
            className="p-2 rounded-full hover:bg-slate-200/60 transition-colors text-slate-500 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* fieldset con display:contents — además del gating existente por !isEditing, esto
            desactiva TODO durante el envío (submitting), sin alterar el layout de grid */}
        <fieldset disabled={submitting} className="contents">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Paciente: obligatorio. */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-400 tracking-wider uppercase">Paciente</Label>
              <Controller
                name="patient_id"
                control={control}
                rules={{ required: "Debe seleccionar un paciente." }}
                render={({ field, fieldState }) => (
                  <>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={!isEditing}
                    >
                      <SelectTrigger className="w-full border-slate-200 focus:ring-[#0b66d6] h-11 rounded-xl">
                        <SelectValue>{selectedPatient ? `${selectedPatient.name} ${selectedPatient.last_name}` : "Seleccione un paciente"}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {patients.map((patient) => (
                          <SelectItem key={patient._id} value={patient._id.toString()}>{patient.name} {patient.last_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fieldState.error && (
                      <p className="text-xs text-rose-500 mt-1">{fieldState.error.message}</p>
                    )}
                  </>
                )}
              />
            </div>

            {/* Tipo de procedimiento: siempre tiene valor por defecto ("general"). */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-400 tracking-wider uppercase">Tipo de Procedimiento</Label>
              <div className="flex gap-2">
                <Controller
                name="procedure"
                control={control}
                render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={!isEditing}
                    >
                      <SelectTrigger className="w-full border-slate-200 focus:ring-[#0b66d6] h-11 rounded-xl">
                        <SelectValue>{procedure === "general" ? "Consulta Médica General" : selectedProcedure?.name || "Seleccione un procedimiento"}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">Consulta Médica General</SelectItem>
                        {procedures.map((proc) => {
                          const procId = proc?._id?.toString() || proc?.id?.toString() || Math.random().toString();
                          return (
                            <SelectItem key={procId} value={procId}>
                              {proc?.name || "Procedimiento sin nombre"}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  )}
                />
                {/* Abre ProcedureModal para crear un procedimiento sin salir del formulario. */}
                <Button
                  type="button"
                  variant="outline"
                  disabled={!isEditing}
                  onClick={() => setIsProcedureModalOpen(true)}
                  className="h-11 w-11 p-0 border-slate-200 rounded-xl text-slate-500 hover:text-[#0b66d6] hover:border-[#0b66d6]"
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </div>
              <p className="text-xs text-slate-500">
                Duración estimada: <span className="font-semibold">{procedure === "general" ? "30 minutos" : `${selectedProcedure?.estimated_duration ?? 30} minutos`}</span>
              </p>
            </div>

            {/* Tipo de cita: solo categoriza/colorea la cita en el calendario — no afecta
                precio ni duración (eso lo define "Tipo de Procedimiento", arriba). Catálogo
                administrado por el rol admin desde Horarios. Opcional: si no hay tipos creados
                todavía, o no se elige ninguno, la cita simplemente no tiene color asignado. */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-400 tracking-wider uppercase">Tipo de Cita</Label>
              <Controller
                name="appointment_type"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value || "none"}
                    onValueChange={(v) => field.onChange(v === "none" ? "" : v)}
                    disabled={!isEditing}
                  >
                    <SelectTrigger className="w-full border-slate-200 focus:ring-[#0b66d6] h-11 rounded-xl">
                      <SelectValue>
                        {field.value ? (
                          <span className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: appointmentTypes.find((t) => t.name === field.value)?.color || "#94a3b8" }}
                            />
                            {field.value}
                          </span>
                        ) : "Sin especificar"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin especificar</SelectItem>
                      {appointmentTypes.map((t) => (
                        <SelectItem key={t._id} value={t.name}>
                          <span className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: t.color }} />
                            {t.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* Doctor: obligatorio; también habilita fecha y horario. */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-400 tracking-wider uppercase">Doctor Asignado</Label>
              <Controller
                name="doctor_id"
                control={control}
                rules={{ required: "Debe seleccionar un doctor." }}
                render={({ field, fieldState }) => (
                  <>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={!isEditing || isDoctorCreating}
                    >
                      <SelectTrigger className="w-full border-slate-200 focus:ring-[#0b66d6] h-11 rounded-xl">
                        <SelectValue>{selectedDoctor ? `${selectedDoctor.name} ${selectedDoctor.last_name}` : "Seleccione un doctor"}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {doctors.map((doctor) => (
                          <SelectItem key={doctor._id} value={doctor._id.toString()}>{doctor.name} {doctor.last_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fieldState.error && (
                      <p className="text-xs text-rose-500 mt-1">{fieldState.error.message}</p>
                    )}
                  </>
                )}
              />
            </div>

            {/* Enfermera: obligatoria solo si el procedimiento la requiere. */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-400 tracking-wider uppercase">
                Enfermera Asignada {isNurseRequired && <span className="text-rose-500 font-bold">*</span>}
              </Label>
              <Controller
                name="nurse_id"
                control={control}
                rules={{
                  validate: (value) => {
                    if (isNurseRequired && !value) {
                      return `El procedimiento "${selectedProcedure?.name}" requiere obligatoriamente asignar una enfermera.`;
                    }
                    return true;
                  },
                }}
                render={({ field, fieldState }) => (
                  <>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={!isEditing || !isNurseRequired || !selectedSlotStart || loadingNurses}
                    >
                      <SelectTrigger className={`w-full h-11 rounded-xl border transition-all ${!isNurseRequired
                        ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                        : isNurseRequired && !field.value
                          ? "border-amber-300 bg-amber-50/10 focus:ring-amber-500"
                          : "border-slate-200 focus:ring-[#0b66d6]"
                        }`}>
                        <SelectValue>
                          {!isNurseRequired
                            ? "No requerida para este servicio"
                            : !selectedSlotStart
                              ? "Elija primero doctor, fecha y horario"
                              : loadingNurses
                                ? "Buscando enfermeras disponibles..."
                                : selectedNurse
                                  ? `${selectedNurse.name} ${selectedNurse.last_name}`
                                  : availableNurses.length === 0
                                    ? "Sin enfermeras disponibles en ese horario"
                                    : "Seleccione una enfermera"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {availableNurses.map((nurse) => (
                          <SelectItem key={nurse._id} value={nurse._id.toString()}>{nurse.name} {nurse.last_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fieldState.error && (
                      <p className="text-xs text-amber-600 font-medium flex items-center gap-1 animate-in fade-in duration-200">
                        <AlertCircle className="h-3 w-3" /> {fieldState.error.message}
                      </p>
                    )}
                  </>
                )}
              />
            </div>
          </div>

          {/* Calendario y horarios */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm grid grid-cols-1 xl:grid-cols-5 gap-6">
            <div className={`xl:col-span-3 flex flex-col xl:border-r border-slate-100 xl:pr-6 ${!isEditing ? "cursor-not-allowed" : ""}`}>
              <div className="flex items-center gap-2 mb-3">
                <CalendarDays className="h-4 w-4 text-[#0b66d6]" />
                <span className="text-sm font-semibold text-slate-700">Fecha de atención</span>
              </div>
              {!canSelectSchedule && (
                <p className="text-xs text-amber-600 font-medium mb-3">
                  Seleccione un doctor para habilitar la fecha y el horario.
                </p>
              )}
              <Controller
                name="date"
                control={control}
                render={({ field }) => (
                  <PublicStyleCalendar
                    mode="single"
                    locale={es}
                    selected={field.value}
                    // Controla qué mes se muestra, aparte del día seleccionado.
                    month={calendarMonth}
                    onMonthChange={setCalendarMonth}
                    // onSelect siempre debe ser función, incluso en modo lectura,
                    // para que el calendario trate "selected" como controlado.
                    onSelect={(day) => { if (isEditing && canSelectSchedule && !submitting) field.onChange(day); }}
                    disabled={(date) => date < todayMidnight || date > endOfCurrentWeek}
                    className={`w-full flex justify-center ${!isEditing || !canSelectSchedule ? "pointer-events-none opacity-50" : ""}`}
                  />
                )}
              />
            </div>

            <div className="xl:col-span-2 space-y-3 flex flex-col">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-[#0b66d6]" />
                <span className="text-sm font-semibold text-slate-700">Horarios disponibles</span>
              </div>
              {/* Lista de horarios disponibles; valida que el elegido siga
                  existiendo en la lista actual. */}
              <Controller
                name="selectedTime"
                control={control}
                rules={{
                  validate: (value) => {
                    if (!isEditing) return true;
                    const slot = availableTimeSlots.find(s => s.start_time === value);
                    return slot ? true : "Debe seleccionar un horario válido.";
                  },
                }}
                render={({ field, fieldState }) => (
                  <>
                    <div className="overflow-y-auto max-h-[300px] space-y-2 pr-1 custom-scrollbar flex-1">
                      {availableTimeSlots.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-center px-4">
                          <p className="text-sm text-slate-500">
                            {scheduleMessage || "No hay horarios disponibles para esta fecha."}
                          </p>
                        </div>
                      ) : (
                        availableTimeSlots.map((slot) => {
                          const isSelected = field.value === slot.start_time;
                          return (
                            <button
                              key={slot.start_time}
                              type="button"
                              disabled={!isEditing || !canSelectSchedule}
                              onClick={() => field.onChange(slot.start_time)}
                              className={`w-full text-center py-2.5 px-4 rounded-full text-sm font-semibold transition-all duration-150 border ${isSelected
                                ? "bg-[#0b66d6] text-white border-[#0b66d6] shadow-md shadow-blue-100"
                                : "bg-white text-slate-700 border-blue-200 hover:bg-blue-50"
                                } disabled:opacity-80 disabled:cursor-not-allowed`}
                            >
                              {slot.start_time} - {slot.end_time}
                            </button>
                          )
                        })
                      )}
                    </div>
                    {fieldState.error && (
                      <p className="text-xs text-rose-500 mt-1">{fieldState.error.message}</p>
                    )}
                  </>
                )}
              />
            </div>
          </div>
        </div>

        {/* Columna derecha */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6 min-h-[520px] flex flex-col justify-between">
          <div className="space-y-5">
            {/* Estado: obligatorio. */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-400 tracking-wider uppercase">Estado</Label>
              <Controller
                name="status"
                control={control}
                rules={{ required: "Debe seleccionar un estado para la cita." }}
                render={({ field, fieldState }) => (
                  <>
                    <Select disabled={!isEditing || lockStatusForCreate} value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full border-slate-200 focus:ring-[#0b66d6] h-10 rounded-xl text-slate-700">
                        <SelectValue>
                          {lockStatusForCreate ? "Programada (automático)" : (statusLabels[field.value] || "Seleccione un estado")}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>Pendiente</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="scheduled">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-blue-500" />
                            <span>Programada</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="completed">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            <span>Completada</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="cancelled">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-rose-500" />
                            <span>Cancelada</span>
                          </div>
                        </SelectItem>
                        {/* Estado asignado automáticamente por el backend a
                            una cita "pending" ya vencida. También seleccionable a mano. */}
                        <SelectItem value="no_show">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-slate-400" />
                            <span>No se presentó</span>
                          </div>
                        </SelectItem>
                        {/* Estado asignado automáticamente cuando ningún
                            doctor acepta una "pending" a tiempo. */}
                        <SelectItem value="expired">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-orange-500" />
                            <span>Vencida</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {fieldState.error && (
                      <p className="text-xs text-rose-500 mt-1">{fieldState.error.message}</p>
                    )}
                  </>
                )}
              />
            </div>

            {/* Costo total: obligatorio y mayor a 0. */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-400 tracking-wider uppercase">Costo Total ($)</Label>
              <Controller
                name="total"
                control={control}
                rules={{
                  validate: (value) => {
                    if (value === "" || value === null || value === undefined) return "Debe ingresar un costo.";
                    const num = Number(value);
                    if (Number.isNaN(num) || num <= 0) return "Debe ingresar un costo válido.";
                    return true;
                  },
                }}
                render={({ field, fieldState }) => (
                  <>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      disabled={!isEditing}
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value)}
                      onKeyDown={(e) => { if (["-", "e", "E", "+"].includes(e.key)) e.preventDefault(); }}
                      placeholder="Ingrese el costo"
                      className="border-slate-200 focus-visible:ring-[#0b66d6] rounded-xl h-10"
                    />
                    {fieldState.error && (
                      <p className="text-xs text-rose-500 mt-1">{fieldState.error.message}</p>
                    )}
                  </>
                )}
              />
            </div>

            {/* Descripción/notas: opcional; si se llena, debe medir entre 3 y 500 caracteres. */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-400 tracking-wider uppercase">Descripción / Notas</Label>
              <Controller
                name="notes"
                control={control}
                rules={{
                  validate: (value) => {
                    const trimmed = (value || "").trim();
                    if (trimmed && (trimmed.length < 3 || trimmed.length > 500)) {
                      return "La descripción debe tener entre 3 y 500 caracteres.";
                    }
                    return true;
                  },
                }}
                render={({ field, fieldState }) => (
                  <>
                    <Textarea
                      disabled={!isEditing}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Ingrese detalles de la cita..."
                      className="min-h-[150px] border-slate-200 focus-visible:ring-[#0b66d6] rounded-xl text-slate-600 resize-none p-4"
                    />
                    {fieldState.error && (
                      <p className="text-xs text-rose-500 mt-1">{fieldState.error.message}</p>
                    )}
                  </>
                )}
              />
            </div>

            {/* Motivo de cancelación: visible y obligatorio solo si el estado es "cancelled". */}
            {status === "cancelled" && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                <Label className="text-xs font-bold text-slate-400 tracking-wider uppercase flex items-center gap-1">Motivo de Cancelación</Label>
                <Controller
                  name="cancellationReason"
                  control={control}
                  rules={{
                    validate: (value) => {
                      if (status === "cancelled" && !(value || "").trim()) {
                        return "Debe indicar el motivo de la cancelación.";
                      }
                      return true;
                    },
                  }}
                  render={({ field, fieldState }) => (
                    <>
                      <Textarea
                        disabled={!isEditing}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Escriba aquí la razón del por qué se canceló la consulta..."
                        className="min-h-[100px] border-rose-200 focus-visible:ring-rose-500 bg-rose-50/20 text-slate-700 rounded-xl resize-none p-3 placeholder:text-slate-400"
                      />
                      {fieldState.error && (
                        <p className="text-xs text-rose-500 mt-1">{fieldState.error.message}</p>
                      )}
                    </>
                  )}
                />
              </div>
            )}
          </div>

          {/* Botón de guardar: solo visible en modo edición. */}
          {isEditing && (
            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#0b66d6] hover:bg-blue-700 text-white font-semibold py-6 rounded-xl transition-all shadow-md shadow-blue-100 text-sm flex items-center justify-center gap-2"
            >
              {submitting ? (
                <><Clock className="h-4 w-4 animate-spin" /> Guardando...</>
              ) : (
                <><Save className="h-4 w-4" /> {id ? "Guardar Cambios" : "Guardar Cita"}</>
              )}
            </Button>
          )}
        </div>
        </fieldset>
      </form>

      {/* Modal de creación rápida de procedimientos. */}
      <ProcedureModal
        isOpen={isProcedureModalOpen}
        onClose={() => setIsProcedureModalOpen(false)}
        onProcedureCreated={handleProcedureCreated}
      />
    </div>
  );
}