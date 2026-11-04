import "../../config.js"; // carga el .env antes de leer EXTRA_ALLOWED_ORIGINS
// Orígenes web permitidos, compartidos entre el CORS de Express (app.js) y la validación
// del handshake del WebSocket (roleSocket.js). El sistema corre en local: el panel
// privado y el portal público se sirven con Vite en estos puertos. Se pueden agregar
// más orígenes (ej. la IP de la PC en la red local) con EXTRA_ALLOWED_ORIGINS en el
// .env, separados por coma. El navegador siempre manda el Origin con esquema, así que
// cada valor debe llevar "http://".
const LOCAL_PORTS = [5173, 5174, 5175];

export const ALLOWED_ORIGINS = [
    ...LOCAL_PORTS.map((port) => `http://localhost:${port}`),
    ...LOCAL_PORTS.map((port) => `http://127.0.0.1:${port}`),
    ...(process.env.EXTRA_ALLOWED_ORIGINS || "")
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
];
