import React, { useState, useEffect } from "react";
import { Search, Plus, CheckCircle2, X, Edit2, Save, AlertCircle, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
import { showSuccess, showError } from "@/lib/alerts";
import ProcedureModal from "./ProcedureModal.jsx";

// Este mismo componente sirve para las 3 pantallas: crear cita nueva, ver el
// detalle de una cita (solo lectura) y editarla. Cuál de las 3 es depende de
// si hay "id" en la URL y de si isEditing está prendido o no.
export default function AppointmentsForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  const {
    getAppointmentById,
    createAppointment,
    updateAppointment,
    submitting,
  } = useAppointments();

  const {
    patients,
    doctors,
    nurses,
    procedures,
    loadingData,
    addLocalProcedure,
    getAvailableSlots,
    fetchMedicalData
  } = useMedicalData();

  // Si hay id en la URL se ve/edita una cita existente; si no,
  // se esta creando una nueva. Cuando venimos del botón "Editar" de la
  // tarjeta (AppointmentsGrid), nos mandan editMode: true por location.state
  // para abrir el formulario ya habilitado en vez de en modo lectura.
  const isViewOrEditMode = !!id;
  const [isEditing, setIsEditing] = useState(!isViewOrEditMode || location.state?.editMode || false);
  const [loading, setLoading] = useState(false);

  // Estado de UI que NO es parte de los valores del formulario (no se manda
  // al backend), por eso vive aparte del useForm de abajo:
  // - calendarMonth: qué mes muestra el Calendar. Tiene que ir separado de
  //   la fecha seleccionada porque si no, al cargar una cita vieja el
  //   calendario se queda mostrando el mes de hoy
  // - availableTimeSlots / scheduleMessage: la lista de horarios que se
  //   pintan a la derecha del calendario, depende del doctor+fecha elegidos.
  // - isProcedureModalOpen: si el modal de "crear procedimiento rápido"
  //   está abierto o cerrado.
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [availableTimeSlots, setAvailableTimeSlots] = useState([]);
  const [scheduleMessage, setScheduleMessage] = useState("");
  const [isProcedureModalOpen, setIsProcedureModalOpen] = useState(false);

  // Uso react-hook-form con Controller en todos los campos (en vez de
  // register directo) porque los componentes Input/Textarea/Select de la UI
  // no reenvían el ref (no tienen forwardRef). Si usara register(), cosas
  // como reset()/setValue() no actualizarían lo que se ve en pantalla.
  // Controller sí funciona porque pasa value/onChange directo (controlado),
  // igual que se manejaba todo antes con useState.
  const { control, handleSubmit, watch, setValue, reset } = useForm({
    defaultValues: {
      patient_id: "",
      doctor_id: "",
      nurse_id: "",
      procedure: "general",
      date: new Date(),
      selectedTime: "",
      status: "",
      notes: "",
      cancellationReason: "",
      total: "",
    },
  });

  // watch() se suscribe al valor actual de cada campo y hace que el
  // componente se vuelva a renderizar cuando cambian
  const patientId = watch("patient_id");
  const doctorId = watch("doctor_id");
  const nurseId = watch("nurse_id");
  const procedure = watch("procedure");
  const date = watch("date");
  const selectedTime = watch("selectedTime");
  const status = watch("status");

  // Carga real de datos desde el service de la API. Solo corre si hay "id"
  // (o sea, viendo/editando una cita ya existente); si se esta creando una
  // cita nueva no hay nada que cargar y el formulario se queda con los
  // defaultValues de arriba.
  useEffect(() => {
    if (id) {
      const loadAppointmentDetails = async () => {
        try {
          setLoading(true);
          const appointment = await getAppointmentById(id);

          if (appointment) {
            // Si la cita es de una "Consulta Médica General" o no trae
            // procedure_id, la tratamos como "general" (el valor especial
            // que se usa para diferenciarla de un procedimiento real).
            let procedureValue = "general";
            if (appointment.type !== "Consulta Médica General" && appointment.procedure_id) {
              const procId = typeof appointment.procedure_id === "object"
                ? appointment.procedure_id._id
                : appointment.procedure_id;
              procedureValue = procId || "general";
            }

            const loadedDate = appointment.date ? new Date(appointment.date) : new Date();

            // reset() llena todo el formulario de una sola vez con los datos
            // que vinieron del backend
            reset({
              patient_id: appointment.patient_id?._id || appointment.patient_id || "",
              doctor_id: appointment.doctor_id?._id || appointment.doctor_id || "",
              nurse_id: appointment.nurse_id?._id || appointment.nurse_id || "",
              procedure: procedureValue,
              date: loadedDate,
              selectedTime: appointment.start_time || "",
              status: appointment.status || "pending",
              notes: appointment.description || "",
              cancellationReason: appointment.cancellation_reason || "",
              total: appointment.total || 15,
            });
            // calendarMonth no forma parte del form, así que se actualiza
            // aparte para que el calendario abra mostrando el mes correcto.
            setCalendarMonth(loadedDate);

            // En modo lectura NO se consultan horarios disponibles (ver el
            // useEffect de loadSlots más abajo, que solo corre si
            // isEditing es true), así que aquí "sembramos" manualmente el
            // horario real de la cita para poder mostrarlo en la lista de
            // la derecha aunque no se haya pedido el resto de horarios.
            if (appointment.start_time) {
              setAvailableTimeSlots([{ start_time: appointment.start_time, end_time: appointment.end_time || "" }]);
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

  // Traducción de los valores de status (en inglés/snake_case en la BD) al
  // texto que se le muestra al usuario.
  const statusLabels = {
    pending: "Pendiente",
    scheduled: "Programada",
    completed: "Completada",
    cancelled: "Cancelada",
    no_show: "No se presentó",
  };

  // Sin doctor elegido no tiene sentido dejar tocar fecha/horario todavía.
  const canSelectSchedule = !!doctorId;

  // Buscar el objeto completo (nombre, apellido, etc.) a partir del id
  // guardado en el formulario, para poder mostrarlo en el SelectValue.
  const selectedPatient = patients.find(p => p._id === patientId);
  const selectedDoctor = doctors.find(p => p._id === doctorId);
  const selectedNurse = nurses.find(p => p._id === nurseId);

  const selectedProcedure = procedures.find(p => {
    const targetId = typeof procedure === "object" ? procedure?._id : procedure;
    return p._id?.toString() === targetId?.toString();
  });

  // La duración de una "Consulta Médica General" siempre es 30 min fijo;
  // si es un procedimiento real, se usa la duración que trae configurada
  // (o 30 min de respaldo si por algún motivo no viene).
  const duration = procedure === "general"
    ? 30
    : Number(selectedProcedure?.estimated_duration) || 30;

  // El slot completo (con start_time y end_time) que corresponde al horario
  // elegido. Lo necesitamos aparte del string selectedTime porque al
  // guardar la cita hay que mandar también la hora de fin.
  const selectedSlot = availableTimeSlots.find(slot => slot.start_time === selectedTime);

  // Un procedimiento puede venir marcado como que necesita enfermera de
  // apoyo (requires_nurse o need_nurse, según cómo lo haya guardado quien
  // creó el procedimiento). Una "Consulta Médica General" nunca la requiere.
  const isNurseRequired = procedure !== "general" && selectedProcedure && (selectedProcedure.requires_nurse || selectedProcedure.need_nurse);

  // Si el usuario cambia a un procedimiento que YA NO requiere enfermera,
  // limpiamos la enfermera que hubiera quedado seleccionada de antes (para
  // no mandar un nurse_id que ya no aplica).
  useEffect(() => {
    if (!isNurseRequired && nurseId !== "") {
      setValue("nurse_id", "");
    }
  }, [procedure, isNurseRequired, nurseId, setValue]);

  // handleSubmit(onSubmit) solo llama a onSubmit si TODAS las reglas de
  // validación de los Controller (más abajo, en el JSX) pasaron. Por eso acá
  // ya no hace falta repetir los checks de "paciente/doctor obligatorio",
  // "enfermera obligatoria", "costo válido", etc: eso ya lo bloquea
  // react-hook-form antes de que esta función se ejecute.
  const onSubmit = async (data) => {
    if (!isEditing) return;

    // El horario sí lo revisamos aquí además de en su regla de validación,
    // como último respaldo, porque necesitamos el objeto completo del slot
    // (start_time + end_time) para armar el payload, no solo la hora.
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
          // Ojo: aquí NO se hace "await" del toast antes de navegar (a
          // diferencia de como se hacía antes). Si se espera el toast, la
          // navegación queda colgada hasta que el toast se cierre solo (2.5s
          // o hasta que el usuario lo cierre a mano), y en pestañas en
          // segundo plano el navegador puede retrasar ese cierre todavía
          // más. Mostramos el toast y navegamos de inmediato.
          showSuccess("Cita guardada exitosamente");
          navigate("/calendar/appointments");
        }
      }
    } catch (err) {
      console.error("Detailed error saving appointment:", err);
      showError(`No se pudo guardar la cita: ${err.message}`);
    }
  };

  const getHeaderTitle = () => {
    if (!id) return "Creación de Cita";
    return isEditing ? "Editar Cita" : "Detalles de la Cita";
  };

  // Si el horario que estaba elegido ya no aparece en la lista de
  // disponibles (por ejemplo, cambiamos de fecha y ese horario ya no existe
  // para el nuevo día), lo reemplazamos por el primero de la lista nueva.
  // Solo aplica mientras se está editando: en modo lectura no queremos que
  // esto pise el horario real que sembramos al cargar la cita.
  useEffect(() => {
    if (!isEditing) return;
    if (selectedTime && !availableTimeSlots.map(s => s.start_time).includes(selectedTime)) {
      setValue("selectedTime", availableTimeSlots[0]?.start_time || "");
    }
  }, [availableTimeSlots, selectedTime, isEditing, setValue]);

  // El costo se autocompleta según el tipo de procedimiento elegido: $15
  // fijo para consulta general, o el precio configurado del procedimiento.
  // El usuario igual puede sobrescribirlo a mano después si hace falta.
  useEffect(() => {
    if (procedure === "general") {
      setValue("total", 15);
    } else if (selectedProcedure) {
      setValue("total", selectedProcedure.price);
    }
  }, [procedure, selectedProcedure, setValue]);

  // Cada vez que cambia el doctor, la fecha o la duración (y estamos en modo
  // edición), se piden de nuevo los horarios disponibles al backend.
  useEffect(() => {
    if (!isEditing) return;

    const loadSlots = async () => {
      const formattedDate = date.toISOString().split("T")[0];
      let response = await getAvailableSlots(doctorId, formattedDate, duration);

      // Si la fecha elegida es HOY, quitamos de la lista los horarios que
      // ya pasaron (no tiene sentido ofrecer agendar a las 9am si ya son
      // las 2pm).
      const today = new Date();
      const isToday = date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear();

      if (isToday) {
        const currentHourString = `${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`;
        response = response.filter(slot => slot.start_time > currentHourString);
      }

      setAvailableTimeSlots(response);
      setScheduleMessage(response.length === 0 ? "No hay horarios disponibles para el resto del día." : "");

      // Si el horario que estaba elegido sigue existiendo en la nueva
      // lista, lo dejamos; si no, tomamos el primero disponible (o
      // limpiamos si ya no queda ninguno).
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

  // Cálculos de límites de tiempo de la semana actual: las citas solo se
  // pueden agendar desde hoy hasta el domingo de esta misma semana (el
  // Calendar de abajo usa esto en su prop "disabled" para bloquear el resto
  // de días). Esto es solo una restricción de creación/edición: una cita ya
  // guardada de una semana pasada se puede seguir viendo sin problema.
  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);

  const currentDayOfWeek = todayMidnight.getDay();
  const daysUntilSunday = currentDayOfWeek === 0 ? 0 : 7 - currentDayOfWeek;

  const endOfCurrentWeek = new Date(todayMidnight);
  endOfCurrentWeek.setDate(todayMidnight.getDate() + daysUntilSunday);
  endOfCurrentWeek.setHours(23, 59, 59, 999);

  // Se llama cuando ProcedureModal termina de crear un procedimiento nuevo.
  // En vez de solo agregarlo a la lista local, volvemos a pedir todo el
  // catálogo (fetchMedicalData) para tener el procedimiento con su _id real
  // y cualquier otro dato que le haya calculado el backend.
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
          {id && !isEditing && (
            <Button
              type="button"
              onClick={() => setIsEditing(true)}
              className="bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl flex items-center gap-2 px-4 h-10 shadow-sm"
            >
              <Edit2 className="h-4 w-4" />
              Editar Cita
            </Button>
          )}
          <button
            type="button"
            onClick={() => navigate("/calendar/appointments")}
            className="p-2 rounded-full hover:bg-slate-200/60 transition-colors text-slate-500"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Paciente (obligatorio) */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-400 tracking-wider uppercase">Paciente</Label>
              <Controller
                name="patient_id"
                control={control}
                rules={{ required: "Debe seleccionar un paciente." }}
                render={({ field, fieldState }) => (
                  <>
                    <Select value={field.value} onValueChange={field.onChange} disabled={!isEditing}>
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

            {/* Tipo de procedimiento (no es obligatorio validar, siempre
                tiene un valor por defecto: "general") */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-400 tracking-wider uppercase">Tipo de Procedimiento</Label>
              <div className="flex gap-2">
                <Controller
                  name="procedure"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange} disabled={!isEditing}>
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
                {/* Atajo para crear un procedimiento nuevo sin salir de este
                    formulario (abre ProcedureModal, ver más abajo). */}
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

            {/* Doctor (obligatorio, y además habilita fecha/horario) */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-400 tracking-wider uppercase">Doctor Asignado</Label>
              <Controller
                name="doctor_id"
                control={control}
                rules={{ required: "Debe seleccionar un doctor." }}
                render={({ field, fieldState }) => (
                  <>
                    <Select value={field.value} onValueChange={field.onChange} disabled={!isEditing}>
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

            {/* Enfermera: solo obligatoria si el procedimiento elegido la
                requiere (isNurseRequired). El validate de abajo hace
                justamente eso: si no se requiere, cualquier valor (incluso
                vacío) pasa; si se requiere y no hay nurse_id, se bloquea el
                submit con un mensaje que incluye el nombre del procedimiento. */}
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
                      disabled={!isEditing || !isNurseRequired}
                    >
                      <SelectTrigger className={`w-full h-11 rounded-xl border transition-all ${!isNurseRequired
                        ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                        : isNurseRequired && !field.value
                          ? "border-amber-300 bg-amber-50/10 focus:ring-amber-500"
                          : "border-slate-200 focus:ring-[#0b66d6]"
                        }`}>
                        <SelectValue>
                          {!isNurseRequired ? "No requerida para este servicio" : selectedNurse ? `${selectedNurse.name} ${selectedNurse.last_name}` : "Seleccione una enfermera"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {nurses.map((nurse) => (
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

          {/* Calendario y Horas */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm grid grid-cols-1 md:grid-cols-5 gap-6">
            <div className={`md:col-span-3 flex flex-col items-center border-r border-slate-100 pr-2 ${!isEditing ? "cursor-not-allowed" : ""}`}>
              {!canSelectSchedule && (
                <p className="text-xs text-amber-600 font-medium mb-3">
                  Seleccione un doctor para habilitar la fecha y el horario.
                </p>
              )}
              <Controller
                name="date"
                control={control}
                render={({ field }) => (
                  <Calendar
                    mode="single"
                    locale={es}
                    selected={field.value}
                    // month/onMonthChange controlan qué mes se ve, aparte de
                    // "selected" (qué día está marcado). Si no se controla
                    // el mes por fuera, el calendario se queda pegado
                    // mostrando el mes en el que estaba montado la primera
                    // vez, aunque después carguemos una cita de otro mes.
                    month={calendarMonth}
                    onMonthChange={setCalendarMonth}
                    // Importante: onSelect SIEMPRE debe ser una función (no
                    // undefined) aunque el calendario esté en modo lectura.
                    // Si se le pasa undefined, react-hook-form-picker deja de
                    // tratar "selected" como controlado y el calendario se
                    // queda mostrando para siempre el valor que tenía al
                    // montarse, ignorando cualquier fecha que carguemos
                    // después (nos pasó justo este bug con una cita vieja).
                    onSelect={(day) => { if (isEditing && canSelectSchedule) field.onChange(day); }}
                    disabled={(date) => date < todayMidnight || date > endOfCurrentWeek}
                    className={`rounded-md border-0 w-full flex justify-center ${!isEditing || !canSelectSchedule ? "pointer-events-none opacity-50" : ""}`}
                    classNames={{
                      day_selected: "bg-[#0b66d6] text-white rounded-full font-bold",
                      day_today: "bg-slate-100 text-slate-900 font-bold rounded-full",
                      day: "h-9 w-9 p-0 font-medium text-sm text-slate-700 hover:bg-slate-100 rounded-full flex items-center justify-center aria-selected:bg-[#0b66d6]"
                    }}
                  />
                )}
              />
            </div>

            <div className="md:col-span-2 space-y-3 flex flex-col">
              <span className="text-xs font-bold text-slate-400 text-right uppercase tracking-wider block mb-1">
                Personalizar Horario
              </span>
              {/* Lista de horarios disponibles como botones. El validate
                  revisa que el horario elegido siga existiendo dentro de
                  availableTimeSlots (por si cambia la fecha/doctor y ese
                  horario ya no aplica). En modo lectura no se valida nada
                  (siempre pasa) porque ahí no se puede editar de todos modos. */}
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
                              className={`w-full text-center py-2.5 px-4 rounded-full text-xs font-medium transition-all duration-150 border ${isSelected
                                ? "bg-[#0b66d6] text-white border-[#0b66d6] shadow-md shadow-blue-100"
                                : "bg-white text-slate-600 border-blue-200 hover:bg-blue-50/50"
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

        {/* COLUMNA DERECHA */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6 min-h-[520px] flex flex-col justify-between">
          <div className="space-y-5">
            {/* Estado: obligatorio elegir uno (antes esto no se validaba en
                el front y el backend lo rechazaba con un error genérico). */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-400 tracking-wider uppercase">Estado</Label>
              <Controller
                name="status"
                control={control}
                rules={{ required: "Debe seleccionar un estado para la cita." }}
                render={({ field, fieldState }) => (
                  <>
                    <Select disabled={!isEditing} value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full border-slate-200 focus:ring-[#0b66d6] h-10 rounded-xl text-slate-700">
                        <SelectValue>{statusLabels[field.value] || "Seleccione un estado"}</SelectValue>
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
                        {/* no_show es el estado que el backend pone solo
                            (automático) cuando una cita "pending" se queda
                            sin resolver y ya pasó su hora. Lo dejamos
                            seleccionable acá también por si el personal
                            quiere marcarlo a mano. */}
                        <SelectItem value="no_show">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-slate-400" />
                            <span>No se presentó</span>
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

            {/* Costo total: obligatorio y debe ser un número mayor a 0.
                Antes el chequeo era "!total || Number(total) <= 0", que
                dejaba pasar valores raros como "-" porque Number("-") da
                NaN y "NaN <= 0" es false. Por eso ahora se revisa
                Number.isNaN explícitamente. */}
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

            {/* Descripción / Notas: opcional, pero si se escribe algo debe
                tener entre 3 y 500 caracteres (mismo rango que exige el
                backend), para no descubrir el error hasta después de
                intentar guardar. */}
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

            {/* Motivo de cancelación: solo se muestra (y solo es
                obligatorio) cuando el estado elegido es "cancelled". Antes
                se podía cancelar una cita sin explicar por qué. */}
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

          {/* El botón de guardar solo aparece si estamos en modo edición;
              en modo lectura no hay nada que enviar. */}
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
      </form>

      {/* Modal de creación rápida de procedimientos, disponible desde el
          botón "+" de arriba. */}
      <ProcedureModal
        isOpen={isProcedureModalOpen}
        onClose={() => setIsProcedureModalOpen(false)}
        onProcedureCreated={handleProcedureCreated}
      />
    </div>
  );
}
