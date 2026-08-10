import { Schema, model } from "mongoose";

// Catálogo GLOBAL (no por doctor) de tipos de cita: nombre + color. Alimenta la leyenda del
// calendario (AppointmentsCalendar.jsx) y el selector "Tipo de cita" al agendar
// (AppointmentsForm.jsx). Solo lo administra el rol admin — ver
// appointmentTypesController.js / routes/appointmentTypes/appointmentTypes.js.
const appointmentTypeSchema = new Schema({
    name:  { type: String, required: true, unique: true, trim: true },
    color: { type: String, required: true, default: "#3b82f6" },
}, { timestamps: true });

export default model("AppointmentType", appointmentTypeSchema);
