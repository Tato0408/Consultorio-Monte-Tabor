// Pequeño pub-sub para que una notificación empujada por WebSocket (ver el efecto de
// conexión en AuthContext.jsx) llegue al instante a cualquier pantalla suscrita
// (NotificationBell, NotificationsScreen), sin recargar ni reiniciar nada: solo se
// actualiza el estado en memoria de quien esté escuchando, igual que en cualquier app
// nativa normal.
const listeners = new Set();

export function onNotificationPushed(callback) {
    listeners.add(callback);
    return () => listeners.delete(callback);
}

export function emitNotificationPushed(notification) {
    listeners.forEach((callback) => callback(notification));
}
