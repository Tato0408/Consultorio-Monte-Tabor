import mongoose from "mongoose";
import { config } from "../config.js";
import Role from "../src/models/role/role.js";

const MODULE_KEYS = [
    "dashboard",
    "calendar.schedule",
    "calendar.appointments",
    "calendar.consultations",
    "users.doctors",
    "users.patients",
    "users.receptionist",
    "users.nurses",
    "procedures",
    "reports.appointments",
    "reports.records",
    "reports.patients",
    "reports.doctors",
    "inventory.products",
    "inventory.treatments",
    "inventory.movements",
    "inventory.reports",
    "system.roles",
    "system.profile"
];

// Cada entrada [view, create, update, delete] refleja exactamente el
// comportamiento actual del sistema (allowedRoles en app.js, rutas del
// backend, menuConfig.js), no un diseño nuevo.
const ROLE_PERMISSIONS = {
    admin: {
        "dashboard": [true, true, true, true],
        "calendar.schedule": [true, true, true, true],
        "calendar.appointments": [true, true, true, true],
        "calendar.consultations": [true, true, true, true],
        "users.doctors": [true, true, true, true],
        "users.patients": [true, true, true, true],
        "users.receptionist": [true, true, true, true],
        "users.nurses": [true, true, true, true],
        "procedures": [true, true, true, true],
        "reports.appointments": [true, true, true, true],
        "reports.records": [true, true, true, true],
        "reports.patients": [true, true, true, true],
        "reports.doctors": [true, true, true, true],
        "inventory.products": [true, true, true, true],
        "inventory.treatments": [true, true, true, true],
        "inventory.movements": [true, true, true, true],
        "inventory.reports": [true, true, true, true],
        "system.roles": [true, true, true, true],
        "system.profile": [true, true, true, true]
    },
    doctor: {
        "dashboard": [true, false, false, false],
        "calendar.schedule": [true, false, true, false],
        "calendar.appointments": [true, true, true, true],
        "calendar.consultations": [true, true, true, true],
        "users.doctors": [false, false, false, false],
        "users.patients": [true, false, true, true],
        "users.receptionist": [false, false, false, false],
        // El doctor necesita ver el listado de enfermeras para poder
        // asignar una al agendar una cita (users.nurses.view).
        "users.nurses": [true, false, false, false],
        "procedures": [true, true, true, true],
        "reports.appointments": [true, false, false, false],
        // CRUD completo: el doctor es quien emite, edita y elimina
        // incapacidades desde el Expediente (la única acción real
        // detrás de este moduleKey).
        "reports.records": [true, true, true, true],
        "reports.patients": [true, false, false, false],
        "reports.doctors": [false, false, false, false],
        "inventory.products": [false, false, false, false],
        // El doctor hace el seguimiento clínico del tratamiento
        // (evolución, notas, controles, alta) desde
        // /inventory/treatments. Necesita las 4 acciones, no solo ver.
        "inventory.treatments": [true, true, true, true],
        "inventory.movements": [false, false, false, false],
        "inventory.reports": [false, false, false, false],
        "system.roles": [false, false, false, false],
        "system.profile": [true, false, true, false]
    },
    nurse: {
        "dashboard": [true, false, false, false],
        // A diferencia de recepción, la enfermera sí puede tener su
        // propio horario (update en true), lo que permite que solo se
        // le asignen citas dentro de ese horario.
        "calendar.schedule": [true, false, true, false],
        // La enfermera sí puede crear, confirmar y cancelar citas desde
        // su dashboard.
        "calendar.appointments": [true, true, true, true],
        "calendar.consultations": [false, false, false, false],
        "users.doctors": [false, false, false, false],
        // A diferencia de recepción, la enfermera no registra pacientes
        // nuevos, solo necesita verlos para buscarlos al agendar una
        // cita.
        "users.patients": [true, false, false, false],
        "users.receptionist": [false, false, false, false],
        "users.nurses": [false, false, false, false],
        "procedures": [false, false, false, false],
        "reports.appointments": [false, false, false, false],
        "reports.records": [false, false, false, false],
        "reports.patients": [false, false, false, false],
        "reports.doctors": [false, false, false, false],
        "inventory.products": [false, false, false, false],
        // La enfermera también participa del seguimiento del
        // tratamiento (curaciones, controles), así que tiene las
        // mismas 4 acciones que el doctor aquí.
        "inventory.treatments": [true, true, true, true],
        "inventory.movements": [false, false, false, false],
        "inventory.reports": [false, false, false, false],
        "system.roles": [false, false, false, false],
        "system.profile": [true, false, true, false]
    },
    receptionist: {
        "dashboard": [true, false, false, false],
        // Recepción no administra los horarios, pero necesita consultarlos al
        // asignar una cita a un doctor desde el módulo de Citas.
        "calendar.schedule": [true, false, false, false],
        "calendar.appointments": [true, true, true, true],
        "calendar.consultations": [true, false, false, false],
        // Catálogos necesarios exclusivamente para completar una cita.
        "users.doctors": [true, false, false, false],
        "users.patients": [true, false, false, false],
        "users.receptionist": [false, false, false, false],
        "users.nurses": [true, false, false, false],
        "procedures": [true, false, false, false],
        "reports.appointments": [false, false, false, false],
        "reports.records": [false, false, false, false],
        // La recepción sí registra pacientes nuevos (es parte central
        // de su trabajo).
        "reports.patients": [true, true, true, true],
        "reports.doctors": [false, false, false, false],
        "inventory.products": [false, false, false, false],
        "inventory.treatments": [false, false, false, false],
        "inventory.movements": [false, false, false, false],
        "inventory.reports": [false, false, false, false],
        "system.roles": [false, false, false, false],
        "system.profile": [true, false, true, false]
    }
};

