import jsonwebToken from "jsonwebtoken";
import { config } from "../../config.js";

// Valida la cookie de sesion y expone req.user = { id, role }, sin validar rol.
// La autorizacion por rol/moduleKey se resuelve aparte en authorize().
export const authenticate = (req, res, next) => {
    try {
        const { authCookie } = req.cookies;
        if (!authCookie) {
            return res
                .status(403)
                .json({ message: "No cookie found, Authorization required" });
        }

        const decoded = jsonwebToken.verify(authCookie, config.JWT.secret);

        req.user = { id: decoded.id, role: decoded.userType };

        next();
    } catch (error) {
        console.log("error" + error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
