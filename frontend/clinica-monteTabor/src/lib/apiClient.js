const API_URL = "https://clinica-monte-tabor.onrender.com/api";
//URL en local de la api
//const API_URL = "http://localhost:4000/api";

// URL del WebSocket de tiempo real: mismo host que la API, con esquema
// ws/wss y sin el sufijo "/api". Se deriva de API_URL para que al cambiar
// de local a producción (arriba) el WebSocket siga al mismo servidor.
export const WS_URL = API_URL.replace(/^http/, "ws").replace(/\/api\/?$/, "") + "/ws/roles";

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
