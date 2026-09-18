import jsonwebtoken from "jsonwebtoken";
import { config } from "../../config.js";

// Sesión del portal público del paciente: deslizante de 2 horas.
// Se emite un token corto y authenticateMiddleware lo renueva en cada request del paciente
// mientras siga activo. Tras 2 h sin actividad, el token expira y el siguiente request da 401.
export const PATIENT_SESSION_TTL = "2h";
export const PATIENT_SESSION_TTL_MS = 2 * 60 * 60 * 1000;

// Solo se re-emite la cookie si al token ya le pasaron más de 15 min de vida, para no
// mandar un Set-Cookie en absolutamente cada request.
const RENEW_AFTER_MS = 15 * 60 * 1000;

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

// Renueva la ventana de 2 h si el token del paciente ya tiene rato. decoded.iat viene en
// segundos (estándar JWT). No hace nada para tokens de staff. Devuelve el token nuevo (o
// null si no renovó), además de dejarlo en la cookie: la web lo aprovecha solo con la
// cookie porque el navegador la reenvía sola, pero la app móvil no tiene cookie jar (usa
// Authorization: Bearer guardado en SecureStore) y nunca leía ni actualizaba ese token
// tras el login inicial — sin el valor de vuelta en algún lado que el móvil pueda leer,
// su sesión expiraba siempre a las 2h exactas del login sin importar qué tan activo
// estuviera usando la app, mientras la web se mantenía indefinidamente con uso continuo.
export const renewPatientSessionIfStale = (res, decoded) => {
    if (decoded?.userType !== "patient" || !decoded.iat || !decoded.id) return null;
    const ageMs = Date.now() - decoded.iat * 1000;
    if (ageMs < RENEW_AFTER_MS) return null;
    const newToken = signPatientSessionToken(decoded.id);
    setPatientSessionCookie(res, newToken);
    return newToken;
};
