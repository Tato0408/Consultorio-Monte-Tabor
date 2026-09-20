// URL de la API en línea (Render). Se puede sobreescribir con EXPO_PUBLIC_API_URL
// (ej. para volver a apuntar a un backend local durante desarrollo)
const PRODUCTION_API_URL = "https://clinica-monte-tabor.onrender.com/api";

function getBaseUrl() {
    if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
    return PRODUCTION_API_URL;
}

// Se resuelve una sola vez al importar el módulo
export const API_URL = getBaseUrl();

// URL del WebSocket de tiempo real (mismo canal /ws/roles que ya usan el panel privado
// y el portal público): mismo host que la API, con esquema ws/wss y sin el sufijo "/api".
export const WS_URL = API_URL.replace(/^http/, "ws").replace(/\/api\/?$/, "") + "/ws/roles";

// __DEV__ es false en producción, así que esta traza no llega al build final
if (__DEV__) console.log("[API] URL base:", API_URL);