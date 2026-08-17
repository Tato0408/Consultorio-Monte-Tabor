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
        is_active: {
            type: Boolean,
            default: true
        },
    },
    {
        timestamps: true,
        strict: false,
    }
);

export default model("procedure", procedureSchema);