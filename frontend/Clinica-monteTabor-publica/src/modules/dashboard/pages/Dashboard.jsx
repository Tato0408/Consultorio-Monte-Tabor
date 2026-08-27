import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  LogOut, ChevronDown, ChevronRight, CalendarPlus, CalendarDays, Clock, User,
  Stethoscope, FileText, FileStack, Pill, AlertCircle, RefreshCw,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getDashboardSummary } from "@/services/patientPortalService";
import { cancelAppointment } from "@/services/appointmentsService";
import { showSuccess, showError, confirmAction } from "@/lib/alerts";
import NotificationsMenu from "@/components/NotificationsMenu";

const Logo = () => (
  <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: 31, height: 36 }}>
    <svg viewBox="0 0 56 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute inset-0 w-full h-full">
      <polygon points="28,2 54,17 54,47 28,62 2,47 2,17" fill="#3B6FCA" />
    </svg>
    <span className="relative z-10 text-white font-bold text-xs select-none">T</span>
  </div>
);

const fmt12 = (t) => {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};

const fmtFechaCorta = (iso) =>
  new Date(iso).toLocaleDateString("es-SV", { day: "numeric", month: "short", year: "numeric" });

const DIAS_SEMANA = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

// Desglosa una fecha en día de la semana / número / mes-año, para el bloque tipo
// "calendario" de la próxima cita
const partesFecha = (iso) => {
  const d = new Date(iso);
  return {
    diaSemana: DIAS_SEMANA[d.getDay()],
    diaNumero: d.getDate(),
    mesAnio: `${MESES_CORTOS[d.getMonth()]} ${d.getFullYear()}`,
  };
};

// Ni "Historial clínico" ni "Mi expediente" aplican: el expediente médico completo
// (antecedentes, signos vitales, procedimientos) solo lo ve el personal administrativo
// y los doctores, así que los accesos rápidos del paciente se quedan en lo que sí puede ver
const ACCESOS_RAPIDOS = [
  { to: "/agendar-cita", icon: CalendarDays, label: "Agendar cita", desc: "Reserva tu próxima atención médica" },
  { to: "/medicamentos", icon: Pill, label: "Medicamentos", desc: "Revisa tus tratamientos y recetas" },
  { to: "/documentos", icon: FileStack, label: "Documentos", desc: "Consulta tus recetas, incapacidades y referencias" },
];

const ACTIVITY_STYLES = {
  consulta: { icon: Stethoscope, bg: "bg-emerald-50", text: "text-emerald-500" },
  receta: { icon: FileText, bg: "bg-purple-50", text: "text-purple-500" },
  incapacidad: { icon: FileStack, bg: "bg-blue-50", text: "text-blue-500" },
};

