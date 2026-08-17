import { useState } from "react";
import { Bell } from "lucide-react";
import useNotifications from "@/hooks/useNotifications";

// Convierte una fecha ISO en un texto relativo corto ("hace 5 min").
const timeAgo = (dateStr) => {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "ahora mismo";
    if (mins < 60) return `hace ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `hace ${hours} h`;
    const days = Math.floor(hours / 24);
    return `hace ${days} d`;
};

// Campana de notificaciones del header. No hay push en tiempo real:
// useNotifications refresca con un poll periódico.
export default function NotificationBell() {
    const [open, setOpen] = useState(false);
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="relative p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
                aria-label="Notificaciones"
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <>
                    {/* Fondo invisible para cerrar el panel al hacer clic afuera. */}
                    <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                    <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-white rounded-2xl border border-slate-100 shadow-xl z-50">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                            <span className="text-sm font-semibold text-slate-800">Notificaciones</span>
                            {unreadCount > 0 && (
                                <button
                                    type="button"
                                    onClick={markAllAsRead}
                                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                                >
                                    Marcar todas como leídas
                                </button>
                            )}
                        </div>

                        {notifications.length === 0 ? (
                            <p className="text-sm text-slate-400 text-center py-8 px-4">
                                No tienes notificaciones.
                            </p>
                        ) : (
                            <ul>
                                {notifications.map((n) => (
                                    <li key={n._id}>
                                        <button
                                            type="button"
                                            onClick={() => !n.read && markAsRead(n._id)}
                                            className={`w-full text-left px-4 py-3 border-b border-slate-50 last:border-b-0 transition-colors ${n.read ? "bg-white" : "bg-blue-50/50 hover:bg-blue-50"
                                                }`}
                                        >
                                            <p className="text-sm text-slate-700 leading-snug">{n.message}</p>
                                            <p className="text-[10px] text-slate-400 mt-1">{timeAgo(n.createdAt)}</p>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
