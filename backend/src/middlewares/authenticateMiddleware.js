import jsonwebToken from "jsonwebtoken";
import { config } from "../../config.js";

// Valida la cookie de sesion y expone req.user = { id, role }, sin validar rol.
// La autorizacion por rol/moduleKey se resuelve aparte en authorize().
export const authenticate = (req, res, next) => {
    try {
        // La web manda el token por cookie; la app móvil no tiene cookie jar y lo manda como
        // "Authorization: Bearer <token>" — se acepta cualquiera de las dos
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
                .json({ message: "No cookie found, Authorization required" });
        }

        const decoded = jsonwebToken.verify(token, config.JWT.secret);

        req.user = { id: decoded.id, role: decoded.userType };

        next();
    } catch (error) {
        console.log("error" + error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
