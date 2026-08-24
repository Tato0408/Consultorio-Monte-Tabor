import { Schema, model } from "mongoose";

// Catálogo global de tipos de cita, no específico por doctor, compuesto por
// nombre y color. Alimenta la leyenda del calendario y el selector de tipo
// de cita al agendar. Solo el rol admin puede administrarlo.
const appointmentTypeSchema = new Schema({
    name:  { type: String, required: true, unique: true, trim: true },
    color: { type: String, required: true, default: "#3b82f6" },
    // A qué tipo de procedimiento queda anclado este tipo de cita: uno
    // creado como "consulta" solo se puede elegir cuando la cita es
    // Consulta Médica General, uno "procedimiento" solo cuando se
    // eligió un procedimiento real, y "ambos" aparece como opción en
    // los dos casos (ver AppointmentsFormCalendar.jsx).
    category: { type: String, enum: ["consulta", "procedimiento", "ambos"], required: true, default: "consulta" },
}, { timestamps: true });

export default model("AppointmentType", appointmentTypeSchema);
