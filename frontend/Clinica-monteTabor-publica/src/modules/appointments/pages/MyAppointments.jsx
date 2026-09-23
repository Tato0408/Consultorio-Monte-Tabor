import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  ChevronLeft, ChevronDown, Plus, CalendarDays, Clock, History, XCircle,
  MapPin, Trash2, CalendarCheck, HeartPulse, IdCard, CalendarX,
  Loader2, User, CreditCard, CalendarClock, AlertTriangle, LayoutGrid,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getMyAppointments, cancelAppointment, deleteAppointmentRequest } from "@/services/appointmentsService";
import { showSuccess, showError, confirmAction, confirmActionWithReason } from "@/lib/alerts";
import NotificationsMenu from "@/components/NotificationsMenu";

const STATUS_LABELS = { pending: "Pendiente", scheduled: "Programada", completed: "Completada", cancelled: "Cancelada", no_show: "No se presentó", needs_reschedule: "Por reagendar", expired: "Por reagendar" };
const STATUS_COLORS = { pending: "bg-amber-100 text-amber-700", scheduled: "bg-emerald-100 text-emerald-700", completed: "bg-slate-100 text-slate-600", cancelled: "bg-red-100 text-red-600", no_show: "bg-gray-100 text-gray-500", needs_reschedule: "bg-orange-100 text-orange-700", expired: "bg-orange-100 text-orange-700" };
const STATUS_DOT = { pending: "bg-amber-500", scheduled: "bg-emerald-500", completed: "bg-slate-400", cancelled: "bg-red-500", no_show: "bg-gray-400", needs_reschedule: "bg-orange-500", expired: "bg-orange-500" };

// Estados en los que el paciente puede (y debe) reagendar la cita reusando el mismo
// registro: ningún doctor la aceptó a tiempo ("no_aceptada") o el cupo se lo asignaron
// a otro paciente ("cupo_asignado").
const REAGENDABLES = ["needs_reschedule", "expired"];
const MOTIVO_REAGENDAR = {
  no_aceptada: "Ningún profesional aceptó tu cita a tiempo. Elige una nueva fecha y hora.",
  cupo_asignado: "El horario que solicitaste se le asignó a otro paciente. Elige una nueva fecha y hora.",
};

// Estados desde los que ningún doctor llegó a aceptar la cita: "cancelarla" no la deja
// marcada como cancelada, la elimina por completo (mismo criterio que la app móvil, ver
// eliminarSolicitud en AppointmentDetailScreen.jsx).
const ELIMINABLES = ["pending", "needs_reschedule", "expired"];
const MENSAJE_ELIMINAR =
  "Como ningún profesional la aceptó, esta solicitud se eliminará por completo en vez de solo marcarse como cancelada. Esta acción no se puede deshacer. ¿Deseas continuar?";

const fmt12 = (t) => {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};

// "date" llega como medianoche UTC del día real (mismo criterio que inicioDeCita más
// abajo): sin timeZone:"UTC" el día se corre uno atrás en El Salvador.
const fmtFecha = (iso) =>
  new Date(iso).toLocaleDateString("es-SV", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

const esCancelable = (status) => ["pending", "scheduled"].includes(status);

// Reagendar solo tiene sentido hasta 1 hora antes de la hora de inicio: después de
// ese límite, la única opción que queda es cancelar (ver puedeReagendar). "date" llega
// como medianoche UTC del día de la cita (el backend no le mete zona horaria), así que
// se leen sus componentes UTC y se combinan con la hora local de start_time, mismo
// criterio que ya usa el resto del proyecto (ver formatLongDate en la app móvil).
const LIMITE_REAGENDAR_MS = 60 * 60 * 1000;
const inicioDeCita = (cita) => {
  const d = new Date(cita.date);
  const [h, m] = (cita.start_time || "0:0").split(":").map(Number);
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), h, m, 0, 0);
};
const puedeReagendar = (cita) =>
  esCancelable(cita.status) && inicioDeCita(cita).getTime() - Date.now() > LIMITE_REAGENDAR_MS;

