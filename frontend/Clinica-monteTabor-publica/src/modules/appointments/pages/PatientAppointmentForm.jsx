import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CalendarDays, Clock3, DollarSign, FileText, Stethoscope } from "lucide-react";
import toast from "react-hot-toast";
import apiClient from "@/lib/apiClient";
import { Calendar } from "@/components/ui/calendar";
import PatientPortalHeader from "@/components/PatientPortalHeader";
import { es } from "date-fns/locale";

const toDateInput = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const today = new Date(); today.setHours(0, 0, 0, 0);
const weekEnd = new Date(today); weekEnd.setDate(today.getDate() + (7 - today.getDay()) % 7);
const isOutsideCurrentWeek = (date) => date < today || date > weekEnd;
const money = (value) => new Intl.NumberFormat("es-SV", { style: "currency", currency: "USD" }).format(Number(value || 0));
const generalService = { _id: "general", name: "Consulta Médica General", estimated_duration: 30, price: 15 };

export default function PatientAppointmentForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);
  const [procedures, setProcedures] = useState([]);
  const [form, setForm] = useState({ procedure_id: "general", date: toDateInput(today), start_time: "", description: "" });
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const services = useMemo(() => [generalService, ...procedures], [procedures]);
  const selectedService = services.find((service) => service._id === form.procedure_id) || generalService;

  useEffect(() => {
    const load = async () => {
      try {
        const [proceduresResponse, appointmentsResponse] = await Promise.all([
          apiClient("/appointments/patient/procedures"),
          isEditing ? apiClient("/appointments/patient", { params: { limit: 50 } }) : Promise.resolve(null),
        ]);
        setProcedures(proceduresResponse.data || []);
        if (isEditing) {
          const appointment = appointmentsResponse?.data?.find((item) => item._id === id);
          if (!appointment) throw new Error("No se encontró la cita.");
          setForm({ procedure_id: appointment.procedure_id?._id || "general", date: appointment.date.slice(0, 10), start_time: appointment.start_time, description: appointment.description || "" });
        }
      } catch (error) { toast.error(error.message); navigate("/appointments"); }
      finally { setLoading(false); }
    };
    load();
  }, [id, isEditing, navigate]);

  useEffect(() => {
    if (isEditing || !form.date) return;
    const loadSlots = async () => {
      setSlotsLoading(true);
      try {
        const response = await apiClient("/schedule/patient-available-slots", {
          params: { date: form.date, procedure_id: form.procedure_id },
        });
        setSlots(response.slots || []);
      }
      catch (error) { toast.error(error.message); setSlots([]); }
      finally { setSlotsLoading(false); }
    };
    loadSlots();
  }, [form.date, form.procedure_id, isEditing]);

  const selectService = (procedure_id) => setForm((current) => ({ ...current, procedure_id, start_time: "" }));
  const selectDate = (date) => setForm((current) => ({ ...current, date: toDateInput(date), start_time: "" }));
  const save = async (event) => {
    event.preventDefault();
    if (!isEditing && !form.start_time) return toast.error("Selecciona un horario disponible.");
    setSaving(true);
    try {
      if (isEditing) {
        await apiClient(`/appointments/patient/${id}`, { method: "PUT", body: { procedure_id: form.procedure_id, description: form.description } });
        toast.success("Cita actualizada.");
      } else {
        const slot = slots.find((item) => item.start_time === form.start_time);
        if (!slot) throw new Error("Selecciona un horario disponible.");
        await apiClient("/appointments/patient", { method: "POST", body: { procedure_id: form.procedure_id, date: `${form.date}T00:00:00.000Z`, start_time: slot.start_time, end_time: slot.end_time, description: form.description } });
        toast.success("Solicitud enviada. Un doctor deberá aceptarla.");
      }
      navigate("/appointments");
    } catch (error) { toast.error(error.message); }
    finally { setSaving(false); }
  };

  if (loading) return <><PatientPortalHeader /><main className="min-h-screen bg-slate-50 p-8 text-center text-slate-500">Cargando formulario…</main></>;
  return <><PatientPortalHeader /><main className="min-h-screen bg-slate-50 p-4 sm:p-8"><form onSubmit={save} className="mx-auto max-w-6xl space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-bold text-slate-900">{isEditing ? "Editar cita" : "Solicitar cita"}</h1><p className="mt-1 text-sm text-slate-500">{isEditing ? "Puedes cambiar el servicio y las notas; la fecha y hora se conservan." : "Elige el servicio, fecha y horario que prefieras."}</p></div><button type="button" onClick={() => navigate("/appointments")} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Volver a mis citas</button></div>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4 flex items-center gap-2"><Stethoscope className="h-5 w-5 text-blue-600" /><h2 className="font-bold text-slate-800">Servicio a solicitar</h2></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{services.map((service) => <button type="button" key={service._id} onClick={() => selectService(service._id)} className={`rounded-xl border p-4 text-left transition ${form.procedure_id === service._id ? "border-blue-600 bg-blue-50 ring-1 ring-blue-600" : "border-slate-200 hover:border-blue-300"}`}><p className="font-semibold text-slate-800">{service.name}</p>{service.description && <p className="mt-1 line-clamp-2 text-xs text-slate-500">{service.description}</p>}<p className="mt-3 text-sm font-bold text-blue-700">{money(service.price)}</p><p className="text-xs text-slate-400">{service.estimated_duration || 30} min</p></button>)}</div></section>
    <div className="grid gap-6 xl:grid-cols-5"><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-3"><div className="mb-4 flex items-center gap-2"><CalendarDays className="h-5 w-5 text-blue-600" /><h2 className="font-bold text-slate-800">Fecha de atención</h2></div>{isEditing ? <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">{new Date(`${form.date}T00:00:00`).toLocaleDateString("es-SV", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p> : <Calendar mode="single" locale={es} selected={new Date(`${form.date}T00:00:00`)} onSelect={(day) => day && selectDate(day)} disabled={isOutsideCurrentWeek} className="w-full" />}</section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2"><div className="mb-4 flex items-center gap-2"><Clock3 className="h-5 w-5 text-blue-600" /><h2 className="font-bold text-slate-800">Horario disponible</h2></div>{isEditing ? <p className="rounded-xl bg-slate-50 p-4 text-sm font-semibold text-slate-700">{form.start_time}</p> : slotsLoading ? <p className="text-sm text-slate-500">Buscando disponibilidad médica…</p> : slots.length === 0 ? <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">No hay horarios disponibles para este servicio y fecha.</p> : <div className="max-h-80 space-y-2 overflow-y-auto pr-1">{slots.map((slot) => <button type="button" key={slot.start_time} onClick={() => setForm((current) => ({ ...current, start_time: slot.start_time }))} className={`w-full rounded-full border px-4 py-3 text-sm font-semibold ${form.start_time === slot.start_time ? "border-blue-600 bg-blue-600 text-white" : "border-blue-200 text-slate-700 hover:bg-blue-50"}`}>{slot.start_time} – {slot.end_time}</button>)}</div>}</section></div>
    <section className="grid gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-3"><div className="md:col-span-2">
      <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700"><FileText className="h-4 w-4 text-blue-600" />Motivo o notas</label>
      <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} rows="4" className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-blue-500" placeholder="Describe brevemente el motivo de tu cita." />
    </div>
      <div>
        <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700"><DollarSign className="h-4 w-4 text-blue-600" />Costo</p>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-xl font-bold text-slate-800">{money(selectedService.price)}</p>
        </div>
      </div>
    </section>
    <button disabled={saving} className="w-full rounded-xl bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{saving ? "Guardando…" : isEditing ? "Guardar cambios" : "Enviar solicitud"}</button>
  </form></main></>;
}
