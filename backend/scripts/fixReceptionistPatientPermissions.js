import mongoose from "mongoose";
import { config } from "../config.js";
import Role from "../src/models/role/role.js";

// Migración puntual e idempotente. Corrige, SOLO para el rol
// receptionist, los dos permisos de pacientes que estaban en el
// moduleKey equivocado:
//
//   - users.patients  -> [ver, crear, editar, eliminar] = todos true
//     (es el CRUD real de pacientes: rutas /patients/*). Sin "crear"
//     aquí, el formulario de registro rápido del dashboard de recepción
//     devolvía 403.
//   - reports.patients -> solo "ver". Es el reporte analítico de
//     pacientes (una única ruta GET), no un CRUD. Sus flags de crear,
//     editar y eliminar no tenían ninguna ruta detrás.
//
// No toca ningún otro rol ni ningún otro módulo. Correr dos veces deja
// el mismo resultado.
//
// Uso:  node backend/scripts/fixReceptionistPatientPermissions.js
//
// El servidor en marcha recoge el cambio en su próximo refresco
// automático de caché (60 s) o al reiniciar.

const TARGET = {
    "users.patients": { view: true, create: true, update: true, delete: true },
    "reports.patients": { view: true, create: false, update: false, delete: false },
};

async function run() {
    await mongoose.connect(config.db.URI);
    console.log("Conectado a la base de datos");

    const role = await Role.findOne({ roleKey: "receptionist" });
    if (!role) {
        console.log('No existe el rol "receptionist". Nada que hacer.');
        await mongoose.disconnect();
        return;
    }

    let changed = false;

    for (const [moduleKey, desired] of Object.entries(TARGET)) {
        const permission = role.permissions.find((p) => p.moduleKey === moduleKey);
        if (!permission) {
            console.log(`  ${moduleKey}: no está sembrado para este rol, se omite`);
            continue;
        }
        const before = { view: permission.view, create: permission.create, update: permission.update, delete: permission.delete };
        const differs = ["view", "create", "update", "delete"].some((a) => permission[a] !== desired[a]);
        if (!differs) {
            console.log(`  ${moduleKey}: ya está correcto`);
            continue;
        }
        Object.assign(permission, desired);
        changed = true;
        console.log(`  ${moduleKey}: ${JSON.stringify(before)} -> ${JSON.stringify(desired)}`);
    }

    if (changed) {
        role.updatedBy = "fix-receptionist-patient-permissions";
        await role.save();
        console.log("Rol receptionist actualizado.");
    } else {
        console.log("Sin cambios: el rol receptionist ya estaba correcto.");
    }

    await mongoose.disconnect();
}

run().catch((error) => {
    console.error("Error en la migración:", error);
    process.exit(1);
});