// A menos de 30 minutos del inicio (o ya empezada), una cita ya aceptada no se
// puede cancelar sola: el paciente debe coordinarlo con quien lo atenderá. El
// backend también lo bloquea (ver isCancelLockedForPatient), esto solo evita
// abrir el diálogo del motivo para nada.
const CANCELAR_BLOQUEADO_MS = 30 * 60 * 1000;
const MENSAJE_CANCELAR_BLOQUEADO =
  "Tu cita está próxima a comenzar. Para cancelarla, comunícate con el doctor que te atenderá y lleguen a un acuerdo.";
const cancelarBloqueado = (cita) =>
  cita.status === "scheduled" && inicioDeCita(cita).getTime() - Date.now() <= CANCELAR_BLOQUEADO_MS;

// "Todas" va primero y es el tab por defecto (ver useState(tab) más abajo). El orden de
// las demás pestañas define el orden en el que se listan las citas dentro de "Todas": cada
// cita se clasifica en la primera pestaña de esta lista con la que su estado calce (ver
// clasificarCita), así que "Atendidas" antes que "Pasadas" importa — evita que una cita
// completada aparezca duplicada (pertenece a ambos grupos), y se resuelve a favor de la
// que aparece primero en este arreglo.
const TABS = [
  { key: "todas", label: "Todas", icon: LayoutGrid, badge: "Cita", vacio: "citas", vacioHint: "Aquí aparecerán todas tus citas." },
  { key: "atendidas", label: "Atendidas", icon: CalendarCheck, badge: "Atendida", vacio: "citas atendidas", vacioHint: "Cuando finalice una cita, aparecerá aquí." },
  { key: "proximas", label: "Próximas", icon: CalendarDays, badge: "Próxima cita", vacio: "próximas citas", vacioHint: "Cuando agendes una cita, aparecerá aquí." },
  { key: "porReagendar", label: "Por reagendar", icon: CalendarClock, badge: "Por reagendar", vacio: "citas por reagendar", vacioHint: "Aquí verás las citas que debas reagendar." },
  { key: "pasadas", label: "Pasadas", icon: History, badge: "Cita pasada", vacio: "citas pasadas", vacioHint: "Tus citas completadas y pasadas aparecerán aquí." },
  { key: "canceladas", label: "Canceladas", icon: XCircle, badge: "Cancelada", vacio: "citas canceladas", vacioHint: "Cuando canceles una cita, aparecerá aquí." },
];

// Mismo criterio de pertenencia que usan los filtros de grupos.* (ver useMemo de abajo),
// pero para una sola cita: a qué pestaña (después de "Todas") pertenece. Se usa para armar
// "Todas" sin duplicados y para que la insignia de cada tarjeta sea la correcta cuando se
// ven mezcladas ahí, en vez de mostrar siempre la insignia fija del tab activo.
const clasificarCita = (cita) => {
  if (cita.status === "completed") return "atendidas";
  if (["pending", "scheduled"].includes(cita.status)) return "proximas";
  if (REAGENDABLES.includes(cita.status)) return "porReagendar";
  if (cita.status === "no_show") return "pasadas";
  return "canceladas";
};
const BADGE_POR_TAB = Object.fromEntries(TABS.map((t) => [t.key, t.badge]));

