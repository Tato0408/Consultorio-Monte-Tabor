import crypto from "crypto";
import Role from "../../models/role/role.js";
import RoleChangeLog from "../../models/roleChangeLog/roleChangeLog.js";
import { refreshRoleCache } from "../../services/roleCache.js";

const VALID_ACTIONS = ["view", "create", "update", "delete"];

export const getRoles = async (req, res) => {
    try {
        const roles = await Role.find({}).lean();
        res.json(roles);
    } catch (error) {
        console.log("Error al obtener roles: " + error);
        res.status(500).json({ message: "Error al obtener roles" });
    }
};

export const getRoleByKey = async (req, res) => {
    try {
        const role = await Role.findOne({ roleKey: req.params.roleKey }).lean();
        if (!role) {
            return res.status(404).json({ message: "Rol no encontrado" });
        }
        res.json(role);
    } catch (error) {
        console.log("Error al obtener el rol: " + error);
        res.status(500).json({ message: "Error al obtener el rol" });
    }
};

// body: { changes: [{ moduleKey, action, value }], batchId? }
// Registra un roleChangeLog por cada permiso individual que realmente cambia de valor.
export const updateRolePermissions = async (req, res) => {
    try {
        const { roleKey } = req.params;
        const { changes } = req.body;

        if (!Array.isArray(changes) || changes.length === 0) {
            return res.status(400).json({ message: "Se requiere un array 'changes' con al menos un cambio" });
        }

        const role = await Role.findOne({ roleKey });
        if (!role) {
            return res.status(404).json({ message: "Rol no encontrado" });
        }

        if (role.isProtected) {
            return res.status(403).json({ message: "Este rol esta protegido y no se puede modificar" });
        }

        const changedBy = req.user?.id || "unknown";
        const batchId = crypto.randomUUID();
        const logs = [];

        for (const change of changes) {
            const { moduleKey, action, value } = change;

            if (!moduleKey || !VALID_ACTIONS.includes(action) || typeof value !== "boolean") {
                return res.status(400).json({ message: `Cambio invalido: ${JSON.stringify(change)}` });
            }

            const permission = role.permissions.find((p) => p.moduleKey === moduleKey);
            if (!permission) {
                return res.status(400).json({ message: `moduleKey desconocido: ${moduleKey}` });
            }

            const previousValue = permission[action];
            if (previousValue === value) continue;

            permission[action] = value;

            logs.push({
                roleKey,
                moduleKey,
                action,
                previousValue,
                newValue: value,
                changedBy,
                batchId
            });
        }

        role.updatedBy = changedBy;
        await role.save();

        if (logs.length > 0) {
            await RoleChangeLog.insertMany(logs);
        }

        await refreshRoleCache();

        res.json(role);
    } catch (error) {
        console.log("Error al actualizar permisos: " + error);
        res.status(500).json({ message: "Error al actualizar permisos" });
    }
};
