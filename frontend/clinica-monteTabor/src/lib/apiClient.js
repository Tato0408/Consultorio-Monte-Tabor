const API_URL = "http://localhost:4000/api";

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
    const response = await fetch(url, {
        method,
        credentials: "include", // Cookies de sesión
        headers: body instanceof FormData ? undefined : body ? { "Content-Type": "application/json" } : undefined,
        body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    });

    // Intentamos parsear JSON siempre, incluso en errores, porque la API devuelve { message: "..." } tanto en éxito como en fallos controlados.
    const data = await response.json().catch(() => null);

    if (!response.ok) {
        //Extrae el mensaje enviado del backend
        const message = data?.message || `Error ${response.status}`;
        throw new Error(message);
    }

    //Si la peticion fue exitosa retorna los datos parseados par autilizarlos como el endpoint
    return data;
}

export default apiClient;
