import crypto from "crypto";
import Role from "../../models/role/role.js";
import RoleChangeLog from "../../models/roleChangeLog/roleChangeLog.js";
import { refreshRoleCache } from "../../services/roleCache.js";

const VALID_ACTIONS = ["view", "create", "update", "delete"];

// Permisos que, para ciertos roles, el propio dashboard de ese rol necesita en true para
// funcionar (ej. el recepcionista no puede agendar citas si le apagan "ver horarios" o
// "crear pacientes" — su propio panel principal quedaría roto). A diferencia de isProtected
// (que bloquea TODO el rol, como admin), esto solo bloquea esos permisos puntuales; el resto
// del rol se sigue pudiendo editar con normalidad.
const LOCKED_TRUE_PERMISSIONS = {
    receptionist: {
        "calendar.schedule": ["view"],
        "calendar.appointments": ["view", "create", "update"],
        "users.patients": ["view", "create"],
    },
    nurse: {
        "calendar.schedule": ["view"],
        "calendar.appointments": ["view", "create", "update"],
        // La enfermera no tiene registro rápido de pacientes (a diferencia de recepción), así
        // que solo necesita poder ver el listado para buscar un paciente al agendar una cita.
        "users.patients": ["view"],
    },
};

const isLockedTrue = (roleKey, moduleKey, action) =>
    !!LOCKED_TRUE_PERMISSIONS[roleKey]?.[moduleKey]?.includes(action);

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
        // moduleKey de cada permiso tocado en este batch — se revisan todos al final (ver abajo).
        const touchedModuleKeys = new Set();

        for (const change of changes) {
            const { moduleKey, action, value } = change;

            if (!moduleKey || !VALID_ACTIONS.includes(action) || typeof value !== "boolean") {
                return res.status(400).json({ message: `Cambio invalido: ${JSON.stringify(change)}` });
            }

            if (value === false && isLockedTrue(roleKey, moduleKey, action)) {
                return res.status(400).json({
                    message: `El permiso "${action}" de "${moduleKey}" es necesario para que el dashboard de este rol funcione y no se puede desactivar`,
                });
            }

            const permission = role.permissions.find((p) => p.moduleKey === moduleKey);
            if (!permission) {
                return res.status(400).json({ message: `moduleKey desconocido: ${moduleKey}` });
            }

            touchedModuleKeys.add(moduleKey);

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

        // Nada impedía, a nivel de backend, que "Crear"/"Editar"/"Eliminar" quedaran en true
        // mientras "Ver" está en false — esa regla solo vivía en el frontend
        // (ModulePermissionCard.jsx: apagar "view" apaga los demás en cascada). Una llamada
        // directa a la API (ej. Swagger) podía dejar un permiso inconsistente e inalcanzable
        // desde la propia interfaz. Se revisa el estado FINAL de cada módulo tocado en este
        // batch, ya con todos los cambios aplicados en memoria (antes de guardar).
        for (const moduleKey of touchedModuleKeys) {
            const permission = role.permissions.find((p) => p.moduleKey === moduleKey);
            if (!permission.view && (permission.create || permission.update || permission.delete)) {
                return res.status(400).json({
                    message: `No se puede activar "Crear", "Editar" o "Eliminar" en "${moduleKey}" mientras "Ver" está desactivado.`,
                });
            }
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
