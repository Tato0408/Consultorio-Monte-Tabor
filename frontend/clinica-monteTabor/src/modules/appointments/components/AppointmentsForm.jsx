import React, { useState, useEffect } from "react"
import { Search, Plus, CheckCircle2, X, Edit2, Save, AlertCircle, Clock } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useNavigate, useParams, useLocation } from "react-router-dom"
import useAppointments from "../hooks/useAppointments"
import useMedicalData from "../hooks/useMedicalData";
import { showSuccess, showError } from "@/lib/alerts";

export default function AppointmentsForm() {
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams()
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
    loadingData
  } = useMedicalData();

  const isViewOrEditMode = !!id
  const [isEditing, setIsEditing] = useState(!isViewOrEditMode || location.state?.editMode || false)
  const [loading, setLoading] = useState(false)

  // Estados del Formulario
  const [formData, setFormData] = useState({
    patient_id: "",
    doctor_id: "",
    nurse_id: "",
  });
  const [procedure, setProcedure] = useState("Consulta Médica General")
  const [date, setDate] = useState(new Date(2026, 4, 25))
  const [selectedTime, setSelectedTime] = useState("")
  const [status, setStatus] = useState("")
  const [notes, setNotes] = useState("")
  const [cancellationReason, setCancellationReason] = useState("")
  const [total, setTotal] = useState();

  // Carga Real de datos desde el Service de la API
  useEffect(() => {
    if (id) {
      const cargarDetallesCita = async () => {
        try {
          setLoading(true)
          const cita = await getAppointmentById(id)

          if (cita) {
            // Concatenamos nombre y apellido que resolvimos con el .populate()
            const nombreCompleto = cita.patient_id
              ? `${cita.patient_id.name || ""} ${cita.patient_id.last_name || ""}`.trim()
              : ""

            setFormData({
              patient_id: cita.patient_id?._id || "",
              doctor_id: cita.doctor_id?._id || cita.doctor_id || "",
              nurse_id: cita.nurse_id?._id || cita.nurse_id || "",
            });
            setProcedure(cita.procedure_id || "Consulta Médica General")
            setDate(cita.date ? new Date(cita.date) : new Date(2026, 4, 25))
            setSelectedTime(
              cita.start_time && cita.end_time
                ? `${cita.start_time} - ${cita.end_time}`
                : ""
            );
            setStatus(cita.status || "pending")
            setNotes(cita.description || "")
            setCancellationReason(cita.cancellation_reason || "")
            setTotal(cita.total || 15);
          }
        } catch (err) {
          console.error("Error cargando la cita:", err)
          showError("No se pudo recuperar la información de la cita.");
        } finally {
          setLoading(false)
        }
      }

      cargarDetallesCita()
    }
  }, [id])

  const timeSlots = [
    "9:00 AM - 9:30 AM",
    "9:30 AM - 10:00 AM",
    "10:00 AM - 10:30 AM",
    "10:30 AM - 11:00 AM",
    "11:00 AM - 11:30 AM",
    "11:30 AM - 12:00 M",
    "1:00 PM - 1:30 PM"
  ]

  const statusLabels = {
    pending: "Pendiente",
    scheduled: "Programada",
    completed: "Completada",
    cancelled: "Cancelada",
  };

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.patient_id || !formData.doctor_id) {
      showError("Debe seleccionar un paciente y un doctor.");
      return;
    }

    if (!total || Number(total) <= 0) {
      showError(
        "Datos incompletos",
        "Debe ingresar un costo válido."
      );
      return;
    }

    if (!isEditing) return

    let startTime = "10:00 AM"
    let endTime = "10:30 AM"

    if (selectedTime && selectedTime.includes(" - ")) {
      const parts = selectedTime.split(" - ")
      startTime = parts[0]
      endTime = parts[1]
    }

    const appointmentData = {
      doctor_id: formData.doctor_id,
      patient_id: formData.patient_id,
      nurse_id: formData.nurse_id,
      procedure_id: null,
      type: procedure,
      date: date ? date.toISOString() : new Date().toISOString(),
      start_time: startTime,
      end_time: endTime,
      duration_minutes: 30,
      description: notes.trim(),
      status,
      total: Number(total),
      cancellation_reason:
        status === "cancelled"
          ? cancellationReason.trim()
          : "",
    };

    try {
      if (id) {
        // Modo Edición
        const success = await updateAppointment(id, appointmentData)

        if (success) {
          setIsEditing(false);

          showSuccess("Cita modificada con éxito");
        }
      } else {
        const success = await createAppointment(appointmentData)

        if (success) {
          await showSuccess("Cita guardada exitosamente");

          navigate("/calendar/appointments");
        }
      }
    } catch (err) {
      console.error("Error detallado al guardar la cita:", err)
      showError(`No se pudo guardar la cita: ${err.message}`);
    }
  }

  const getHeaderTitle = () => {
    if (!id) return "Creación de Cita"
    return isEditing ? "Editar Cita" : "Detalles de la Cita"
  }

  const selectedPatient = patients.find(
    p => p._id === formData.patient_id
  );

  const selectedDoctor = doctors.find(
    p => p._id === formData.doctor_id
  );

  const selectedNurse = nurses.find(
    p => p._id === formData.nurse_id
  );

  if (loading) {
    return (
      <div className="w-full min-h-screen flex flex-col items-center justify-center bg-[#f8fafc]">
        <Clock className="h-10 w-10 text-[#0b66d6] animate-spin mb-4" />
        <p className="text-sm font-medium text-slate-500">Cargando expediente de la cita...</p>
      </div>
    )
  }

  return (
    <div className="w-full p-8 bg-[#f8fafc] min-h-screen">
      {/* Cabecera Dinámica */}
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

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* COLUMNA IZQUIERDA Y CENTRAL */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* Paciente */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-400 tracking-wider uppercase">
                Paciente
              </Label>
              <div className="flex gap-2">
                <Select
                  value={formData.patient_id}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      patient_id: value
                    })
                  }
                  disabled={!isEditing}
                >
                  <SelectTrigger className="w-full border-slate-200 focus:ring-[#0b66d6] h-11 rounded-xl disabled:bg-slate-50 disabled:text-slate-500">
                    <SelectValue>
                      {selectedPatient
                        ? `${selectedPatient.name} ${selectedPatient.last_name}`
                        : "Seleccione un paciente"}
                    </SelectValue>
                  </SelectTrigger>

                  <SelectContent>
                    {patients.map((patient) => (
                      <SelectItem
                        key={patient._id}
                        value={patient._id}
                      >
                        {patient.name} {patient.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Tipo de procedimiento */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-400 tracking-wider uppercase">Tipo de Procedimiento</Label>
              <div className="flex gap-2">
                <Select disabled={!isEditing} value={procedure} onValueChange={setProcedure}>
                  <SelectTrigger className="w-full border-slate-200 focus:ring-[#0b66d6] h-11 rounded-xl text-slate-700 font-medium disabled:bg-slate-50 disabled:text-slate-500">
                    <SelectValue placeholder="Consulta Médica General" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Consulta Médica General">Consulta Médica General</SelectItem>
                    <SelectItem value="Procedimiento">Procedimiento</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!isEditing}
                  className="h-11 w-11 p-0 border-slate-200 rounded-xl text-slate-500 hover:text-[#0b66d6] hover:border-[#0b66d6]"
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Doctor */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-400 tracking-wider uppercase">Doctor Asignado</Label>
              <Select
                value={formData.doctor_id}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    doctor_id: value
                  })
                }
                disabled={!isEditing}
              >
                <SelectTrigger className="w-full border-slate-200 focus:ring-[#0b66d6] h-11 rounded-xl">
                  <SelectValue>
                    {selectedDoctor
                      ? `${selectedDoctor.name} ${selectedDoctor.last_name}`
                      : "Seleccione un doctor"}
                  </SelectValue>
                </SelectTrigger>

                <SelectContent>
                  {doctors.map((doctor) => (
                    <SelectItem
                      key={doctor._id}
                      value={doctor._id}
                    >
                      {doctor.name} {doctor.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Enfermera */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-400 tracking-wider uppercase">Enfermera Asignada</Label>
              <Select
                value={formData.nurse_id}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    nurse_id: value
                  })
                }
                disabled={!isEditing}
              >
                <SelectTrigger className="w-full border-slate-200 focus:ring-[#0b66d6] h-11 rounded-xl">
                  <SelectValue>
                    {selectedNurse
                      ? `${selectedNurse.name} ${selectedNurse.last_name}`
                      : "Seleccione un enfermero"}
                  </SelectValue>
                </SelectTrigger>

                <SelectContent>
                  {nurses.map((nurse) => (
                    <SelectItem
                      key={nurse._id}
                      value={nurse._id}
                    >
                      {nurse.name} {nurse.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

          </div>

          {/* Calendario y Horas */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm grid grid-cols-1 md:grid-cols-5 gap-6">
            <div
              className={`md:col-span-3 flex flex-col items-center border-r border-slate-100 pr-2 ${!isEditing ? "cursor-not-allowed" : ""
                }`}
            >
              <Calendar
                mode="single"
                selected={date}
                onSelect={isEditing ? setDate : undefined}
                className={`rounded-md border-0 w-full flex justify-center ${!isEditing ? "pointer-events-none" : ""
                  }`}
                classNames={{
                  day_selected:
                    "bg-[#0b66d6] text-white rounded-full font-bold",
                  day_today:
                    "bg-slate-100 text-slate-900 font-bold rounded-full",
                  day:
                    "h-9 w-9 p-0 font-medium text-sm text-slate-700 hover:bg-slate-100 rounded-full flex items-center justify-center aria-selected:bg-[#0b66d6] aria-selected:text-white",
                }}
              />
            </div>

            <div className="md:col-span-2 space-y-3 flex flex-col">
              <span className="text-xs font-bold text-slate-400 text-right uppercase tracking-wider block mb-1">
                Personalizar Horario
              </span>
              <div className="overflow-y-auto max-h-[300px] space-y-2 pr-1 custom-scrollbar flex-1">
                {timeSlots.map((slot) => {
                  const isSelected = selectedTime === slot;
                  return (
                    <button
                      key={slot}
                      type="button"
                      disabled={!isEditing}
                      onClick={() => setSelectedTime(slot)}
                      className={`w-full text-center py-2.5 px-4 rounded-full text-xs font-medium transition-all duration-150 border ${isSelected
                        ? "bg-[#0b66d6] text-white border-[#0b66d6] shadow-md shadow-blue-100"
                        : "bg-white text-slate-600 border-blue-200 hover:bg-blue-50/50"
                        } disabled:opacity-80 disabled:cursor-not-allowed`}
                    >
                      {slot}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: Estado, Notas, Cancelación y Guardado */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6 min-h-[520px] flex flex-col justify-between">

          <div className="space-y-5">
            {/* Selector de Estado */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-400 tracking-wider uppercase">Estado</Label>
              <Select disabled={!isEditing} value={status} onValueChange={setStatus} >
                <SelectTrigger className="w-full border-slate-200 focus:ring-[#0b66d6] h-10 rounded-xl text-slate-700">
                  <SelectValue>
                    {statusLabels[status] || "Seleccione un estado"}
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
                </SelectContent>
              </Select>
            </div>

            {/* Precio total */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-400 tracking-wider uppercase">
                Costo Total ($)
              </Label>

              <Input
                type="number"
                min="0"
                step="0.01"
                disabled={!isEditing}
                value={total}
                onChange={(e) => setTotal(e.target.value)}
                placeholder="Ingrese el costo"
                className="border-slate-200 focus-visible:ring-[#0b66d6] rounded-xl h-10"
              />
            </div>

            {/* Descripción / Notas */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-400 tracking-wider uppercase">Descripción / Notas</Label>
              <Textarea
                disabled={!isEditing}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ingrese detalles de la cita..."
                className="min-h-[150px] border-slate-200 focus-visible:ring-[#0b66d6] rounded-xl text-slate-600 resize-none p-4 disabled:bg-slate-50"
              />
            </div>

            {/* Motivo de Cancelación */}
            {status === "cancelled" && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                <Label className="text-xs font-bold text-slate-400 tracking-wider uppercase flex items-center gap-1">
                  Motivo de Cancelación
                </Label>
                <Textarea
                  disabled={!isEditing}
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  placeholder="Escriba aquí la razón del por qué se canceló la consulta..."
                  className="min-h-[100px] border-rose-200 focus-visible:ring-rose-500 bg-rose-50/20 text-slate-700 rounded-xl resize-none p-3 placeholder:text-slate-400 disabled:bg-slate-50/80"
                />
              </div>
            )}
          </div>

          {/* Botón Guardar */}
          {isEditing && (
            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#0b66d6] hover:bg-blue-700 text-white font-semibold py-6 rounded-xl transition-all shadow-md shadow-blue-100 text-sm flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Clock className="h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {id ? "Guardar Cambios" : "Guardar Cita"}
                </>
              )}
            </Button>
          )}

        </div>
      </form>
    </div>
  )
}