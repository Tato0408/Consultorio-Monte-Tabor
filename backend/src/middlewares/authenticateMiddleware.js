import jsonwebToken from "jsonwebtoken";
import { config } from "../../config.js";

// Valida la cookie de sesión y expone req.user = { id, role }, sin validar
// el rol. La autorización por rol o por moduleKey se resuelve aparte, en
// authorize().
export const authenticate = (req, res, next) => {
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
            // Igual que validateAuthCookie: un token vencido o inválido no es una
            // falla real del servidor, así que se responde 401 (no 500) para que
            // el cliente pueda distinguirlo y cerrar la sesión automáticamente.
            if (verifyError.name === "TokenExpiredError") {
                return res.status(401).json({ message: "Tu sesión expiró, inicia sesión de nuevo." });
            }
            return res.status(401).json({ message: "Sesión inválida, inicia sesión de nuevo." });
        }

        req.user = { id: decoded.id, role: decoded.userType };

        next();
    } catch (error) {
        console.log("error" + error);
        return res.status(500).json({ message: "Error interno del servidor" });
    }
};
