import jsonwebtoken from "jsonwebtoken";
import { config } from "../../config.js";

// Sesión del portal público del paciente: deslizante de 30 días (igual que la sesión
// "escondida" que ya deja registrarse, ver signPatientToken en patientSelfController.js).
// Se emite un token y authenticateMiddleware lo renueva en cada request del paciente
// mientras siga activo, así que en la práctica no expira con uso normal: solo si el
// paciente pasa 30 días SEGUIDOS sin abrir la app tendrá que loguearse de nuevo. Antes
// era de 2 h, y aunque se renovaba con actividad, cualquier falla en enterarse de esa
// renovación (sobre todo en el móvil, sin cookie jar) sacaba al paciente de la sesión en
// pleno uso — la única forma real de cerrar la sesión debería ser el botón de logout.
export const PATIENT_SESSION_TTL = "30d";
export const PATIENT_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

// Solo se re-emite la cookie/token si ya le pasó al menos un día de vida, para no mandar
// un Set-Cookie (y en el móvil, un X-Renewed-Token) en absolutamente cada request.
const RENEW_AFTER_MS = 24 * 60 * 60 * 1000;

const COOKIE_OPTIONS = {
    maxAge: PATIENT_SESSION_TTL_MS,
    httpOnly: true,
    secure: true,
    sameSite: "none",
};

export const signPatientSessionToken = (patientId) =>
    jsonwebtoken.sign({ id: patientId, userType: "patient" }, config.JWT.secret, { expiresIn: PATIENT_SESSION_TTL });

export const setPatientSessionCookie = (res, token) => {
    res.cookie("authCookie", token, COOKIE_OPTIONS);
};

// Renueva la ventana de 30 días si el token del paciente ya tiene al menos un día de vida.
// decoded.iat viene en segundos (estándar JWT). No hace nada para tokens de staff. Devuelve
// el token nuevo (o null si no renovó), además de dejarlo en la cookie: la web lo aprovecha
// solo con la cookie porque el navegador la reenvía sola, pero la app móvil no tiene cookie
// jar (usa Authorization: Bearer guardado en SecureStore) y necesita leer el token renovado
// de otro lado — ver el header X-Renewed-Token en authenticateMiddleware.js/apiClient.js.
export const renewPatientSessionIfStale = (res, decoded) => {
    if (decoded?.userType !== "patient" || !decoded.iat || !decoded.id) return null;
    const ageMs = Date.now() - decoded.iat * 1000;
    if (ageMs < RENEW_AFTER_MS) return null;
    const newToken = signPatientSessionToken(decoded.id);
    setPatientSessionCookie(res, newToken);
    return newToken;
};
