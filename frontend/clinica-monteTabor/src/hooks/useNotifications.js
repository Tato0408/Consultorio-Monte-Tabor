import { useState, useEffect, useCallback } from "react";
import apiClient from "@/lib/apiClient";

// El WebSocket empuja cada notificación nueva al instante (ver AuthContext y
// el evento "app:notification"). El poll queda como respaldo para recoger lo
// que se haya perdido mientras el socket estuvo caído (o si un proxy bloquea
// el WebSocket), por eso su intervalo es más holgado que antes.
const POLL_INTERVAL_MS = 30000;

// Máximo de notificaciones que se mantienen en memoria, igual que el límite
// que devuelve el backend en /notifications/me.
const MAX_NOTIFICATIONS = 20;

// Notificaciones personales del usuario autenticado (doctor, paciente, etc.
// según el rol). Se cargan al montar, se refrescan con un poll de respaldo y
// se actualizan en tiempo real por WebSocket sin recargar la página.
const useNotifications = () => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    const fetchNotifications = useCallback(async () => {
        try {
            const response = await apiClient("/notifications/me");
            setNotifications(response.data);
            setUnreadCount(response.unreadCount);
        } catch (error) {
            console.error("Error loading notifications:", error);
        }
    }, []);

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, POLL_INTERVAL_MS);

        // Se actualiza inmediatamente al regresar a la pestaña del sistema.
        const handleFocus = () => fetchNotifications();
        window.addEventListener("focus", handleFocus);

        // Notificación empujada por el WebSocket: se agrega al principio de la
        // lista sin volver a pedirla al backend. Se ignora si ya está en la
        // lista (el poll de respaldo pudo haberla traído antes).
        const handlePushed = (event) => {
            const incoming = event.detail;
            if (!incoming?._id) return;

            // La notificación de notas de enfermería pendientes es consolidada:
            // el backend mantiene una sola por enfermera y la reemplaza al
            // recalcular. En la campana se quita la anterior del mismo tipo y
            // se resincroniza el conteo con el backend, que es la fuente de
            // verdad de esa notificación.
            if (incoming.type === "nurse_note_pending") {
                setNotifications((prev) =>
                    [incoming, ...prev.filter((n) => n.type !== "nurse_note_pending")].slice(0, MAX_NOTIFICATIONS)
                );
                fetchNotifications();
                return;
            }

            setNotifications((prev) => {
                if (prev.some((n) => n._id === incoming._id)) return prev;
                return [incoming, ...prev].slice(0, MAX_NOTIFICATIONS);
            });
            if (!incoming.read) {
                setUnreadCount((prev) => prev + 1);
            }
        };
        window.addEventListener("app:notification", handlePushed);

        return () => {
            clearInterval(interval);
            window.removeEventListener("focus", handleFocus);
            window.removeEventListener("app:notification", handlePushed);
        };
    }, [fetchNotifications]);

    const markAsRead = useCallback(async (id) => {
        try {
            await apiClient(`/notifications/${id}/read`, { method: "PATCH" });
            setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
            setUnreadCount((prev) => Math.max(prev - 1, 0));
        } catch (error) {
            console.error("Error marking notification as read:", error);
        }
    }, []);

    const markAllAsRead = useCallback(async () => {
        try {
            await apiClient("/notifications/read-all", { method: "PATCH" });
            setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error("Error marking all notifications as read:", error);
        }
    }, []);

    const deleteNotification = useCallback(async (id) => {
        try {
            const response = await apiClient(`/notifications/${id}`, { method: "DELETE" });
            setNotifications((prev) => prev.filter((notification) => notification._id !== id));
            if (response.data && !response.data.read) {
                setUnreadCount((count) => Math.max(count - 1, 0));
            }
            return true;
        } catch (error) {
            console.error("Error deleting notification:", error);
            return false;
        }
    }, []);

    const deleteAllNotifications = useCallback(async () => {
        try {
            await apiClient("/notifications/all", { method: "DELETE" });
            setNotifications([]);
            setUnreadCount(0);
            return true;
        } catch (error) {
            console.error("Error deleting notifications:", error);
            return false;
        }
    }, []);

    return {
        notifications,
        unreadCount,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        deleteAllNotifications,
    };
};

export default useNotifications;
