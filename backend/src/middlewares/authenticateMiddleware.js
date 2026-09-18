import jsonwebToken from "jsonwebtoken";
import { config } from "../../config.js";
import { renewPatientSessionIfStale } from "../utils/patientSession.js";

// Único middleware de sesión del backend: antes coexistían authenticate
// (sin restricción de rol, req.user = { id, role }) y validateAuthCookie
// (factory con allowedTypes, req.user = decoded, con .userType en vez de
// .role) en rutas hermanas del mismo recurso. Un controller escrito
// asumiendo una de las dos formas fallaba el chequeo de rol en silencio
// detrás del middleware que producía la otra forma. authenticate() fusiona
// ambos: siempre acepta una lista opcional de allowedTypes, y expone tanto
// .role como .userType (mismo valor) para no romper a ningún consumidor
// existente.
export const authenticate = (allowedTypes = []) => {
    return (req, res, next) => {
        try {
            // La web manda el token por cookie, la app móvil no tiene cookie jar
            // y lo manda como "Authorization: Bearer <token>". Se acepta
            // cualquiera de los dos formatos.
            let token = req.cookies?.authCookie;
            if (!token) {
                const authHeader = req.headers.authorization;
                if (authHeader?.startsWith("Bearer ")) {
                    token = authHeader.slice(7);
                }
            }

            if (!token) {
                return res
                    .status(403)
                    .json({ message: "No se encontró la cookie de sesión, se requiere autorización" });
            }

            let decoded;
            try {
                decoded = jsonwebToken.verify(token, config.JWT.secret);
            } catch (verifyError) {
                // Un token vencido o inválido no es una falla real del servidor,
                // así que se responde 401 (no 500) para que el cliente pueda
                // distinguirlo y cerrar la sesión automáticamente.
                if (verifyError.name === "TokenExpiredError") {
                    return res.status(401).json({ message: "Tu sesión expiró, inicia sesión de nuevo." });
                }
                return res.status(401).json({ message: "Sesión inválida, inicia sesión de nuevo." });
            }

            if (allowedTypes.length > 0 && !allowedTypes.includes(decoded.userType)) {
                return res.status(401).json({ message: "Acceso denegado" });
            }

            // Sesión deslizante del portal público: cada request de un paciente con sesión
            // activa renueva su ventana de 2 h. No afecta a las sesiones de staff. La web
            // se beneficia solo con la cookie (el navegador la reenvía sola), pero la app
            // móvil no tiene cookie jar (usa Authorization: Bearer guardado en
            // SecureStore) y nunca tenía forma de enterarse del token renovado — su sesión
            // expiraba siempre a las 2h exactas del login sin importar la actividad. Se
            // expone también en un header propio para que cualquier cliente sin cookie
            // jar (el móvil) pueda leerlo y actualizar lo que tenga guardado.
            const renewedToken = renewPatientSessionIfStale(res, decoded);
            if (renewedToken) res.set("X-Renewed-Token", renewedToken);

            req.user = { ...decoded, id: decoded.id, role: decoded.userType, userType: decoded.userType };

            next();
        } catch (error) {
            console.log("error" + error);
            return res.status(500).json({ message: "Error interno del servidor" });
        }
    };
};
