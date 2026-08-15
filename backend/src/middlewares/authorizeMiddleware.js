import { getModulePermission } from "../services/roleCache.js";

// Requiere ejecutarse después de authenticate (necesita req.user.role).
// Resuelve contra la caché en memoria, nunca consulta la base de datos
// por request.
export const authorize = (moduleKey, accion) => {
    return (req, res, next) => {
        const role = req.user?.role;
        if (!role) {
            return res.status(403).json({ message: "No autenticado" });
        }

        const permission = getModulePermission(role, moduleKey);

        if (!permission || !permission[accion]) {
            return res.status(403).json({ message: "Acceso denegado" });
        }

        next();
    };
};