// Panel principal del paciente: próxima cita, accesos rápidos, actividad y
// recordatorios reales (citas, recetas, incapacidades, referencias y medicamentos)
const Dashboard = () => {
  const navigate = useNavigate();
  const { patient, logout } = useAuth();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const cargar = () => {
    setLoadError(false);
    getDashboardSummary()
      .then(setData)
      .catch(() => {
        setLoadError(true);
        showError("No se pudo cargar tu panel.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    cargar();
  }, []);

  const nextAppointment = data?.nextAppointment || null;
  const stats = data?.stats || { consultas: 0, documentos: 0, recordatorios: 0 };
  const todayMedications = data?.todayMedications || [];
  const recentDocuments = data?.recentDocuments || [];
  const activity = data?.activity || [];

  // Recordatorios: próxima cita + medicamentos de hoy que aún no se marcan como tomados
  const reminders = useMemo(() => {
    const list = [];
    if (nextAppointment) {
      list.push({
        type: "cita",
        label: "Próxima cita",
        date: `${fmtFechaCorta(nextAppointment.date)} - ${fmt12(nextAppointment.start_time)}`,
      });
    }
    todayMedications
      .filter((m) => !m.taken)
      .forEach((m) => list.push({ type: "medicamento", label: m.name, date: m.frequency || "Hoy" }));
    return list;
  }, [nextAppointment, todayMedications]);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const handleCancelar = async () => {
    if (!nextAppointment) return;
    // El mensaje advierte que el anticipo se pierde solo cuando ya fue pagado y confirmado
    const mensaje = nextAppointment.deposit_paid
      ? `Ya pagaste un anticipo de $${Number(nextAppointment.deposit_amount).toFixed(2)} para esta cita. Si cancelas, ese anticipo no será reembolsado. ¿Deseas continuar?`
      : "¿Seguro que deseas cancelar tu próxima cita?";
    if (!(await confirmAction(mensaje, { confirmLabel: "Sí, cancelar", danger: true }))) return;
    setCancelling(true);
    try {
      await cancelAppointment(nextAppointment._id);
      showSuccess("Cita cancelada.");
      cargar();
    } catch (err) {
      showError(err.message || "No se pudo cancelar la cita.");
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-6 h-6 border-2 border-[#3B6FCA] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (loadError && !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-6 text-center">
        <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mb-4">
          <AlertCircle className="w-7 h-7 text-amber-600" />
        </div>
        <h1 className="text-lg font-bold text-gray-900">No se pudo cargar tu panel</h1>
        <p className="text-sm text-gray-500 mt-1 max-w-sm">Revisa tu conexión e intenta de nuevo.</p>
        <button
          onClick={cargar}
          className="flex items-center gap-2 mt-5 px-5 py-2.5 rounded-xl bg-[#3B6FCA] hover:bg-[#2d5ab5] text-white text-sm font-semibold transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Reintentar
        </button>
        <Link to="/login" className="mt-4 text-sm font-semibold text-[#3B6FCA] hover:underline">
          Volver al inicio de sesión
        </Link>
      </div>
    );
  }

  const fecha = nextAppointment ? partesFecha(nextAppointment.date) : null;

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      {/* ── Navbar ── */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <Logo />
              <span className="font-bold text-gray-800 text-sm leading-tight truncate">
                Clínica<br />Monte Tabor
              </span>
            </div>
            <span className="hidden sm:block text-gray-300">|</span>
            <span className="hidden sm:block font-semibold text-gray-700">Portal del paciente</span>
          </div>

          {/* "relative" vive en este contenedor del grupo completo, no en cada botón por
              separado: la campana no es el elemento más a la derecha del header (la cuenta
              lo es), así que si su dropdown se ancla ("right-0") a su propio envoltorio
              angosto, en pantallas de celular se desborda por la izquierda del viewport en
              vez de quedar dentro de la franja visible (mismo criterio ya aplicado en
              NotificationsMenu.jsx / PatientPortalHeader.jsx). Ambos dropdowns, anclados a
              este contenedor común, siempre terminan alineados con el borde derecho real
              del header. */}
          <div className="relative flex items-center gap-2 flex-shrink-0">
            <NotificationsMenu reminders={reminders} />

            <div>
              <button
                onClick={() => setUserMenuOpen((v) => !v)}
                className="flex items-center gap-2 p-1.5 pr-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-[#3B6FCA]/10 flex items-center justify-center text-[#3B6FCA] font-semibold text-sm">
                  {patient?.name?.[0]}
                </div>
                <span className="hidden sm:block text-sm font-medium text-gray-700">
                  {patient?.name} {patient?.last_name}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 top-12 w-44 bg-white border border-gray-100 rounded-xl shadow-lg py-1 z-50">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors text-left"
                    >
                      <LogOut className="w-4 h-4" /> Cerrar sesión
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* ── Encabezado y acciones rápidas ── */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">¡Hola, {patient?.name || "bienvenido"}!</h1>
            <p className="text-gray-500 text-sm mt-1">Gestiona tu salud y revisa tu información médica desde aquí.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              to="/agendar-cita"
              className="flex items-center gap-3 px-5 py-3 rounded-xl bg-[#3B6FCA] hover:bg-[#2d5ab5] transition-colors text-white shadow-md shadow-[#3B6FCA]/20"
            >
              <CalendarPlus className="w-5 h-5 flex-shrink-0" />
              <span className="text-left">
                <span className="block font-semibold text-sm">Agendar nueva cita</span>
                <span className="block text-xs text-white/80">Elige tu atención, doctor y horario</span>
              </span>
            </Link>
            <Link
              to="/mis-citas"
              className="flex items-center gap-3 px-5 py-3 rounded-xl bg-white border border-gray-100 hover:border-[#3B6FCA]/40 transition-colors shadow-sm"
            >
              <CalendarDays className="w-5 h-5 text-[#3B6FCA] flex-shrink-0" />
              <span className="text-left">
                <span className="block font-semibold text-sm text-gray-800">Ver mis citas</span>
                <span className="block text-xs text-gray-400">Historial y citas próximas</span>
              </span>
            </Link>
          </div>
        </div>

        {/* ── Tarjetas de estadísticas ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 sm:mb-8">
          <div className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
            <div className="w-11 h-11 rounded-xl bg-[#3B6FCA]/10 flex items-center justify-center flex-shrink-0">
              <CalendarDays className="w-5 h-5 text-[#3B6FCA]" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Próxima cita</p>
              {nextAppointment ? (
                <>
                  <p className="font-bold text-gray-900 text-sm truncate">{fmtFechaCorta(nextAppointment.date)}</p>
                  <p className="text-xs text-gray-400">{fmt12(nextAppointment.start_time)}</p>
                </>
              ) : (
                <p className="text-sm text-gray-400">Sin citas próximas</p>
              )}
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
              <Stethoscope className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Consultas realizadas</p>
              <p className="font-bold text-gray-900 text-xl leading-tight">{stats.consultas}</p>
              <p className="text-xs text-gray-400">Historial completo</p>
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
            <div className="w-11 h-11 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
              <Pill className="w-5 h-5 text-violet-500" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Medicamentos activos</p>
              <p className="font-bold text-gray-900 text-xl leading-tight">{todayMedications.length}</p>
              <p className="text-xs text-gray-400">Tratamientos vigentes</p>
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
            <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-amber-500" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Documentos pendientes</p>
              <p className="font-bold text-gray-900 text-xl leading-tight">{stats.documentos}</p>
              <p className="text-xs text-gray-400">Por revisar o descargar</p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* ── Columna izquierda ── */}
          {/* min-w-0: sin esto, un item de grid/flex no se encoge por debajo del ancho
              mínimo de su contenido (default min-width: auto), así que la fila con scroll
              horizontal de "Mi actividad reciente" de más abajo forzaba esta columna -y con
              ella toda la página- a ser más ancha que la pantalla en vez de quedarse dentro
              de su overflow-x-auto. */}
          <div className="lg:col-span-2 flex flex-col gap-8 min-w-0">
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-3">Tu próxima cita</h2>
              {!nextAppointment ? (
                <div className="bg-white border border-gray-100 rounded-2xl p-6 text-center">
                  <p className="text-sm text-gray-400">No tienes citas próximas.</p>
                  <Link to="/agendar-cita" className="inline-block mt-3 text-sm font-semibold text-[#3B6FCA] hover:underline">
                    Agenda tu primera cita
                  </Link>
                </div>
              ) : (
                <div className="bg-[#3B6FCA]/5 border border-[#3B6FCA]/10 rounded-2xl p-4 sm:p-6 flex flex-col sm:flex-row items-start gap-5">
                  <div className="bg-white border border-gray-100 rounded-xl px-4 py-3 text-center flex-shrink-0">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{fecha.diaSemana}</p>
                    <p className="text-3xl font-extrabold text-[#3B6FCA] leading-none my-1">{fecha.diaNumero}</p>
                    <p className="text-[10px] font-semibold text-gray-500 uppercase">{fecha.mesAnio}</p>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col gap-2 text-sm text-gray-600">
                      <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-gray-400 flex-shrink-0" /> {fmt12(nextAppointment.start_time)}</span>
                      <span className="flex items-center gap-1.5"><Stethoscope className="w-4 h-4 text-gray-400 flex-shrink-0" /> {nextAppointment.type}</span>
                      <span className="flex items-center gap-1.5">
                        <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        {nextAppointment.doctor_id ? `Dr. ${nextAppointment.doctor_id.name} ${nextAppointment.doctor_id.last_name}` : "Por asignar"}
                      </span>
                      {nextAppointment.deposit_amount != null && !nextAppointment.deposit_paid && (
                        <span className="text-amber-600 font-medium">Anticipo pendiente: ${Number(nextAppointment.deposit_amount).toFixed(2)}</span>
                      )}
                      {nextAppointment.deposit_paid && nextAppointment.deposit_amount != null && (
                        <span className="text-emerald-600 font-medium">Anticipo pagado · resta ${Number(nextAppointment.total - nextAppointment.deposit_amount).toFixed(2)} en clínica</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3 mt-4">
                      <Link to="/mis-citas" className="px-4 py-2 rounded-lg bg-[#3B6FCA] hover:bg-[#2d5ab5] text-white text-sm font-semibold transition-colors">
                        Ver detalles
                      </Link>
                      <button
                        onClick={handleCancelar}
                        disabled={cancelling}
                        className="px-4 py-2 rounded-lg border border-gray-200 hover:border-red-300 hover:text-red-500 text-gray-600 text-sm font-semibold transition-colors disabled:opacity-50"
                      >
                        Cancelar cita
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="min-w-0">
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-3">Accesos rápidos</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {ACCESOS_RAPIDOS.map(({ to, icon: Icon, label, desc }) => (
                  <Link
                    key={to}
                    to={to}
                    className="relative flex flex-col gap-3 p-4 sm:p-5 rounded-2xl bg-white border border-gray-100 hover:border-[#3B6FCA]/40 hover:shadow-sm transition-all"
                  >
                    <div className="w-11 h-11 rounded-xl bg-[#3B6FCA]/10 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-[#3B6FCA]" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">{label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 absolute bottom-4 right-4" />
                  </Link>
                ))}
              </div>
            </div>

            <div className="min-w-0">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wide">Mi actividad reciente</h2>
                {activity.length > 0 && (
                  <Link to="/mis-citas" className="flex items-center gap-0.5 text-xs font-semibold text-[#3B6FCA] hover:underline">
                    Ver todo el historial <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
              {activity.length === 0 ? (
                <p className="text-sm text-gray-400 bg-white border border-gray-100 rounded-2xl p-6 text-center">
                  Todavía no tienes actividad registrada.
                </p>
              ) : (
                <div className="bg-white border border-gray-100 rounded-2xl p-4 sm:p-6">
                  {/* Grid que se apila en vez de la fila con scroll horizontal que tenía
                      antes: en pantallas angostas, un carrusel que solo se ve completo
                      deslizando el dedo lee como contenido cortado/roto, no como algo
                      interactivo. */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {activity.map((e, i) => {
                      const estilo = ACTIVITY_STYLES[e.type] || ACTIVITY_STYLES.consulta;
                      const Icon = estilo.icon;
                      return (
                        <div key={i} className="min-w-0 border border-gray-100 rounded-xl p-4">
                          <div className={`w-9 h-9 rounded-lg ${estilo.bg} flex items-center justify-center mb-3`}>
                            <Icon className={`w-4 h-4 ${estilo.text}`} />
                          </div>
                          <p className="text-sm font-semibold text-gray-800 truncate">{e.label}</p>
                          {e.doctor && (
                            <p className="text-xs text-gray-400 truncate mt-0.5">Dr(a). {e.doctor.name} {e.doctor.last_name}</p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">{fmtFechaCorta(e.date)}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Columna derecha ── */}
          <div className="flex flex-col gap-6 min-w-0">
            <div className="bg-white border border-gray-100 rounded-2xl p-4 sm:p-5 shadow-sm">
              <h2 className="text-sm font-bold text-gray-800 mb-3">Recordatorios</h2>
              {reminders.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">No tienes recordatorios pendientes.</p>
              ) : (
                <div className="space-y-1">
                  {reminders.map((r, i) => (
                    <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
                        {r.type === "cita" ? <CalendarDays className="w-4 h-4 text-[#3B6FCA]" /> : <Pill className="w-4 h-4 text-emerald-500" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-700 truncate">{r.label}</p>
                        <p className="text-xs text-gray-400">{r.date}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white border border-gray-100 rounded-2xl p-4 sm:p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-gray-800">Medicamentos activos</h2>
                <Link to="/medicamentos" className="text-xs font-semibold text-[#3B6FCA] hover:underline">Ver todos</Link>
              </div>
              {todayMedications.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">No tienes medicamentos activos hoy.</p>
              ) : (
                <div className="space-y-1">
                  {todayMedications.map((m) => (
                    <div key={m.medication_id} className="flex items-center gap-3 p-2 rounded-lg">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                        <Pill className="w-4 h-4 text-emerald-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-700 truncate">{m.name} {m.dose}</p>
                        <p className="text-xs text-gray-400 truncate">{m.frequency}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white border border-gray-100 rounded-2xl p-4 sm:p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-gray-800">Documentos recientes</h2>
                <Link to="/documentos" className="text-xs font-semibold text-[#3B6FCA] hover:underline">Ver todos</Link>
              </div>
              {recentDocuments.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">Aún no tienes documentos.</p>
              ) : (
                <div className="space-y-1">
                  {recentDocuments.map((d, i) => (
                    <Link key={i} to="/documentos" className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
                        <FileText className={`w-4 h-4 ${d.type === "receta" ? "text-red-400" : d.type === "incapacidad" ? "text-[#3B6FCA]" : "text-emerald-500"}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-700 truncate">{d.label}</p>
                        <p className="text-xs text-gray-400 truncate">
                          {d.doctor ? `Dr. ${d.doctor.name} ${d.doctor.last_name} - ` : ""}{fmtFechaCorta(d.date)}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
