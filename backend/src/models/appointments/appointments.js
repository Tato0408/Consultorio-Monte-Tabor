// Campos: doctor_id, patient_id, nurse_id, procedure_id, type, appointment_type, date,
// start_time, end_time, duration_minutes, description, status, total, cancellation_reason.

import mongoose, { Schema, model } from "mongoose";

const appointmentsSchema = new Schema({
    // Las solicitudes creadas por pacientes quedan sin doctor hasta que uno
    // las acepte, y las creadas por personal siguen llegando asignadas.
    doctor_id: { type: mongoose.Schema.Types.ObjectId, ref: "Doctors", default: null },
    patient_id: { type: mongoose.Schema.Types.ObjectId, ref: "Patients", required: true },
    nurse_id: { type: mongoose.Schema.Types.ObjectId, ref: "nurses" },
    procedure_id: { type: mongoose.Schema.Types.ObjectId, ref: "Procedure" },
    type: { type: String, required: true },
    // Nombre (denormalizado, no ref) de un AppointmentType del catálogo global — solo para
    // categorizar/colorear la cita en la leyenda del calendario. NO afecta precio ni duración
    // (eso lo sigue definiendo "type" + procedure_id, como siempre). Opcional: las citas creadas
    // antes de este campo, o sin tipo elegido, simplemente no tienen color asignado.
    appointment_type: { type: String },
    schedule_id: { type: mongoose.Schema.Types.ObjectId, ref: "Schedules" },
    date: { type: Date, required: true },
    start_time: { type: String, required: true },
    end_time: { type: String, required: true },
    duration_minutes: { type: Number, required: true },
    description: { type: String },
    status: { type: String, required: true },
    total: { type: Number, required: true },
    cancellation_reason: { type: String },
    // Id de la transacción de Wompi cuando la cita se paga en línea (status "pending" hasta confirmarse)
    wompi_transaction_id: { type: String },
    // Anticipo (50% del total) que se cobra en línea para apartar la hora. No aplica a
    // citas que se pagan en recepción. Este monto no se reembolsa si la cita se cancela.
    deposit_amount: { type: Number }
}, {
    timestamps: true,
    strict: false
});

export default model("Appointments", appointmentsSchema);
