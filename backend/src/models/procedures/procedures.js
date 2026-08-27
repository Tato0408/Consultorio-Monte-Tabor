import { Schema, model } from "mongoose";

const procedureSchema = new Schema(
    {
        name: {
            type: String,
            required: true
        },
        description: {
            type: String
        },
        estimated_duration: {
            type: Number
        },
        price: {
            type: Number,
            default: 0
        },
        materials: [
            {
                insumo: { type: Schema.Types.ObjectId, ref: "inventory" },
                name: { type: String },
                quantity: { type: Number, default: 1 },
            },
        ],
        post_operative_instructions: {
            type: String
        },
        // Indicaciones que el paciente debe leer antes de la cita, por
        // ejemplo ayuno o documentos que debe traer.
        pre_care_instructions: {
            type: String
        },
        requires_nurse: {
            type: Boolean,
            default: false
        },
        // Solo relevante cuando requires_nurse es true: permite procedimientos que
        // atiende solo la enfermera, sin doctor (ej. curaciones, controles). Por defecto
        // true porque es raro que un doctor no participe; nunca puede ser false si
        // requires_nurse también es false (ver resolveRequiresDoctor en el controller),
        // para que un procedimiento no quede sin nadie que lo atienda.
        requires_doctor: {
            type: Boolean,
            default: true
        },
        is_active: {
            type: Boolean,
            default: true
        },
        // Tipos de cita (AppointmentType, el catálogo que colorea la agenda) que se pueden
        // elegir al agendar una cita de este procedimiento. Se agregan uno o más, igual que
        // los materiales/insumos de arriba: el admin los elige explícitamente al crear o
        // editar el procedimiento, en vez de que el sistema los adivine comparando
        // categorías. Obligatorio: todo procedimiento necesita al menos un tipo de cita
        // seleccionable (ver la validación más abajo).
        appointment_type_ids: {
            type: [{ type: Schema.Types.ObjectId, ref: "AppointmentType" }],
            required: true,
            validate: {
                validator: (arr) => Array.isArray(arr) && arr.length > 0,
                message: "Debes elegir al menos un tipo de cita.",
            },
        },
    },
    {
        timestamps: true,
        strict: false,
    }
);

export default model("procedure", procedureSchema);