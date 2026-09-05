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
// segundos (estándar JWT). No hace nada para tokens de staff.
export const renewPatientSessionIfStale = (res, decoded) => {
    if (decoded?.userType !== "patient" || !decoded.iat || !decoded.id) return;
    const ageMs = Date.now() - decoded.iat * 1000;
    if (ageMs < RENEW_AFTER_MS) return;
    setPatientSessionCookie(res, signPatientSessionToken(decoded.id));
};
