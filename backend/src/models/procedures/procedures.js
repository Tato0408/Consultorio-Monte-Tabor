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
                name: { 
                    type: Schema.Types.ObjectId,
                    ref: "inventory"
                 },
                quantity: { type: Number, default: 1 },
            },
        ],
        post_operative_instructions: { 
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