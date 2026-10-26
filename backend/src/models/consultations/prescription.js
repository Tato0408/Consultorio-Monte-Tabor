import mongoose, { Schema, model } from "mongoose";

const prescriptionSchema = new Schema({
    // El campo se llama consultation_id (no consultations_id) porque así lo
    // escriben y consultan consultationController y patientPortalController.
    // Declararlo con su tipo real permite que Mongoose convierta un id en
    // texto a ObjectId al armar consultas (find, $in), algo que no ocurre en
    // campos no declarados aunque el esquema tenga strict:false.
    consultation_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Consultations"
    },
    medications: [
        {
            name: {
                type: String
            },
            dose: {
                type: String
            },
            frequency: {
                type: String
            },
            duration: {
                type: String
            },
            route_of_administration: {
                type: String
            },
            instructions: {
                type: String
            }
        }
    ],
    post_operative_instructions: {
        type: String
    },
    // Próxima cita sugerida que el doctor indica en la receta.
    next_appointment_suggested: {
        type: Date,
        default: null
    },
    issued_at: {
        type: Date
    }
}, {
    timestamps: true,
    strict: false
});
export default model("Prescriptions", prescriptionSchema);