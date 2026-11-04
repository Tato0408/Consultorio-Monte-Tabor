// URL del backend local (incluye el prefijo /api). Se puede cambiar con VITE_API_URL en
// un archivo .env.local (ver .env.example), por ejemplo para usar la IP de la PC en la red.
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";

// URL del WebSocket de tiempo real (mismo canal que usa el panel privado,
// ver AuthContext.jsx allá y roleSocket.js en el backend): mismo host que la API,
// con esquema ws y sin el sufijo "/api".
export const WS_URL = API_URL.replace(/^http/, "ws").replace(/\/api\/?$/, "") + "/ws/roles";

async function apiClient(path, { method = "GET", body, params, signal } = {}) {
    //Construimos la url de la peticion enviando primero la url y segundo el endpoint que queremos
    let url = `${API_URL}${path}`;

    if (params) {
        // Filtramos undefined/null/"" para no mandar query params vacíos a la API
        const cleanParams = Object.fromEntries(
            Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== "")
        );
        // Transformamos el objeto limpio en una cadena de texto en formato clave=valor (ej: ?rol=admin&estado=activo)
        const searchParams = new URLSearchParams(cleanParams);
        const queryString = searchParams.toString();
        // Si resultaron parámetros válidos tras la limpieza, los concatenamos a la URL con un signo de interrogación
        if (queryString) url += `?${queryString}`;
    }

    //Ejecucion del fetch nativo
    let response;
    try {
        response = await fetch(url, {
            method,
            credentials: "include", // Cookies de sesión
            headers: body instanceof FormData ? undefined : body ? { "Content-Type": "application/json" } : undefined,
            body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
            signal,
        });
    } catch (err) {
        // Cancelación intencional (ej. al desmontar): se propaga tal cual.
        if (err?.name === "AbortError") throw err;
        // Falla de red real (servidor caído, reiniciándose, sin conexión). NO lleva
        // .status: AuthContext se apoya en eso para NO cerrar la sesión por un bache.
        const netError = new Error("No se pudo conectar con el servidor. Revisa tu conexión.");
        netError.network = true;
        throw netError;
    }

    // Intentamos parsear JSON siempre, incluso en errores, porque la API devuelve { message: "..." } tanto en éxito como en fallos controlados.
    const data = await response.json().catch(() => null);

    // 401 en este backend siempre significa lo mismo: la cookie de sesión es válida pero
    // no corresponde a un paciente (ver validateAuthCookie en el backend). Pasa, por
    // ejemplo, cuando en el mismo navegador se inicia sesión en el panel privado
    // (admin/doctor/etc.) mientras seguía abierta una pestaña del portal público: ambos
    // sitios comparten la misma cookie por dominio (sin importar el puerto en
    // localhost), así que la sesión de staff termina reemplazando a la del paciente a
    // media navegación. Se limpia la sesión local para que el resto del sitio deje de
    // comportarse como si siguiera logueado con una identidad que el servidor ya no
    // reconoce como paciente.
    if (!response.ok) {
        // 401 = la cookie de sesión expiró o ya no es válida. Se avisa por evento global
        // (en vez de importar AuthContext aquí, para no acoplar este cliente HTTP genérico
        // a React) para que AuthContext cierre la sesión y ProtectedRoute redirija a
        // /login solo si había una sesión activa (evita disparar esto en /login mismo
        // cuando el intento de inicio de sesión falla por credenciales inválidas).
        if (response.status === 401) {
            window.dispatchEvent(new Event("session-expired"));
        }
        //Extrae el mensaje enviado del backend
        const message = response.status === 401
            ? "Tu sesión ya no es válida. Inicia sesión de nuevo."
            : data?.message || `Error ${response.status}`;
        const error = new Error(message);
        error.status = response.status;
        throw error;
    }

    //Si la peticion fue exitosa retorna los datos parseados para utilizarlos como el endpoint
    return data;
}

export default apiClient;
