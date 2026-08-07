import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CalendarDays, Clock3, Pencil, Plus, X } from "lucide-react";
import toast from "react-hot-toast";
import apiClient from "@/lib/apiClient";
import PatientPortalHeader from "@/components/PatientPortalHeader";

const STATUS = { pending: "Pendiente de asignación", scheduled: "Programada", completed: "Completada", cancelled: "Cancelada", no_show: "No asistió", expired: "Vencida" };
const blocked = new Set(["completed", "cancelled", "no_show", "expired"]);
const localDate = (value) => value ? new Date(value).toLocaleDateString("es-SV", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const currency = (value) => new Intl.NumberFormat("es-SV", { style: "currency", currency: "USD" }).format(Number(value || 0));

// Lista de citas del paciente logueado, con acciones de editar y cancelar
// (con motivo) mientras la cita no esté completada, cancelada o vencida.
export default function PatientAppointments({ embedded = false }) {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setAppointments((await apiClient("/appointments/patient", { params: { limit: 50 } })).data || []); }
    catch (error) { toast.error(error.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  // Cancela la cita seleccionada; el backend exige un motivo y notifica al
  // doctor asignado, si ya lo había.
  const confirmCancel = async () => {
    const reason = cancelReason.trim();
    if (reason.length < 3) return toast.error("Indica el motivo de la cancelación (mínimo 3 caracteres).");
    setCancelling(true);
    try {
      await apiClient(`/appointments/patient/${cancelTarget._id}/cancel`, { method: "PATCH", body: { cancellation_reason: reason } });
      toast.success("Cita cancelada.");
      setCancelTarget(null);
      setCancelReason("");
      load();
    } catch (error) { toast.error(error.message); }
    finally { setCancelling(false); }
  };

  return <>
    {!embedded && <PatientPortalHeader />}
    <main className={embedded ? "" : "min-h-screen bg-slate-50 p-4 sm:p-8"}>
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div><h1 className="text-2xl font-bold text-slate-900">Mis citas</h1><p className="text-sm text-slate-500">Consulta y administra tus solicitudes.</p></div>
        <button onClick={() => navigate("/appointments/new")} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"><Plus className="w-4 h-4" />Nueva cita</button>
      </div>
      {!embedded && <div className="flex gap-1 border-b border-slate-200 mb-5"><Link to="/dashboard" className="px-4 py-2 text-sm text-slate-500 hover:text-blue-600">Calendario</Link><span className="px-4 py-2 text-sm font-semibold text-blue-600 border-b-2 border-blue-600">Citas</span></div>}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? <p className="p-8 text-center text-slate-400">Cargando citas…</p> : appointments.length === 0 ? <p className="p-10 text-center text-slate-400">Aún no tienes citas registradas.</p> : <div className="divide-y divide-slate-100">{appointments.map((appointment) => <div key={appointment._id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4">
          <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600"><CalendarDays className="w-5 h-5" /></div>
          <div className="flex-1"><p className="font-semibold text-slate-800">{appointment.procedure_id?.name || appointment.type}</p><p className="text-sm text-slate-500">{localDate(appointment.date)} · {appointment.start_time}–{appointment.end_time} · {appointment.doctor_id ? `Dr. ${appointment.doctor_id.name} ${appointment.doctor_id.last_name}` : "Esperando doctor"}</p><p className="mt-1 text-xs font-semibold text-slate-500">Costo: {currency(appointment.total)}</p></div>
          <span className="text-xs font-semibold rounded-full bg-amber-50 px-3 py-1.5 text-amber-700">{STATUS[appointment.status] || appointment.status}</span>
          {!blocked.has(appointment.status) && <div className="flex items-center gap-3">
            <button onClick={() => navigate(`/appointments/${appointment._id}/edit`)} className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800"><Pencil className="w-4 h-4" />Editar</button>
            <button onClick={() => { setCancelTarget(appointment); setCancelReason(""); }} className="inline-flex items-center gap-1 text-sm font-medium text-red-600 hover:text-red-800"><X className="w-4 h-4" />Cancelar</button>
          </div>}
        </div>)}</div>}
      </div>
    </div>
    </main>
    {cancelTarget && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-bold text-slate-900">Cancelar cita</h2>
        <p className="mt-1 text-sm text-slate-500">Cuéntanos por qué cancelas esta cita. El doctor asignado, si ya lo hay, será notificado.</p>
        <textarea value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} rows="4" className="mt-4 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-red-500" placeholder="Motivo de la cancelación..." />
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={() => setCancelTarget(null)} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Volver</button>
          <button type="button" disabled={cancelling || cancelReason.trim().length < 3} onClick={confirmCancel} className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">{cancelling ? "Cancelando…" : "Sí, cancelar cita"}</button>
        </div>
      </div>
    </div>}
  </>;
}
