import { WebSocketServer } from "ws";
import jsonwebToken from "jsonwebtoken";
import { config } from "../../config.js";

// Canal WebSocket de tiempo real del panel privado. Atiende dos usos sobre
// la misma conexion autenticada por cookie de sesion:
//   1) Avisar a quien tiene un rol con sesion abierta que sus permisos
//      cambiaron, para que recargue y tome la matriz nueva sin esperar a un
//      403 (broadcastRoleUpdate).
//   2) Empujar a cada usuario sus notificaciones nuevas apenas se crean,
//      para que la campana se actualice sin recargar la pagina
//      (broadcastNotification).
const WS_PATH = "/ws/roles";

// Milisegundos entre cada ping de mantenimiento. Render (y varios proxys)
// cierran conexiones ociosas al minuto o dos, el ping las mantiene vivas.
const HEARTBEAT_MS = 30 * 1000;

let wss = null;

// Convierte el header "Cookie" (una sola cadena) en un objeto
// { nombre: valor }. No se usa cookie-parser acá porque el handshake del
// WebSocket no pasa por el stack de middlewares de Express.
function parseCookies(cookieHeader = "") {
    const cookies = {};
    for (const part of cookieHeader.split(";")) {
        const index = part.indexOf("=");
        if (index === -1) continue;
        const name = part.slice(0, index).trim();
        if (!name) continue;
        cookies[name] = decodeURIComponent(part.slice(index + 1).trim());
    }
    return cookies;
}

// Se llama una vez al arrancar, con el http.Server ya creado. Engancha el
// evento "upgrade" para autenticar el handshake con la misma cookie de
// sesión que usa el resto de la API antes de aceptar la conexión.
export function initRoleSocket(server) {
    wss = new WebSocketServer({ noServer: true });

    server.on("upgrade", (req, socket, head) => {
        // Cualquier upgrade que no sea el de este servicio se descarta, para
        // no quedarnos con sockets colgados de rutas que no atendemos.
        const requestPath = (req.url || "").split("?")[0];
        if (requestPath !== WS_PATH) {
            socket.destroy();
            return;
        }

        const token = parseCookies(req.headers.cookie).authCookie;
        if (!token) {
            socket.destroy();
            return;
        }

        let decoded;
        try {
            decoded = jsonwebToken.verify(token, config.JWT.secret);
        } catch {
            socket.destroy();
            return;
        }

        wss.handleUpgrade(req, socket, head, (ws) => {
            // roleKey del staff = userType del token (admin, doctor, nurse,
            // receptionist). Es lo que se compara al hacer broadcast.
            ws.roleKey = decoded.userType;
            ws.userId = decoded.id;
            wss.emit("connection", ws, req);
        });
    });

    wss.on("connection", (ws) => {
        ws.isAlive = true;
        ws.on("pong", () => {
            ws.isAlive = true;
        });
    });

    const heartbeat = setInterval(() => {
        for (const ws of wss.clients) {
            if (ws.isAlive === false) {
                ws.terminate();
                continue;
            }
            ws.isAlive = false;
            ws.ping();
        }
    }, HEARTBEAT_MS);

    // No debe impedir que el proceso termine si por algún motivo se cierra
    // el servidor.
    heartbeat.unref?.();
}

// Se llama justo después de refrescar la caché al guardar un cambio de
// permisos. Manda { type: "role-updated", roleKey } a cada cliente
// conectado cuyo rol sea el que cambió, para que su pestaña recargue.
export function broadcastRoleUpdate(roleKey) {
    if (!wss) return;
    const payload = JSON.stringify({ type: "role-updated", roleKey });
    for (const ws of wss.clients) {
        if (ws.readyState === ws.OPEN && ws.roleKey === roleKey) {
            ws.send(payload);
        }
    }
}

// Envía un mensaje arbitrario a todas las conexiones abiertas de un usuario
// puntual (mismo rol y mismo id de sesión). Nunca lanza: si no hay servidor
// o el envío falla, se ignora.
export function broadcastToUser(role, userId, message) {
    if (!wss) return;
    const targetId = String(userId);
    const payload = JSON.stringify(message);
    for (const ws of wss.clients) {
        if (ws.readyState === ws.OPEN && ws.roleKey === role && String(ws.userId) === targetId) {
            try {
                ws.send(payload);
            } catch {
                // El envío a un socket puntual no debe cortar el broadcast al resto.
            }
        }
    }
}

// Empuja una notificación recién creada a la campana del panel de su
// destinatario en tiempo real. El frontend la agrega a la lista sin recargar
// (ver useNotifications y el manejador del WebSocket en AuthContext).
export function broadcastNotification(notification) {
    if (!notification?.recipient_role || !notification?.recipient_id) return;
    broadcastToUser(notification.recipient_role, notification.recipient_id, {
        type: "notification",
        notification,
    });
}
