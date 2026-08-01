import React, { useState, useEffect } from "react"
import { CheckCircle2, X, Edit2, Save, AlertCircle, Clock, Loader2, User, Stethoscope, CalendarDays, DollarSign } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { es } from "date-fns/locale"
import { useNavigate, useParams, useLocation } from "react-router-dom"
import useAppointments from "../hooks/useAppointments"
import useMedicalData from "../hooks/useMedicalData";
import { showSuccess, showError } from "@/lib/alerts";
import useSchedule from "../hooks/useSchedule";
import { useAuth } from "@/context/AuthContext";


const fmt12 = (t) => {
  if (!t) return t;
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};
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

const SelectField = ({ label, value, onChange, options, placeholder, disabled }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</label>
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 bg-white disabled:bg-slate-50 disabled:text-slate-400 transition-all"
    >
      <option value="">{placeholder}</option>
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  </div>
);


export default function AppointmentsForm() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { id }    = useParams();

  const { user, userType, hasPermission } = useAuth();
  const isDoctor = userType === "doctor";
  const canCreateAppt = hasPermission("calendar.appointments", "create");
  const canUpdateAppt = hasPermission("calendar.appointments", "update");

  const { getAppointmentById, createAppointment, updateAppointment, submitting } = useAppointments();
  const { patients, doctors, nurses } = useMedicalData();
  const { getAvailableSlots, getSchedule } = useSchedule();

  // El modo edición inicial respeta el permiso: sin create no arranca en modo
  // creación habilitado, y sin update no arranca en modo edición habilitado
  // (aunque hayan llegado con editMode: true).
  const isViewOrEditMode = !!id;
  const [isEditing, setIsEditing] = useState(
    (!isViewOrEditMode && canCreateAppt) || (!!location.state?.editMode && canUpdateAppt) || false
  );
  const [loading, setLoading]     = useState(false);


  const [formData, setFormData] = useState({ patient_id: "", doctor_id: "", nurse_id: "" });
  const [procedure, setProcedure]             = useState("Consulta");
  const [date, setDate]                       = useState(() => {
    const param = new URLSearchParams(location.search).get("date");
    if (param && !id) {
      const [yr, mo, dy] = param.split("-").map(Number);
      return new Date(yr, mo - 1, dy);
    }
    return new Date();
  });
  const [status, setStatus]                   = useState("pending");
  const [notes, setNotes]                     = useState("");
  const [cancellationReason, setCancellationReason] = useState("");
  const [total, setTotal]                     = useState("");
  const [duration, setDuration]               = useState(30);
  const [availableSlots, setAvailableSlots]   = useState([]);
  const [slotsLoading, setSlotsLoading]       = useState(false);
  const [selectedSlot, setSelectedSlot]       = useState(null);
  const [scheduleData, setScheduleData]       = useState(null);
  const scheduleId = scheduleData?._id || null;

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
      setFormData({
        patient_id: cita.patient_id?._id || "",
        doctor_id:  cita.doctor_id?._id  || cita.doctor_id || "",
        nurse_id:   cita.nurse_id?._id   || cita.nurse_id  || "",
      });
      setProcedure(cita.type || "Consulta");
      setDate(cita.date ? new Date(cita.date) : new Date());
      setStatus(cita.status || "pending");
      setNotes(cita.description || "");
      setCancellationReason(cita.cancellation_reason || "");
      setTotal(String(cita.total || ""));
      setScheduleData(cita.schedule_id ? { _id: cita.schedule_id } : null);
      if (cita.start_time && cita.end_time) {
        setSelectedSlot({ start_time: cita.start_time, end_time: cita.end_time });
      }
    }).catch(() => showError("No se pudo recuperar la información de la cita."))
      .finally(() => setLoading(false));
  }, [id]);

 
  useEffect(() => {
    if (!formData.doctor_id) { setScheduleData(null); return; }
    getSchedule(formData.doctor_id)
      .then(s => setScheduleData(s))
      .catch(() => setScheduleData(null));
  }, [formData.doctor_id]);

  
  useEffect(() => {
    if (!formData.doctor_id || !date) { setAvailableSlots([]); setSelectedSlot(null); return; }
    setSlotsLoading(true);
    setSelectedSlot(null);
    // Usar fecha LOCAL para que no cambie de día en zonas UTC+
    const dateStr = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
    getAvailableSlots(formData.doctor_id, dateStr, duration)
      .then(res => setAvailableSlots(res.slots || []))
      .catch(() => setAvailableSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [formData.doctor_id, date, duration]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (!formData.patient_id || !formData.doctor_id) {
      showError("Debe seleccionar un paciente y un doctor."); return;
    }
    if (!selectedSlot) {
      showError("Debe seleccionar un horario."); return;
    }
    if (!total || Number(total) <= 0) {
      showError("Debe ingresar un costo válido."); return;
    }
    if (!scheduleId) {
      showError("El doctor seleccionado no tiene horario configurado."); return;
    }

    const durationMins = timeToMins(selectedSlot.end_time) - timeToMins(selectedSlot.start_time);
    const appointmentData = {
      doctor_id:         formData.doctor_id,
      patient_id:        formData.patient_id,
      nurse_id:          formData.nurse_id || undefined,
      procedure_id:      null,
      schedule_id:       scheduleId,
      type:              procedure,
      date:              date.toISOString(),
      start_time:        selectedSlot.start_time,
      end_time:          selectedSlot.end_time,
      duration_minutes:  durationMins,
      description:       notes.trim(),
      status,
      total:             Number(total),
      cancellation_reason: status === "cancelled" ? cancellationReason.trim() : "",
    };

    try {
      if (id) {
        const success = await updateAppointment(id, appointmentData);
        if (success) { setIsEditing(false); showSuccess("Cita modificada con éxito"); }
      } else {
        const success = await createAppointment(appointmentData);
        if (success) { navigate("/calendar/appointments"); showSuccess("Cita guardada exitosamente"); }
      }
    } catch (err) {
      showError(`No se pudo guardar la cita: ${err.message}`);
    }
  };


  const selectedPatient = patients.find(p => p._id === formData.patient_id);
  const selectedDoctor  = doctors.find(d => d._id === formData.doctor_id);
  const selectedNurse   = nurses.find(n => n._id === formData.nurse_id);

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

    // Excepciones: días no laborables y vacaciones (no aplica special_hours porque aún hay atención)
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

  if (loading) return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center bg-slate-50">
      <Loader2 className="h-8 w-8 text-blue-600 animate-spin mb-3" />
      <p className="text-sm text-slate-500">Cargando cita...</p>
    </div>
  );

  return (
    <div className="w-full bg-slate-50 min-h-screen">

      <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div>
          <h1 className="text-lg font-bold text-slate-900">
            {!id ? "Nueva cita" : isEditing ? "Editar cita" : "Detalle de la cita"}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {!id ? "Completa los datos para agendar una nueva cita médica" : isEditing ? "Modifica los datos de la cita" : "Vista de solo lectura"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {id && !isEditing && canUpdateAppt && (
            <button onClick={() => setIsEditing(true)} disabled={submitting}
              className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
              <Edit2 className="w-3.5 h-3.5" /> Editar
            </button>
          )}
          <button onClick={() => navigate("/calendar/appointments")} disabled={submitting}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-5xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* fieldset con display:contents — además del gating existente por !isEditing, esto
            desactiva TODO durante el envío (submitting), sin alterar el layout de grid */}
        <fieldset disabled={submitting} className="contents">

        <div className="lg:col-span-2 flex flex-col gap-5">


          <SectionCard title="Participantes" icon={User}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SelectField
                label="Paciente"
                value={formData.patient_id}
                onChange={v => setFormData(p => ({ ...p, patient_id: v }))}
                options={patients.map(p => ({ value: p._id, label: `${p.name} ${p.last_name}` }))}
                placeholder="Seleccione un paciente"
                disabled={!isEditing}
              />
              <SelectField
                label="Tipo de cita"
                value={procedure}
                onChange={setProcedure}
                options={[
                  { value: "Consulta", label: "Consulta" },
                  { value: "Control/Seguimiento", label: "Control / Seguimiento" },
                  { value: "Procedimiento", label: "Procedimiento" },
                ]}
                placeholder="Selecciona tipo"
                disabled={!isEditing}
              />
              <SelectField
                label="Doctor asignado"
                value={formData.doctor_id}
                onChange={v => setFormData(p => ({ ...p, doctor_id: v }))}
                options={doctors.map(d => ({ value: d._id, label: `Dr. ${d.name} ${d.last_name}` }))}
                placeholder="Seleccione un doctor"
                disabled={isDoctor || !isEditing}
              />
              <SelectField
                label="Enfermera asignada"
                value={formData.nurse_id}
                onChange={v => setFormData(p => ({ ...p, nurse_id: v }))}
                options={nurses.map(n => ({ value: n._id, label: `${n.name} ${n.last_name}` }))}
                placeholder="Opcional"
                disabled={!isEditing}
              />
            </div>


            {(selectedDoctor || selectedPatient) && (
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
                {selectedPatient && (
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
                    <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 text-xs font-bold flex-shrink-0">
                      {selectedPatient.name?.[0]}
                    </div>
                    <span className="text-xs font-medium text-slate-700">{selectedPatient.name} {selectedPatient.last_name}</span>
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
                  <select value={duration} onChange={e => setDuration(Number(e.target.value))} disabled={!isEditing}
                    className="text-xs border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-300 bg-white disabled:opacity-60">
                    <option value={15}>15 min</option>
                    <option value={30}>30 min</option>
                    <option value={45}>45 min</option>
                    <option value={60}>60 min</option>
                  </select>
                </div>

                {slotsLoading ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-2 text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
                    <span className="text-xs">Cargando horarios...</span>
                  </div>
                ) : !formData.doctor_id ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                      <Stethoscope className="w-6 h-6 text-slate-300" />
                    </div>
                    <p className="text-xs text-slate-400 max-w-[160px]">Selecciona un doctor para ver los horarios</p>
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
            <div className="flex flex-wrap gap-2">
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <button key={key} type="button" disabled={!isEditing}
                  onClick={() => setStatus(key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    status === key ? cfg.color + " ring-2 ring-offset-1 ring-current" : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                  } disabled:opacity-60`}
                >
                  {cfg.label}
                </button>
              ))}
            </div>

            {status === "cancelled" && (
              <div className="mt-3">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Motivo de cancelación</label>
                <Textarea disabled={!isEditing} value={cancellationReason}
                  onChange={e => setCancellationReason(e.target.value)}
                  placeholder="¿Por qué se canceló la cita?"
                  className="min-h-[80px] border-red-200 focus-visible:ring-red-300 bg-red-50/30 rounded-xl resize-none text-sm" />
              </div>
            )}
          </SectionCard>

          <SectionCard title="Costo total" icon={DollarSign}>
            <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-blue-200 focus-within:border-blue-400 transition-all bg-white">
              <span className="text-slate-400 text-sm font-medium">$</span>
              <input type="number" min="0" step="0.01" disabled={!isEditing}
                value={total} onChange={e => setTotal(e.target.value)}
                placeholder="0.00"
                className="flex-1 text-sm text-slate-700 bg-transparent outline-none placeholder:text-slate-300 disabled:text-slate-400" />
            </div>
          </SectionCard>


          <SectionCard title="Notas / Descripción" icon={AlertCircle}>
            <Textarea disabled={!isEditing} value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ingrese detalles adicionales de la cita..."
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
