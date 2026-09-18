// Orígenes web permitidos, compartidos entre el CORS de Express (app.js) y la validación
// del handshake del WebSocket (roleSocket.js) — antes cada uno tenía su propia copia
// implícita (roleSocket.js no validaba ninguna), con riesgo de que quedaran
// desincronizadas. El último dominio de Vercel necesita el esquema "https://" completo:
// el navegador siempre manda el Origin con esquema, así que sin él nunca calzaría con nada.
export const ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "https://clinica-monte-tabor.vercel.app",
    "https://clinica-monte-tabor-6h9mwf7j4-fvp1233s-projects.vercel.app",
    "https://clinica-monte-tabor-3guj.vercel.app",
    "https://clinica-monte-tabor-3guj-mtduj4uws-fvp1233s-projects.vercel.app",
];
