import mongoose, { Schema, model } from "mongoose";

const appointmentsSchema = new Schema({
    // Las solicitudes creadas por pacientes quedan sin doctor hasta que uno
    // las acepte, y las creadas por personal siguen llegando asignadas.
    doctor_id: { type: mongoose.Schema.Types.ObjectId, ref: "Doctors", default: null },
    patient_id: { type: mongoose.Schema.Types.ObjectId, ref: "Patients", required: true },
    nurse_id: { type: mongoose.Schema.Types.ObjectId, ref: "nurses" },
    // El modelo real se registra en minúscula y singular (ver
    // models/procedures/procedures.js: model("procedure", ...)); el ref
    // debe calzar exacto o cualquier .populate("procedure_id") revienta con
    // MissingSchemaError (pasaba en patientSelfController.getMyConsultations).
    //
    // Array (una cita puede combinar varios procedimientos, ver
    // utils/procedureAggregation.js): el nombre del campo se dejó igual a
    // propósito, no se renombró a procedure_ids. Mongoose castea un valor
    // escalar ya guardado en Mongo como un array de un elemento al leerlo
    // (SchemaArray cast), así que las citas ya existentes (con un solo
    // ObjectId guardado, de antes de este cambio) se siguen leyendo y
    // poblando bien sin ninguna migración de datos.
    procedure_id: { type: [mongoose.Schema.Types.ObjectId], ref: "procedure" },
    type: { type: String, required: true },
    // Nombre (denormalizado, no una referencia) de un AppointmentType del
    // catálogo global, usado solo para categorizar y colorear la cita en
    // la leyenda del calendario. No afecta el precio ni la duración, que
    // siguen definidos por type y procedure_id. Es opcional: las citas
    // creadas antes de este campo, o sin tipo elegido, simplemente no
    // tienen color asignado.
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
    // Cuando status === "needs_reschedule": por qué quedó así.
    //   "no_aceptada"    -> ningún proveedor la aceptó antes de su hora de fin.
    //   "cupo_asignado"  -> el proveedor aceptó a otro paciente para ese horario.
    // Ver src/utils/appointmentStatus.js.
    reschedule_reason: { type: String },
    // Id de la transacción de Wompi cuando la cita se paga en línea. El
    // estado queda en pending hasta que se confirma el pago.
    wompi_transaction_id: { type: String },
    // Anticipo del 50 por ciento del total, cobrado en línea para apartar
    // la hora. No aplica a citas que se pagan en recepción y no se
    // reembolsa si la cita se cancela.
    deposit_amount: { type: Number },
    // Indica si el anticipo en línea ya fue confirmado contra Wompi. Es
    // independiente del status de la cita: el pago no salta la aceptación
    // del doctor, así que una cita puede quedar con deposit_paid en true
    // y status en pending al mismo tiempo.
    deposit_paid: { type: Boolean, default: false }
}, {
    timestamps: true,
    strict: false
});

export default model("Appointments", appointmentsSchema);
