import { useEffect, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import apiClient from "@/lib/apiClient";

const timeLabel = (value) => new Date(value).toLocaleDateString("es-SV", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export default function NotificationsMenu() {
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
    const timer = window.setInterval(load, 30000);
    return () => window.clearInterval(timer);
  }, []);

  const markAllRead = async () => {
    try { await apiClient("/notifications/read-all", { method: "PATCH" }); await load(); } catch { /* noop */ }
  };

  {/* Sin "relative" aquí a propósito: el dropdown de abajo se ancla así al
      contenedor relative del header (PatientPortalHeader), igual que el menú
      de cuenta, en vez de a este envoltorio angosto del botón de la campana.
      Si se queda relative aquí, en pantallas angostas el menú se desborda
      por la izquierda porque la campana no es el elemento más a la derecha
      del header. El badge de no leídas no depende de esto: se ancla al
      propio botón, que ya tiene su "relative". */}
  return <div>
    <button type="button" onClick={() => { setOpen((value) => !value); if (!open) load(); }} className="relative rounded-lg p-2 text-slate-600 transition hover:bg-slate-100" aria-label="Notificaciones">
      <Bell className="h-5 w-5" />
      {unread > 0 && <span className="absolute right-1 top-1 min-w-4 rounded-full bg-red-500 px-1 text-[10px] font-bold leading-4 text-white">{unread > 9 ? "9+" : unread}</span>}
    </button>
    {open && <div className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><p className="text-sm font-bold text-slate-800">Notificaciones</p>{unread > 0 && <button type="button" onClick={markAllRead} className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"><CheckCheck className="h-3.5 w-3.5" />Marcar leídas</button>}</div>
      <div className="max-h-80 overflow-y-auto">{items.length === 0 ? <p className="p-5 text-center text-sm text-slate-400">No tienes notificaciones.</p> : items.map((item) => <div key={item._id} className={`border-b border-slate-50 px-4 py-3 ${item.read ? "bg-white" : "bg-blue-50/50"}`}><p className="text-sm text-slate-700">{item.message}</p><p className="mt-1 text-[11px] text-slate-400">{timeLabel(item.createdAt)}</p></div>)}</div>
    </div>}
  </div>;
}
