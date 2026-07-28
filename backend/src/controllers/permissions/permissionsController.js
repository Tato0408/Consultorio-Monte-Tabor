import { getRolePermissions } from "../../services/roleCache.js";

// Devuelve la matriz de permisos del rol del usuario autenticado (desde la cache en memoria).
export const getMyPermissions = (req, res) => {
    const roleKey = req.user?.role;
    if (!roleKey) {
        return res.status(403).json({ message: "No autenticado" });
    }

    res.json({
        roleKey,
        permissions: getRolePermissions(roleKey)
    });
};
