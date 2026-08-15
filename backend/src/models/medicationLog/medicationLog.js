import mongoose, { Schema, model } from "mongoose";

// Registra si el paciente marcó un medicamento como tomado en un día
// puntual. Hay un registro por combinación de paciente, medicamento y día.
const medicationLogSchema = new Schema(
    {
        patient_id: { type: mongoose.Schema.Types.ObjectId, ref: "Patients", required: true },
        medication_id: { type: String, required: true },
        // Fecha en formato AAAA MM DD.
        date: { type: String, required: true },
        taken: { type: Boolean, default: false },
    },
    { timestamps: true }
);

medicationLogSchema.index({ patient_id: 1, medication_id: 1, date: 1 }, { unique: true });

export default model("MedicationLog", medicationLogSchema);