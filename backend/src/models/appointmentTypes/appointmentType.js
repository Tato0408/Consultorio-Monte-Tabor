import { Schema, model } from "mongoose";

// Catálogo global de tipos de cita, no específico por doctor, compuesto por
// nombre y color. Alimenta la leyenda del calendario y el selector de tipo
// de cita al agendar. Solo el rol admin puede administrarlo.
const appointmentTypeSchema = new Schema({
    name:  { type: String, required: true, unique: true, trim: true },
    color: { type: String, required: true, default: "#3b82f6" },
}, { timestamps: true });

export default model("AppointmentType", appointmentTypeSchema);
