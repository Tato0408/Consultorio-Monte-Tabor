// Notificaciones nativas del sistema operativo (API Notification del navegador), además de
// la campana en tiempo real que ya existe: así el paciente se entera de una actualización de
// su cita aunque tenga la pestaña en segundo plano. Solo funciona mientras el navegador esté
// abierto (no es Push real con service worker, que exigiría claves VAPID y un backend propio
// para reenviar con la pestaña cerrada) — pedir permiso o mostrarla nunca debe romper nada si
// el navegador no lo soporta o el paciente lo rechaza.

export function requestNotificationPermission() {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "default") {
        Notification.requestPermission().catch(() => {});
    }
}

export function showBrowserNotification(notification) {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    try {
        const toast = new Notification(notification.title || "Notificación", {
            body: notification.message,
            icon: "/favicon.png",
            tag: notification._id, // evita duplicarla si llega dos veces (socket + poll de respaldo)
        });
        if (notification.action_url) {
            toast.onclick = () => {
                window.focus();
                window.location.href = notification.action_url;
            };
        }
    } catch {
        // Notification puede lanzar en contextos donde el navegador la bloquea (iframe,
        // permiso revocado a mitad de sesión, etc.) — no es crítico, la campana ya la muestra.
    }
}