const AppointmentCard = ({ cita, badge, onCancelar, cancelando, onReagendar, reagendando, onEliminar, eliminando, onPagar, expandedId, setExpandedId }) => {
  const expandida = expandedId === cita._id;
  const depositoPendiente = cita.status === "pending" && cita.deposit_amount != null && !cita.deposit_paid;
  const depositoPagado = cita.deposit_paid && cita.deposit_amount != null;
  const necesitaReagendar = REAGENDABLES.includes(cita.status);
  const puedeEliminar = ELIMINABLES.includes(cita.status);

  // En móvil los botones se apilan: una acción principal a ancho completo (pagar, o
  // reagendar cuando la cita quedó sin confirmar) y el par "Reagendar / Cancelar" en
  // una rejilla de dos. En sm+ vuelven a una fila. "Reagendar" solo aparece como
  // secundario cuando NO es la acción principal.
  const mostrarReagendarSecundario = puedeReagendar(cita) && !necesitaReagendar;
  // Cancelar-con-motivo solo tiene sentido para una cita ya confirmada (scheduled): para
  // pending/needs_reschedule/expired, "cancelar" ahora es eliminar la solicitud (ver
  // puedeEliminar arriba).
  const mostrarCancelarConMotivo = cita.status === "scheduled";
  const deshabilitado = cancelando || reagendando || eliminando;

  return (
    <div className={`bg-white rounded-2xl border shadow-sm p-4 sm:p-6 ${necesitaReagendar ? "border-orange-200" : "border-gray-100"}`}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="inline-block px-2.5 py-1 rounded-full bg-[#3B6FCA]/10 text-[#3B6FCA] text-xs font-semibold">{badge}</span>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[cita.status] || "bg-gray-100 text-gray-500"}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[cita.status] || "bg-gray-400"}`} /> {STATUS_LABELS[cita.status] || cita.status}
        </span>
      </div>
      <div className="flex items-baseline justify-between gap-2 mt-2.5">
        <p className="text-xl sm:text-2xl font-bold text-gray-900">${Number(cita.total).toFixed(2)}</p>
        {depositoPendiente && (
          <p className="text-xs text-amber-600 font-medium flex-shrink-0">Anticipo: ${Number(cita.deposit_amount).toFixed(2)}</p>
        )}
      </div>
      {depositoPagado && (
        <p className="text-xs text-emerald-600 font-medium mt-1">Anticipo pagado · resta ${Number(cita.total - cita.deposit_amount).toFixed(2)}</p>
      )}

      {necesitaReagendar && (
        <div className="flex items-start gap-2 bg-orange-50 border border-orange-100 rounded-xl px-3 py-2.5 mt-3">
          <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-orange-700">
            {MOTIVO_REAGENDAR[cita.reschedule_reason] || "Esta cita quedó sin confirmar. Elige una nueva fecha y hora."}
          </p>
        </div>
      )}

      <div className="flex items-center gap-3 mt-3">
        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#3B6FCA]/10 flex items-center justify-center overflow-hidden flex-shrink-0">
          {cita.doctor_id?.img_url || cita.nurse_id?.img_url ? (
            <img src={cita.doctor_id?.img_url || cita.nurse_id?.img_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <User className="w-5 h-5 text-[#3B6FCA]" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-800 truncate">
            {cita.doctor_id
              ? `Dr. ${cita.doctor_id.name} ${cita.doctor_id.last_name}`
              : cita.nurse_id
                ? `${cita.nurse_id.name} ${cita.nurse_id.last_name}`
                : "Por asignar"}
          </p>
          <p className="text-sm text-gray-400 truncate">{cita.type}</p>
        </div>
      </div>

      <div className="flex flex-col sm:grid sm:grid-cols-3 gap-3 sm:gap-6 mt-4 pt-4 border-t border-gray-50">
        <div className="flex items-start gap-2 min-w-0">
          <CalendarDays className="w-4 h-4 text-[#3B6FCA] mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-gray-400">Fecha</p>
            <p className="text-sm font-medium text-gray-700 capitalize">{fmtFecha(cita.date)}</p>
          </div>
        </div>
        <div className="flex items-start gap-2 min-w-0">
          <Clock className="w-4 h-4 text-[#3B6FCA] mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-gray-400">Hora</p>
            <p className="text-sm font-medium text-gray-700">{fmt12(cita.start_time)} - {fmt12(cita.end_time)}</p>
            <p className="text-xs text-gray-400">Duración: {cita.duration_minutes} minutos</p>
          </div>
        </div>
        <div className="flex items-start gap-2 min-w-0">
          <MapPin className="w-4 h-4 text-[#3B6FCA] mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
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

      <div className="mt-4 pt-4 border-t border-gray-50 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          {depositoPendiente && (
            <button
              onClick={() => onPagar(cita._id)}
              className="flex items-center justify-center gap-1.5 w-full sm:w-auto px-4 py-2 rounded-lg bg-[#3B6FCA] hover:bg-[#2d5ab5] text-white text-sm font-semibold transition-colors"
            >
              <CreditCard className="w-4 h-4" /> Pagar anticipo
            </button>
          )}
          {puedeEliminar && (
            <button
              onClick={() => onEliminar(cita)}
              disabled={deshabilitado}
              className="flex items-center justify-center gap-1.5 w-full sm:w-auto px-4 py-2 rounded-lg border border-red-100 text-red-500 hover:bg-red-50 text-sm font-semibold transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" /> Cancelar cita
            </button>
          )}
          {necesitaReagendar && (
            <button
              onClick={() => onReagendar(cita)}
              disabled={deshabilitado}
              className="flex items-center justify-center gap-1.5 w-full sm:w-auto px-4 py-2 rounded-lg bg-[#3B6FCA] hover:bg-[#2d5ab5] text-white text-sm font-semibold transition-colors disabled:opacity-50"
            >
              <CalendarClock className="w-4 h-4" /> Reagendar cita
            </button>
          )}
          {(mostrarReagendarSecundario || mostrarCancelarConMotivo) && (
            <div className={`grid gap-2 sm:flex sm:gap-2 ${mostrarReagendarSecundario && mostrarCancelarConMotivo ? "grid-cols-2" : "grid-cols-1"}`}>
              {mostrarReagendarSecundario && (
                <button
                  onClick={() => onReagendar(cita)}
                  disabled={deshabilitado}
                  className="flex items-center justify-center gap-1.5 w-full sm:w-auto px-4 py-2 rounded-lg border border-[#3B6FCA]/20 text-[#3B6FCA] hover:bg-[#3B6FCA]/5 text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  <CalendarClock className="w-4 h-4" /> Reagendar
                </button>
              )}
              {mostrarCancelarConMotivo && (
                <button
                  onClick={() => onCancelar(cita)}
                  disabled={deshabilitado}
                  className="flex items-center justify-center gap-1.5 w-full sm:w-auto px-4 py-2 rounded-lg border border-red-100 text-red-500 hover:bg-red-50 text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" /> Cancelar
                </button>
              )}
            </div>
          )}
        </div>

        <button
          onClick={() => setExpandedId(expandida ? null : cita._id)}
          className="flex items-center justify-center gap-1.5 w-full sm:w-auto px-4 py-2 rounded-lg border border-[#3B6FCA]/20 text-[#3B6FCA] hover:bg-[#3B6FCA]/5 text-sm font-semibold transition-colors"
        >
          <CalendarCheck className="w-4 h-4" /> {expandida ? "Ocultar detalles" : "Ver detalles"}
        </button>
      </div>
    </div>
  );
};

// Claves válidas para llegar con un tab preseleccionado (ver location.state?.tab más
// abajo), armado a partir de TABS en vez de repetirlas a mano.
const TAB_KEYS = TABS.map((t) => t.key);

const MyAppointments = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { patient, logout } = useAuth();

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelandoId, setCancelandoId] = useState(null);
  const [reagendandoId, setReagendandoId] = useState(null);
  const [eliminandoId, setEliminandoId] = useState(null);
  // Se puede llegar con un tab ya elegido (ej. desde las tarjetas de estadísticas del
  // dashboard: "Próxima cita" -> state:{tab:"proximas"}, "Consultas realizadas" ->
  // state:{tab:"atendidas"}). Si no viene nada, o viene una clave inválida, cae a "todas".
  const [tab, setTab] = useState(TAB_KEYS.includes(location.state?.tab) ? location.state.tab : "todas");
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
    const atendidas = appointments
      .filter((a) => a.status === "completed")
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    const proximas = appointments
      .filter((a) => ["pending", "scheduled"].includes(a.status))
      .sort((a, b) => new Date(a.date) - new Date(b.date) || a.start_time.localeCompare(b.start_time));
    const porReagendar = appointments
      .filter((a) => REAGENDABLES.includes(a.status))
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    const pasadas = appointments
      .filter((a) => ["completed", "no_show"].includes(a.status))
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    const canceladas = appointments
      .filter((a) => a.status === "cancelled")
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    // "Todas" concatena los demás grupos en el mismo orden en que aparecen sus pestañas
    // (ver TABS/clasificarCita más arriba). "pasadas" se filtra a solo no_show porque las
    // completadas ya entraron con "atendidas": sin eso, una cita completada saldría dos
    // veces (pertenece a ambos grupos).
    const todas = [...atendidas, ...proximas, ...porReagendar, ...pasadas.filter((a) => a.status !== "completed"), ...canceladas];
    return { todas, atendidas, proximas, porReagendar, pasadas, canceladas };
  }, [appointments]);

  const tabActivo = TABS.find((t) => t.key === tab);
  const lista = grupos[tab] || [];
  const VacioIcon = tabActivo.icon;

  // Lleva al asistente de agendar cita con el tipo, doctor y motivo de la cita anterior
  // ya elegidos — solo quedan vacíos fecha y hora, que el paciente vuelve a elegir.
  // Se usa cuando la cita YA se canceló (crear una nueva desde cero).
  const irAAgendarConPrefill = (cita) => {
    navigate("/agendar-cita", {
      state: {
        prefill: {
          // Una cita histórica de antes de que la Consulta Médica General fuera un
          // procedimiento real puede no traer procedure_id: queda sin tipo preseleccionado,
          // para que se vuelva a elegir explícitamente en el paso 1.
          tipo: cita.procedure_id?._id || null,
          doctorId: cita.doctor_id?._id || null,
          // Un procedimiento sin doctor lo atiende una enfermera como proveedora
          // principal: sin esto, reagendar una cita así no restauraba ningún proveedor
          // (NewAppointment.jsx solo intentaba restaurar cuando había doctorId).
          nurseId: cita.nurse_id?._id || null,
          motivo: cita.description || "",
        },
      },
    });
  };

  // Reagendar reusando el mismo registro (conserva el anticipo): el asistente arranca en
  // el paso de fecha/hora y al confirmar llama a PATCH /appointments/:id/reschedule.
  const irAReagendarReusando = (cita) => {
    navigate("/agendar-cita", {
      state: {
        reschedule: {
          appointmentId: cita._id,
          tipo: cita.procedure_id?._id || null,
          doctorId: cita.doctor_id?._id || null,
          nurseId: cita.nurse_id?._id || null,
          motivo: cita.description || "",
        },
      },
    });
  };

  const handleCancelar = async (cita) => {
    if (cancelarBloqueado(cita)) {
      showError(MENSAJE_CANCELAR_BLOQUEADO);
      return;
    }
    // El mensaje cambia según si ya hay un anticipo pagado (se pierde, no se reembolsa)
    // o solo un intento de pago sin confirmar (cancelar no revisa ni revierte ese cobro)
    let mensaje = "¿Por qué deseas cancelar esta cita?";
    if (cita.deposit_paid) {
      mensaje = `Ya pagaste un anticipo de $${Number(cita.deposit_amount).toFixed(2)} para esta cita. Si cancelas, ese anticipo no será reembolsado. Cuéntanos por qué cancelas:`;
    } else if (cita.wompi_transaction_id) {
      mensaje = "Ya existe un intento de pago para esta cita. Si cancelas, no se verificará ningún cobro pendiente automáticamente. Cuéntanos por qué cancelas:";
    }
    // El motivo real que se escriba acá es lo que se guarda (ver cancelMyAppointment en
    // el backend) — antes se guardaba siempre el mismo texto fijo sin importar lo que el
    // paciente hubiera querido explicar.
    const motivo = await confirmActionWithReason(mensaje, { confirmLabel: "Sí, cancelar", placeholder: "Ej. Ya no puedo asistir a esa hora..." });
    if (!motivo) return;

    // Segunda confirmación explícita cuando ya se pagó el anticipo: el paciente
    // debe aceptar de forma clara que ese dinero no se le devuelve.
    if (cita.deposit_paid) {
      const aceptaPerderAnticipo = await confirmAction(
        `¿Confirmas la cancelación? Ya pagaste un anticipo de $${Number(cita.deposit_amount).toFixed(2)} y, por política de la clínica, ese monto no se te reembolsará.`,
        { confirmLabel: "Sí, cancelar", cancelLabel: "No, conservar la cita", danger: true }
      );
      if (!aceptaPerderAnticipo) return;
    }

    // Se evalúa ANTES de cancelar: una vez cancelada, cita.status ya no calza con
    // esCancelable y puedeReagendar siempre daría false.
    const ofrecerReagendar = puedeReagendar(cita);
    setCancelandoId(cita._id);
    try {
      await cancelAppointment(cita._id, motivo);
      showSuccess("Cita cancelada.");
      cargar();
      if (ofrecerReagendar) {
        const quiereReagendar = await confirmAction("¿Deseas reagendar esta cita? Podrás elegir una nueva fecha y hora ahora mismo.", {
          confirmLabel: "Sí, reagendar",
          cancelLabel: "No, gracias",
        });
        if (quiereReagendar) irAAgendarConPrefill(cita);
      }
    } catch (err) {
      showError(err.message || "No se pudo cancelar la cita.");
    } finally {
      setCancelandoId(null);
    }
  };

  // Reagendar. Dos caminos:
  // - Cita "por reagendar" (needs_reschedule/expired) o "pending": se reusa el mismo
  //   registro (conserva anticipo), no se cancela nada. El asistente confirma con el
  //   endpoint de reschedule.
  // - Cita ya "scheduled" (un doctor la aceptó): sí se cancela para liberar el cupo y se
  //   agenda una nueva desde cero.
  const handleReagendar = async (cita) => {
    if (REAGENDABLES.includes(cita.status) || cita.status === "pending") {
      irAReagendarReusando(cita);
      return;
    }
    const confirmado = await confirmAction(
      "¿Deseas reagendar esta cita? Se cancelará esta cita para que puedas elegir una nueva fecha y hora.",
      { confirmLabel: "Sí, reagendar" }
    );
    if (!confirmado) return;
    setReagendandoId(cita._id);
    try {
      await cancelAppointment(cita._id, "Cancelada por el paciente para reagendar");
      irAAgendarConPrefill(cita);
    } catch (err) {
      showError(err.message || "No se pudo reagendar la cita.");
    } finally {
      setReagendandoId(null);
    }
  };

  // Elimina por completo una solicitud que nunca fue aceptada (pending/needs_reschedule/
  // expired): a diferencia de handleCancelar, no la deja marcada como cancelada, porque
  // ningún doctor llegó a aceptarla y no hay nada clínico que dependa de ella.
  const handleEliminar = async (cita) => {
    const confirmado = await confirmAction(MENSAJE_ELIMINAR, { confirmLabel: "Sí, cancelar", cancelLabel: "No, conservar", danger: true });
    if (!confirmado) return;
    setEliminandoId(cita._id);
    try {
      await deleteAppointmentRequest(cita._id);
      showSuccess("La solicitud fue eliminada.");
      cargar();
    } catch (err) {
      showError(err.message || "No se pudo eliminar la cita.");
    } finally {
      setEliminandoId(null);
    }
  };

  const handlePagar = (id) => navigate(`/agendar-cita/pagar?appointment=${id}`);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      <header className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
          <Link to="/dashboard" className="text-gray-400 hover:text-gray-600 text-sm flex items-center gap-1">
            <ChevronLeft className="w-4 h-4" /> Volver
          </Link>
          <span className="font-bold text-gray-800">Mis citas</span>
          <div className="relative flex items-center gap-1">
            <NotificationsMenu />
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
                  <Link to="/profile" className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                    <User className="w-4 h-4 text-gray-400" /> Mi perfil
                  </Link>
                  <hr className="my-1 border-gray-100" />
                  <button onClick={handleLogout} className="w-full px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors text-left">
                    Cerrar sesión
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#3B6FCA]/10 flex items-center justify-center flex-shrink-0">
              <CalendarDays className="w-5 h-5 sm:w-6 sm:h-6 text-[#3B6FCA]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Mis citas</h1>
              <p className="text-gray-500 text-xs sm:text-sm">Consulta, gestiona o cancela tus citas médicas.</p>
            </div>
          </div>
          <Link
            to="/agendar-cita"
            className="flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-3 rounded-xl bg-[#3B6FCA] hover:bg-[#2d5ab5] text-white font-semibold text-sm transition-colors shadow-md shadow-[#3B6FCA]/20"
          >
            <Plus className="w-4 h-4" /> Agendar nueva cita
          </Link>
        </div>

        {!loading && grupos.porReagendar.length > 0 && tab !== "porReagendar" && (
          <button
            onClick={() => setTab("porReagendar")}
            className="w-full flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-2xl px-4 py-3 mb-6 text-left hover:bg-orange-100/70 transition-colors"
          >
            <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-orange-800">
                {grupos.porReagendar.length === 1
                  ? "Tienes 1 cita por reagendar"
                  : `Tienes ${grupos.porReagendar.length} citas por reagendar`}
              </p>
              <p className="text-xs text-orange-600">Elige una nueva fecha y hora para no perder tu atención.</p>
            </div>
            <ChevronLeft className="w-4 h-4 text-orange-400 rotate-180 flex-shrink-0" />
          </button>
        )}

        <div className="flex flex-col lg:grid lg:grid-cols-3 lg:gap-10 gap-6">
          <div className="lg:col-span-2 min-w-0">
            {/* Móvil: rejilla de 2 columnas de "pills" — las pestañas con su contador caben
                sin scroll ni recorte (la última fila queda con una sola pestaña si el total
                es impar). sm+: barra de pestañas con subrayado (el diseño de escritorio de
                antes). flex-wrap es la red de seguridad si algún día se agrega una
                pestaña más y ya no cupieran en una sola fila. */}
            <div className="grid grid-cols-2 gap-2 mb-5 sm:flex sm:flex-wrap sm:items-center sm:gap-1 sm:gap-y-2 sm:border-b sm:border-gray-100">
              {TABS.map(({ key, label, icon: Icon }) => {
                const activa = tab === key;
                return (
                  <button
                    key={key}
                    onClick={() => setTab(key)}
                    className={`flex items-center justify-center sm:justify-start gap-1 sm:gap-2 px-2.5 sm:px-4 py-2.5 sm:py-3 text-[13px] sm:text-sm font-semibold leading-tight flex-shrink-0 transition-colors rounded-xl border sm:whitespace-nowrap sm:rounded-none sm:rounded-t-lg sm:border-x-0 sm:border-t-0 sm:border-b-2 sm:-mb-px ${
                      activa
                        ? "border-[#3B6FCA]/20 bg-[#3B6FCA]/10 text-[#3B6FCA] sm:border-[#3B6FCA] sm:bg-[#3B6FCA]/5"
                        : "border-gray-100 bg-white text-gray-500 sm:border-transparent sm:bg-transparent sm:text-gray-400 sm:hover:text-gray-600"
                    }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" /> {label}
                    <span className={`flex-shrink-0 px-1.5 py-0.5 rounded-full text-xs ${activa ? "bg-[#3B6FCA] text-white" : "bg-gray-100 text-gray-500"}`}>
                      {grupos[key]?.length || 0}
                    </span>
                  </button>
                );
              })}
            </div>

            {loading ? (
              <div className="flex items-center justify-center gap-2 py-20 text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin text-[#3B6FCA]" /> Cargando tus citas...
              </div>
            ) : lista.length === 0 ? (
              <div className="text-center py-14 sm:py-20">
                <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <VacioIcon className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-sm font-semibold text-gray-500">No tienes {tabActivo.vacio}.</p>
                <p className="text-xs text-gray-400 mt-1">{tabActivo.vacioHint}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {lista.map((cita) => (
                  <AppointmentCard
                    key={cita._id}
                    cita={cita}
                    // En "Todas" se mezclan citas de distintos grupos: la insignia debe
                    // reflejar a cuál pertenece cada una, no la fija del tab activo.
                    badge={tab === "todas" ? BADGE_POR_TAB[clasificarCita(cita)] : tabActivo.badge}
                    onCancelar={handleCancelar}
                    cancelando={cancelandoId === cita._id}
                    onReagendar={handleReagendar}
                    reagendando={reagendandoId === cita._id}
                    onEliminar={handleEliminar}
                    eliminando={eliminandoId === cita._id}
                    onPagar={handlePagar}
                    expandedId={expandedId}
                    setExpandedId={setExpandedId}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Sigue al lado de los tabs, como antes (columna derecha de la grid de 3);
              lg:gap-10 arriba (antes gap-6) le da un poco más de aire respecto a la lista,
              corriéndola un poco más a la derecha. */}
          <div className="flex flex-col gap-5 min-w-0">
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