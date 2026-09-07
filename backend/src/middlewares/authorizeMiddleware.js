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

// Verifica que el rol tenga TODAS las combinaciones [moduleKey, accion]
// indicadas. Se usa cuando una operacion depende de mas de un permiso a la
// vez, por ejemplo editar una consulta ya registrada exige tanto crear como
// actualizar en el modulo de consultas.
export const authorizeAll = (...pairs) => {
    return (req, res, next) => {
        const role = req.user?.role;
        if (!role) {
            return res.status(403).json({ message: "No autenticado" });
        }

        for (const [moduleKey, accion] of pairs) {
            const permission = getModulePermission(role, moduleKey);
            if (!permission || !permission[accion]) {
                return res.status(403).json({ message: "Acceso denegado" });
            }
        }

        next();
    };
};

// Verifica que el rol tenga AL MENOS UNA de las combinaciones
// [moduleKey, accion] indicadas. Se usa cuando un mismo endpoint lo comparten
// dos modulos, por ejemplo actualizar un paciente desde la gestion de
// usuarios o desde su expediente clinico.
export const authorizeAny = (...pairs) => {
    return (req, res, next) => {
        const role = req.user?.role;
        if (!role) {
            return res.status(403).json({ message: "No autenticado" });
        }

        for (const [moduleKey, accion] of pairs) {
            const permission = getModulePermission(role, moduleKey);
            if (permission && permission[accion]) {
                return next();
            }
        }

        return res.status(403).json({ message: "Acceso denegado" });
    };
};
