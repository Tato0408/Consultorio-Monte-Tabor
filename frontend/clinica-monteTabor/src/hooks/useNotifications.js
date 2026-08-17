import { useState, useEffect, useCallback } from "react";
import apiClient from "@/lib/apiClient";

const POLL_INTERVAL_MS = 15000;

// Notificaciones personales del usuario autenticado (doctor, paciente, etc.
// según el rol). No hay push en tiempo real: se refresca con un poll
// periódico y también apenas carga.
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

        return () => {
            clearInterval(interval);
            window.removeEventListener("focus", handleFocus);
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
