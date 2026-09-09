import { useState } from "react";
import { Bell, CalendarCheck2, CalendarClock, CalendarX2, ChevronRight, ClipboardList, PackageX, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
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

const notificationIcon = (type) => {
    if (type === "appointment_cancelled" || type === "appointment_deleted" || type === "appointment_expired") {
        return <CalendarX2 className="w-4 h-4" />;
    }
    if (type === "appointment_accepted" || type === "appointment_assigned") {
        return <CalendarCheck2 className="w-4 h-4" />;
    }
    if (type === "inventory_alert") return <PackageX className="w-4 h-4" />;
    if (type === "nurse_note_pending") return <ClipboardList className="w-4 h-4" />;
    return <CalendarClock className="w-4 h-4" />;
};

// Campana de notificaciones del header. useNotifications recibe las
// notificaciones nuevas en tiempo real por WebSocket y mantiene un poll de
// respaldo por si el socket se cae.
export default function NotificationBell() {
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();
    const {
        notifications,
        unreadCount,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        deleteAllNotifications,
    } = useNotifications();

    const handleOpen = async () => {
        const nextOpen = !open;
        setOpen(nextOpen);
        if (nextOpen) {
            // Se consulta antes de marcar como leídas para incluir cualquier
            // notificación creada desde el último ciclo del polling.
            await fetchNotifications();
            await markAllAsRead();
        }
    };

    const handleNotificationClick = async (notification) => {
        if (!notification.read) await markAsRead(notification._id);
        if (notification.action_url) {
            setOpen(false);
            navigate(notification.action_url);
        }
    };

    const handleDeleteAll = async () => {
        const result = await Swal.fire({
            title: "¿Vaciar notificaciones?",
            text: "Se eliminará todo el historial de notificaciones.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Sí, vaciar",
            cancelButtonText: "Cancelar",
            confirmButtonColor: "#ef4444",
            cancelButtonColor: "#94a3b8",
        });

        if (result.isConfirmed) await deleteAllNotifications();
    };

    return (
        <div className="relative">
            <button
                type="button"
                onClick={handleOpen}
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
                    <div className="absolute right-0 mt-2 w-[min(24rem,calc(100vw-2rem))] max-h-[30rem] overflow-y-auto bg-white rounded-2xl border border-slate-100 shadow-xl z-50">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                            <div>
                                <p className="text-sm font-semibold text-slate-800">Notificaciones</p>
                                <p className="text-[10px] text-slate-400">Se marcan como leídas al abrir</p>
                            </div>
                            {notifications.length > 0 && (
                                <button
                                    type="button"
                                    onClick={handleDeleteAll}
                                    className="flex items-center gap-1 text-xs font-medium text-rose-500 hover:text-rose-600"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Vaciar todas
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
                                    <li key={n._id} className="group relative border-b border-slate-50 last:border-b-0">
                                        <button
                                            type="button"
                                            onClick={() => handleNotificationClick(n)}
                                            className={`w-full text-left py-3 pl-4 pr-12 transition-colors ${n.read ? "bg-white hover:bg-slate-50" : "bg-blue-50/50 hover:bg-blue-50"
                                                }`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${n.read ? "bg-slate-100 text-slate-500" : "bg-blue-100 text-blue-600"}`}>
                                                    {notificationIcon(n.type)}
                                                </span>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <p className="text-sm font-semibold text-slate-800 leading-snug">
                                                            {n.title || "Notificación"}
                                                        </p>
                                                        {!n.read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-500" />}
                                                    </div>
                                                    <p className="mt-1 text-xs text-slate-600 leading-relaxed">{n.message}</p>
                                                    <div className="mt-2 flex items-center justify-between gap-2">
                                                        <p className="text-[10px] text-slate-400">{timeAgo(n.createdAt)}</p>
                                                        {n.action_url && (
                                                            <span className="flex items-center gap-0.5 text-[11px] font-semibold text-blue-600">
                                                                Ver detalle <ChevronRight className="h-3 w-3" />
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </button>
                                        {/* Siempre visible (sin depender de hover): en touch/trackpad el hover
                                            no siempre se activa antes del tap, así que un botón que solo
                                            aparece con :hover puede parecer que "no funciona". */}
                                        <button
                                            type="button"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                deleteNotification(n._id);
                                            }}
                                            className="absolute right-3 top-3 rounded-lg p-2 text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-500"
                                            aria-label={`Eliminar notificación: ${n.title || "Notificación"}`}
                                            title="Eliminar notificación"
                                        >
                                            <Trash2 className="h-4 w-4" />
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
