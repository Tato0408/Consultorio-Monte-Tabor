// En producción se llama a "/api" en el MISMO dominio de Vercel; vercel.json lo redirige
// (proxy inverso) al backend de Render. Es mismo-origen a propósito: así la cookie de
// sesión queda de primera parte y Chrome en incógnito / Safari-iOS la aceptan (cross-site
// la bloquean, ver el 403 "No se encontró la cookie de sesión" que daba antes yendo
// directo a onrender.com). En desarrollo se apunta directo al backend de Render (incluye
// el prefijo /api) — cambia a "http://localhost:4000/api" si corres el backend local.
const API_URL = import.meta.env.DEV ? "https://clinica-monte-tabor.onrender.com/api" : "/api";

// URL del WebSocket de tiempo real (mismo canal que usa el portal público, ver
// AuthContext.jsx allá y roleSocket.js en el backend). A diferencia de las peticiones
// REST, esta SIEMPRE apunta directo a Render, nunca al mismo origen de Vercel: el
// rewrite de vercel.json solo hace proxy de HTTP, no sabe hacer el upgrade a WebSocket.
// Por eso el socket se autentica con un boleto de corta duración (?token=, ver
// getWsTicket en el backend) en vez de depender de que la cookie viaje cross-site.
export const WS_URL = import.meta.env.DEV
    ? "ws://localhost:4000/ws/roles"
    : "wss://clinica-monte-tabor.onrender.com/ws/roles";

async function apiClient(path, { method = "GET", body, params, signal } = {}) {
    // Arma la URL de la petición combinando la URL base y el endpoint recibido.
    let url = `${API_URL}${path}`;

    if (params) {
        // Descarta los valores undefined, null o vacíos para no enviar
        // parámetros de consulta vacíos a la API.
        const cleanParams = Object.fromEntries(
            Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== "")
        );
        // Convierte el objeto limpio en una cadena de texto con formato
        // clave=valor (ej: ?rol=admin&estado=activo).
        const searchParams = new URLSearchParams(cleanParams);
        const queryString = searchParams.toString();
        // Si quedaron parámetros válidos tras la limpieza, los concatena a la URL.
        if (queryString) url += `?${queryString}`;
    }

    // Ejecuta la petición con fetch nativo.
    const response = await fetch(url, {
        method,
        // Envía la cookie de sesión con la petición.
        credentials: "include",
        signal,
        headers: body instanceof FormData ? undefined : body ? { "Content-Type": "application/json" } : undefined,
        body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    });

    // Intenta parsear la respuesta como JSON siempre, incluso en errores,
    // porque la API devuelve { message: "..." } tanto en éxito como en
    // fallos controlados.
    const data = await response.json().catch(() => null);

    if (!response.ok) {
        // Extrae el mensaje enviado por el backend.
        const message = data?.message || `Error ${response.status}`;
        const error = new Error(message);
        // Expone el status para que quien llame pueda distinguir casos
        // puntuales (ej. código 403 para cuenta desactivada) sin depender
        // del texto exacto del mensaje.
        error.status = response.status;
        // Adjunta el cuerpo completo de la respuesta de error para que quien
        // llame pueda leer campos extra que manda el backend (ej. un código
        // de error y datos de contexto), no solo el mensaje.
        error.data = data;
        throw error;
    }

    // Si la petición fue exitosa, retorna los datos ya parseados.
    return data;
}

export default apiClient;
