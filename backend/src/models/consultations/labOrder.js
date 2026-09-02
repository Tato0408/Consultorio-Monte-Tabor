import mongoose, { Schema, model } from "mongoose";

// Orden de laboratorio de una consulta. Es 1:1 con la cita (appointment_id
// único): el doctor la arma desde el formulario de consulta antes de
// finalizarla, y al dar "Finalizar y guardar" la consulta se le enlaza el
// consultation_id, que es lo que la vuelve visible para el paciente.
const labOrderSchema = new Schema({
    appointment_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Appointments",
        required: true,
        unique: true,
    },
    patient_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Patients",
    },
    // Se llena solo al finalizar la consulta (ver consultation.js). Mientras
    // sea null, la orden es un borrador que solo ve el personal.
    consultation_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Consultations",
        default: null,
    },
    // Exámenes marcados, como claves "panelKey:testKey" del catálogo del
    // frontend (labOrderCatalog.js). Se guardan las claves, no las etiquetas,
    // para que renombrar un texto no rompa las órdenes ya guardadas.
    tests: [
        {
            type: String,
        },
    ],
    // Campos del encabezado de la hoja que no existen en la consulta.
    pregnancy: {
        type: String,
    },
    antibiotic_treatment: {
        type: String,
    },
    // Línea "OTROS: ____" escribible al pie de la hoja.
    other_tests: {
        type: String,
    },
    // Copia del triage al momento de guardar la orden (PESO / TALLA de la
    // hoja), para que el PDF sea estable aunque luego se edite la consulta.
    weight: {
        type: Number,
    },
    height: {
        type: Number,
    },
    issued_at: {
        type: Date,
    },
}, {
    timestamps: true,
    strict: false,
});

export default model("LabOrders", labOrderSchema);