const ROLE_METADATA = {
    admin: {
        displayName: "Administrador",
        description: "Acceso completo al sistema. Rol protegido: no se puede modificar ni eliminar.",
        icon: "ShieldCheck",
        isProtected: true
    },
    doctor: {
        displayName: "Doctor",
        description: "Personal médico con acceso a citas, consultas, procedimientos y reportes clínicos.",
        icon: "Stethoscope",
        isProtected: false
    },
    nurse: {
        displayName: "Enfermera",
        description: "Personal de enfermería con acceso limitado a notas y su propio perfil.",
        icon: "UserPlus2",
        isProtected: false
    },
    receptionist: {
        displayName: "Recepcionista",
        description: "Personal de recepción con acceso a citas, pacientes y su propio perfil.",
        icon: "User",
        isProtected: false
    }
};

const SEED_UPDATED_BY = "system-seed-migration";

function buildPermissions(roleKey) {
    const rolePermissionMap = ROLE_PERMISSIONS[roleKey];
    return MODULE_KEYS.map((moduleKey) => {
        const [view, create, update, del] = rolePermissionMap[moduleKey];
        return { moduleKey, view, create, update, delete: del };
    });
}

async function seedRoles() {
    await mongoose.connect(config.db.URI);
    console.log("Conectado a la base de datos");

    for (const roleKey of Object.keys(ROLE_PERMISSIONS)) {
        const metadata = ROLE_METADATA[roleKey];
        const permissions = buildPermissions(roleKey);

        await Role.findOneAndUpdate(
            { roleKey },
            {
                $set: {
                    roleKey,
                    displayName: metadata.displayName,
                    description: metadata.description,
                    icon: metadata.icon,
                    isProtected: metadata.isProtected,
                    permissions,
                    updatedBy: SEED_UPDATED_BY
                }
            },
            { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
        );

        console.log(`Rol "${roleKey}" sembrado con ${permissions.length} moduleKey(s)`);
    }

    console.log("Seed de roles completado");
    await mongoose.disconnect();
}

seedRoles().catch((error) => {
    console.error("Error al sembrar roles:", error);
    process.exit(1);
});