import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck, CalendarDays, Pill, Trash2, ChevronRight } from "lucide-react";
import apiClient from "@/lib/apiClient";
import { showError, confirmAction } from "@/lib/alerts";

const timeLabel = (value) => new Date(value).toLocaleDateString("es-SV", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

// reminders es opcional: antes Dashboard.jsx tenía su PROPIA campana aparte (próxima cita +
// medicamentos de hoy sin tomar, calculados en el cliente a partir del resumen del
// dashboard, sin relación con las notificaciones reales del servidor) al lado de esta
// campana de notificaciones — dos íconos de campana en el mismo header. Se fusionan en una
// sola: si se pasa reminders, aparecen como una sección propia arriba de las notificaciones
// del servidor, y cuentan también en el badge. El resto de las páginas que usan este
// componente sin pasar reminders quedan exactamente igual que antes.
export default function NotificationsMenu({ reminders = [] }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);

  const load = async () => {
    try {
      const response = await apiClient("/notifications/me");
      setItems(response.data || []);
      setUnread(response.unreadCount || 0);
    } catch { /* La campana no debe bloquear el portal si falla. */ }
  };

  useEffect(() => {
    load();
    // Respaldo por si el WebSocket estuvo caído (ver AuthContext.jsx): sin
    // esto, la única forma de enterarse de una notificación nueva era este
    // poll, con hasta 30s de atraso pese a que el backend ya la empuja al
    // instante por WebSocket.
    const timer = window.setInterval(load, 30000);

    // Notificación empujada por el WebSocket: se agrega al principio de la
    // lista sin esperar al siguiente poll. Se ignora si ya está en la lista
    // (el poll pudo haberla traído antes).
    const handlePushed = (event) => {
      const incoming = event.detail;
      if (!incoming?._id) return;
      setItems((current) => {
        if (current.some((n) => n._id === incoming._id)) return current;
        return [incoming, ...current];
      });
      if (!incoming.read) setUnread((current) => current + 1);
    };
    window.addEventListener("app:notification", handlePushed);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("app:notification", handlePushed);
    };
  }, []);

  const markAllRead = async () => {
    try { await apiClient("/notifications/read-all", { method: "PATCH" }); await load(); } catch { /* noop */ }
  };

  // Clic en una notificación puntual: se marca como leída y, si trae una cita
  // asociada, se confirma que siga existiendo antes de navegar (una cita
  // eliminada deja notificaciones viejas apuntando a un recurso muerto).
  // Se navega siempre a /mis-citas en vez del action_url del backend, que
  // apunta a una ruta que este portal no tiene: mismo criterio que la app
  // móvil, que tampoco confía en action_url y decide la pantalla de destino
  // ella misma a partir del estado real de la cita.
  const openNotification = async (item) => {
    if (!item.read) {
      // El estado local solo se actualiza si el PATCH tuvo éxito: antes se actualizaba
      // siempre, así que un fallo de red puntual dejaba la notificación marcada como
      // leída en pantalla sin estarlo en el servidor (eliminar/vaciar sí seguían este
      // criterio correctamente, marcar como leída era la única excepción).
      try {
        await apiClient(`/notifications/${item._id}/read`, { method: "PATCH" });
        setItems((current) => current.map((n) => (n._id === item._id ? { ...n, read: true } : n)));
        setUnread((current) => Math.max(0, current - 1));
      } catch { /* noop */ }
    }
    if (item.appointment_id) {
      try {
        // GET /api/appointments/patient/:id (appointmentsController.getPatientAppointmentById):
        // ruta real y válida para el portal de pacientes (requirePatientRole la limita al
        // paciente dueño de la cita), confirmado leyendo appointments.js/appointmentsController.js
        // del backend — no hace falta traer el listado completo solo para confirmar que
        // una cita puntual sigue existiendo.
        await apiClient(`/appointments/patient/${item.appointment_id}`);
      } catch (err) {
        // Solo un 404 real significa "la cita ya no existe". Cualquier otro error
        // (caída de red, timeout) no debe presumir que se eliminó.
        showError(err.status === 404
          ? "Esta cita ya no existe. Puede haber sido eliminada."
          : (err.message || "No se pudo abrir la cita."));
        return;
      }
      setOpen(false);
      navigate("/mis-citas");
    }
  };

  const deleteOne = async (event, item) => {
    event.stopPropagation();
    const confirmed = await confirmAction("¿Eliminar esta notificación? Se quitará de tu historial.", { confirmLabel: "Eliminar", danger: true });
    if (!confirmed) return;
    try {
      await apiClient(`/notifications/${item._id}`, { method: "DELETE" });
      setItems((current) => current.filter((n) => n._id !== item._id));
      if (!item.read) setUnread((current) => Math.max(0, current - 1));
    } catch { /* noop */ }
  };

  const clearAll = async () => {
    const confirmed = await confirmAction("¿Vaciar todas las notificaciones? Esta acción no se puede deshacer.", { confirmLabel: "Vaciar", danger: true });
    if (!confirmed) return;
    try {
      await apiClient("/notifications/all", { method: "DELETE" });
      setItems([]);
      setUnread(0);
    } catch { /* noop */ }
  };

  {/* Sin "relative" aquí a propósito: el dropdown de abajo se ancla así al
      contenedor relative del header (PatientPortalHeader), igual que el menú
      de cuenta, en vez de a este envoltorio angosto del botón de la campana.
      Si se queda relative aquí, en pantallas angostas el menú se desborda
      por la izquierda porque la campana no es el elemento más a la derecha
      del header. El badge de no leídas no depende de esto: se ancla al
      propio botón, que ya tiene su "relative". */}
  const badgeCount = unread + reminders.length;

  return <div>
    <button type="button" onClick={() => { setOpen((value) => !value); if (!open) load(); }} className="relative rounded-lg p-2 text-slate-600 transition hover:bg-slate-100" aria-label="Notificaciones">
      <Bell className="h-5 w-5" />
      {badgeCount > 0 && <span className="absolute right-1 top-1 min-w-4 rounded-full bg-red-500 px-1 text-[10px] font-bold leading-4 text-white">{badgeCount > 9 ? "9+" : badgeCount}</span>}
    </button>
    {open && <div className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
      {reminders.length > 0 && <div className="border-b border-slate-100">
        <p className="px-4 pt-3 pb-1 text-xs font-bold text-slate-400 uppercase tracking-wide">Recordatorios</p>
        <div className="max-h-48 overflow-y-auto pb-2">
          {reminders.map((r, i) => (
            <div key={i} className="px-4 py-2 hover:bg-slate-50 flex items-center gap-3">
              {r.type === "cita" ? (
                <CalendarDays className="h-4 w-4 text-blue-600 flex-shrink-0" />
              ) : (
                <Pill className="h-4 w-4 text-emerald-500 flex-shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-700 truncate">{r.label}</p>
                <p className="text-xs text-slate-400">{r.date}</p>
              </div>
            </div>
          ))}
        </div>
      </div>}
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <p className="text-sm font-bold text-slate-800">Notificaciones</p>
        <div className="flex items-center gap-3">
          {unread > 0 && <button type="button" onClick={markAllRead} className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"><CheckCheck className="h-3.5 w-3.5" />Marcar leídas</button>}
          {items.length > 0 && <button type="button" onClick={clearAll} className="inline-flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" />Vaciar todas</button>}
        </div>
      </div>
      <div className="max-h-80 overflow-y-auto">
        {items.length === 0 ? (
          <p className="p-5 text-center text-sm text-slate-400">No tienes notificaciones.</p>
        ) : (
          items.map((item) => (
            <div key={item._id} className={`group relative border-b border-slate-50 ${item.read ? "bg-white" : "bg-blue-50/50"}`}>
              <button type="button" onClick={() => openNotification(item)} className="w-full px-4 py-3 pr-10 text-left hover:bg-slate-50">
                <p className="text-sm text-slate-700">{item.message}</p>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <p className="text-[11px] text-slate-400">{timeLabel(item.createdAt)}</p>
                  {item.appointment_id && <span className="flex items-center gap-0.5 text-[11px] font-semibold text-blue-600">Ver cita <ChevronRight className="h-3 w-3" /></span>}
                </div>
              </button>
              <button
                type="button"
                onClick={(event) => deleteOne(event, item)}
                className="absolute right-2 top-2.5 rounded-lg p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-500"
                aria-label="Eliminar notificación"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>}
  </div>;
}
