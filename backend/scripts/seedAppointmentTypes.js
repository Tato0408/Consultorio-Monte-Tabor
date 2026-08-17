// Migración de una sola vez: crea los tipos de cita que antes vivían
// hardcodeados en AppointmentsCalendar.jsx (TYPE_COLORS) como entradas
// reales del catálogo global (AppointmentType), y asigna
// "appointment_type" a las citas que ya existían. Esas citas no tenían
// ningún tipo de cita asociado antes de este campo (solo "type", que
// sigue definiendo precio y duración vía Procedimientos, sin relación
// con el color de la leyenda).
import mongoose from "mongoose";
import { config } from "../config.js";
import appointmentTypeModel from "../src/models/appointmentTypes/appointmentType.js";
import appointmentsModel from "../src/models/appointments/appointments.js";

// Mismos colores que usaba el TYPE_COLORS anterior (aproximación en hex
// de los tonos 500 y 400 de Tailwind).
const TYPES = [
    // blue-500
    { name: "Consulta", color: "#3b82f6" },
    // emerald-500
    { name: "Control", color: "#10b981" },
    // orange-500
    { name: "Procedimiento", color: "#f97316" },
    // yellow-400
    { name: "Descanso", color: "#facc15" },
];

// Mapea el "type" real que ya guardan las citas (solo estos dos valores
// existen en datos reales) al nombre del nuevo "appointment_type".
// "Control" y "Descanso" no tienen backfill porque ninguna cita real
// llegó a tener esos "type". Se crean igual en el catálogo por si el
// admin quiere empezar a usarlos desde ahora.
const TYPE_TO_APPOINTMENT_TYPE = {
    "Consulta Médica General": "Consulta",
    "Procedimiento": "Procedimiento",
};

async function seedAppointmentTypes() {
    await mongoose.connect(config.db.URI);
    console.log("Conectado a la base de datos");

    for (const t of TYPES) {
        await appointmentTypeModel.findOneAndUpdate(
            { name: t.name },
            { $setOnInsert: { name: t.name, color: t.color } },
            { upsert: true }
        );
        console.log(`Tipo de cita "${t.name}" listo`);
    }

    for (const [type, appointmentType] of Object.entries(TYPE_TO_APPOINTMENT_TYPE)) {
        // Solo se tocan citas que todavía no tienen appointment_type
        // asignado (no pisa nada que ya se haya elegido a mano desde
        // que existe el selector nuevo).
        const result = await appointmentsModel.updateMany(
            { type, $or: [{ appointment_type: { $exists: false } }, { appointment_type: null }, { appointment_type: "" }] },
            { $set: { appointment_type: appointmentType } }
        );
        console.log(`Citas con type="${type}" -> appointment_type="${appointmentType}": ${result.modifiedCount} actualizadas`);
    }

    console.log("Migración completada");
    await mongoose.disconnect();
}

seedAppointmentTypes().catch((error) => {
    console.error("Error en la migración:", error);
    process.exit(1);
});
