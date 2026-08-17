import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ChevronLeft, ChevronDown, Plus, CalendarDays, Clock, History, XCircle,
  MapPin, Trash2, CalendarCheck, HeartPulse, IdCard, CalendarX,
  Loader2, User, CreditCard,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getMyAppointments, cancelAppointment } from "@/services/appointmentsService";
import { showSuccess, showError, confirmAction } from "@/lib/alerts";

const STATUS_LABELS = { pending: "Pendiente", scheduled: "Programada", completed: "Completada", cancelled: "Cancelada", no_show: "No se presentó" };
const STATUS_COLORS = { pending: "bg-amber-100 text-amber-700", scheduled: "bg-emerald-100 text-emerald-700", completed: "bg-slate-100 text-slate-600", cancelled: "bg-red-100 text-red-600", no_show: "bg-gray-100 text-gray-500" };
const STATUS_DOT = { pending: "bg-amber-500", scheduled: "bg-emerald-500", completed: "bg-slate-400", cancelled: "bg-red-500", no_show: "bg-gray-400" };

const fmt12 = (t) => {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};

const fmtFecha = (iso) =>
  new Date(iso).toLocaleDateString("es-SV", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

const esCancelable = (status) => ["pending", "scheduled"].includes(status);

const TABS = [
  { key: "proximas", label: "Próximas citas", icon: CalendarDays, badge: "Próxima cita" },
  { key: "pasadas", label: "Citas pasadas", icon: History, badge: "Cita pasada" },
  { key: "canceladas", label: "Citas canceladas", icon: XCircle, badge: "Cancelada" },
];

const AppointmentCard = ({ cita, badge, onCancelar, cancelando, onPagar, expandedId, setExpandedId }) => {
  const expandida = expandedId === cita._id;
  const depositoPendiente = cita.status === "pending" && cita.deposit_amount != null && !cita.deposit_paid;
  const depositoPagado = cita.deposit_paid && cita.deposit_amount != null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-start justify-between gap-3 mb-1">
        <span className="inline-block px-2.5 py-1 rounded-full bg-[#3B6FCA]/10 text-[#3B6FCA] text-xs font-semibold">{badge}</span>
        <div className="text-right flex-shrink-0">
          <p className="text-xl font-bold text-gray-900">${Number(cita.total).toFixed(2)}</p>
          <span className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[cita.status] || "bg-gray-100 text-gray-500"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[cita.status] || "bg-gray-400"}`} /> {STATUS_LABELS[cita.status] || cita.status}
          </span>
          {depositoPendiente && (
            <p className="text-xs text-amber-600 font-medium mt-1">Anticipo: ${Number(cita.deposit_amount).toFixed(2)}</p>
          )}
          {depositoPagado && (
            <p className="text-xs text-emerald-600 font-medium mt-1">Anticipo pagado · resta ${Number(cita.total - cita.deposit_amount).toFixed(2)}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 mt-3">
        <div className="w-12 h-12 rounded-full bg-[#3B6FCA]/10 flex items-center justify-center overflow-hidden flex-shrink-0">
          {cita.doctor_id?.img_url ? (
            <img src={cita.doctor_id.img_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <User className="w-5 h-5 text-[#3B6FCA]" />
          )}
        </div>
        <div>
          <p className="font-semibold text-gray-800">Dr. {cita.doctor_id?.name} {cita.doctor_id?.last_name}</p>
          <p className="text-sm text-gray-400">{cita.type}</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-50">
        <div className="flex items-start gap-2">
          <CalendarDays className="w-4 h-4 text-[#3B6FCA] mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs text-gray-400">Fecha</p>
            <p className="text-sm font-medium text-gray-700 capitalize">{fmtFecha(cita.date)}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Clock className="w-4 h-4 text-[#3B6FCA] mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs text-gray-400">Hora</p>
            <p className="text-sm font-medium text-gray-700">{fmt12(cita.start_time)} - {fmt12(cita.end_time)}</p>
            <p className="text-xs text-gray-400">Duración: {cita.duration_minutes} minutos</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <MapPin className="w-4 h-4 text-[#3B6FCA] mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs text-gray-400">Sede</p>
            <p className="text-sm font-medium text-gray-700">San Salvador, El Salvador</p>
          </div>
        </div>
      </div>

      {expandida && (
        <div className="mt-4 pt-4 border-t border-gray-50 text-sm text-gray-600 space-y-1.5">
          {cita.description && <p>{cita.description}</p>}
          {cita.status === "cancelled" && cita.cancellation_reason && (
            <p className="text-red-500">Motivo de cancelación: {cita.cancellation_reason}</p>
          )}
          {!cita.description && !(cita.status === "cancelled" && cita.cancellation_reason) && (
            <p className="text-gray-400">Sin notas adicionales para esta cita.</p>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-50">
        <div className="flex items-center gap-2">
          {esCancelable(cita.status) && (
            <button
              onClick={() => onCancelar(cita)}
              disabled={cancelando}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-red-100 text-red-500 hover:bg-red-50 text-sm font-semibold transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" /> Cancelar cita
            </button>
          )}
          {cita.status === "pending" && cita.deposit_amount != null && !cita.deposit_paid && (
            <button
              onClick={() => onPagar(cita._id)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#3B6FCA] hover:bg-[#2d5ab5] text-white text-sm font-semibold transition-colors"
            >
              <CreditCard className="w-4 h-4" /> Pagar anticipo
            </button>
          )}
        </div>

        <button
          onClick={() => setExpandedId(expandida ? null : cita._id)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#3B6FCA]/20 text-[#3B6FCA] hover:bg-[#3B6FCA]/5 text-sm font-semibold transition-colors"
        >
          <CalendarCheck className="w-4 h-4" /> {expandida ? "Ocultar detalles" : "Ver detalles"}
        </button>
      </div>
    </div>
  );
};

const MyAppointments = () => {
  const navigate = useNavigate();
  const { patient, logout } = useAuth();

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelandoId, setCancelandoId] = useState(null);
  const [tab, setTab] = useState("proximas");
  const [expandedId, setExpandedId] = useState(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const cargar = () => {
    getMyAppointments()
      .then(setAppointments)
      .catch(() => showError("No se pudieron cargar tus citas."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    cargar();
  }, []);

  const grupos = useMemo(() => {
    const proximas = appointments
      .filter((a) => ["pending", "scheduled"].includes(a.status))
      .sort((a, b) => new Date(a.date) - new Date(b.date) || a.start_time.localeCompare(b.start_time));
    const pasadas = appointments
      .filter((a) => ["completed", "no_show"].includes(a.status))
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    const canceladas = appointments
      .filter((a) => a.status === "cancelled")
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    return { proximas, pasadas, canceladas };
  }, [appointments]);

  const tabActivo = TABS.find((t) => t.key === tab);
  const lista = grupos[tab] || [];

  const handleCancelar = async (cita) => {
    // El mensaje cambia según si ya hay un anticipo pagado (se pierde, no se reembolsa)
    // o solo un intento de pago sin confirmar (cancelar no revisa ni revierte ese cobro)
    let mensaje = "¿Seguro que deseas cancelar esta cita?";
    if (cita.deposit_paid) {
      mensaje = `Ya pagaste un anticipo de $${Number(cita.deposit_amount).toFixed(2)} para esta cita. Si cancelas, ese anticipo no será reembolsado. ¿Deseas continuar?`;
    } else if (cita.wompi_transaction_id) {
      mensaje = "Ya existe un intento de pago para esta cita. Si cancelas, no se verificará ningún cobro pendiente automáticamente. ¿Seguro que deseas cancelar de todos modos?";
    }
    if (!(await confirmAction(mensaje, { confirmLabel: "Sí, cancelar", danger: true }))) return;
    setCancelandoId(cita._id);
    try {
      await cancelAppointment(cita._id);
      showSuccess("Cita cancelada.");
      cargar();
    } catch (err) {
      showError(err.message || "No se pudo cancelar la cita.");
    } finally {
      setCancelandoId(null);
    }
  };

  const handlePagar = (id) => navigate(`/agendar-cita/pagar?appointment=${id}`);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/dashboard" className="text-gray-400 hover:text-gray-600 text-sm flex items-center gap-1">
            <ChevronLeft className="w-4 h-4" /> Volver
          </Link>
          <span className="font-bold text-gray-800">Mis citas</span>
          <div className="relative">
            <button onClick={() => setUserMenuOpen((v) => !v)} className="flex items-center gap-2 p-1 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="w-8 h-8 rounded-full bg-[#3B6FCA]/10 flex items-center justify-center text-[#3B6FCA] font-semibold text-sm flex-shrink-0">
                {patient?.name?.[0]}
              </div>
              <span className="hidden sm:block text-sm font-medium text-gray-700">{patient?.name} {patient?.last_name}</span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>
            {userMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                <div className="absolute right-0 top-11 w-44 bg-white border border-gray-100 rounded-xl shadow-lg py-1 z-50">
                  <button onClick={handleLogout} className="w-full px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors text-left">
                    Cerrar sesión
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#3B6FCA]/10 flex items-center justify-center flex-shrink-0">
              <CalendarDays className="w-6 h-6 text-[#3B6FCA]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Mis citas</h1>
              <p className="text-gray-500 text-sm">Consulta, gestiona o cancela tus citas médicas.</p>
            </div>
          </div>
          <Link
            to="/agendar-cita"
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#3B6FCA] hover:bg-[#2d5ab5] text-white font-semibold text-sm transition-colors shadow-md shadow-[#3B6FCA]/20"
          >
            <Plus className="w-4 h-4" /> Agendar nueva cita
          </Link>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-1 border-b border-gray-100 mb-5">
              {TABS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors ${
                    tab === key ? "border-[#3B6FCA] text-[#3B6FCA] bg-[#3B6FCA]/5 rounded-t-lg" : "border-transparent text-gray-400 hover:text-gray-600"
                  }`}
                >
                  <Icon className="w-4 h-4" /> {label}
                  <span className={`px-1.5 py-0.5 rounded-full text-xs ${tab === key ? "bg-[#3B6FCA] text-white" : "bg-gray-100 text-gray-500"}`}>
                    {grupos[key]?.length || 0}
                  </span>
                </button>
              ))}
            </div>

            {loading ? (
              <div className="flex items-center justify-center gap-2 py-20 text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin text-[#3B6FCA]" /> Cargando tus citas...
              </div>
            ) : lista.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-gray-400 text-sm">No tienes {tabActivo.label.toLowerCase()}.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {lista.map((cita) => (
                  <AppointmentCard
                    key={cita._id}
                    cita={cita}
                    badge={tabActivo.badge}
                    onCancelar={handleCancelar}
                    cancelando={cancelandoId === cita._id}
                    onPagar={handlePagar}
                    expandedId={expandedId}
                    setExpandedId={setExpandedId}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-5">
            <div className="bg-gradient-to-br from-[#3B6FCA]/10 to-[#3B6FCA]/0 border border-[#3B6FCA]/10 rounded-2xl p-5">
              <HeartPulse className="w-7 h-7 text-[#3B6FCA] mb-2" />
              <p className="font-bold text-gray-900">Tu salud es lo más importante</p>
              <p className="text-sm text-gray-500 mt-1">Asiste a tus citas y mantén un control de tu bienestar.</p>
            </div>

            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
              <p className="font-semibold text-gray-800 text-sm mb-4">Recomendaciones</p>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Clock className="w-4 h-4 text-[#3B6FCA] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Llega 10 minutos antes</p>
                    <p className="text-xs text-gray-400">para agilizar tu atención.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <IdCard className="w-4 h-4 text-[#3B6FCA] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Lleva tu documento de identidad</p>
                    <p className="text-xs text-gray-400">(DUI) el día de tu cita.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CalendarX className="w-4 h-4 text-[#3B6FCA] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Si no puedes asistir,</p>
                    <p className="text-xs text-gray-400">cancela tu cita con anticipación.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyAppointments;