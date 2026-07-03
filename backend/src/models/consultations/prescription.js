/*
consultation_id,
medications [{
name,
dose,
frequency,
duration,
route_of_administration,
instructions
}],
lab_orders [{
test_name,
notes
}]
post_operative_instructions,
issued_at
*/
import mongoose, { Schema, model } from "mongoose";

const prescriptionSchema = new Schema({
    consultations_id: {
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
    lab_orders: [
        {
            test_name: {
                type: String
            },
            notes: {
                type: String
            }
        }
    ],
    post_operative_instructions: {
        type: String
    },
    issued_at: {
        type: Date
    }
}, {
    timestamps: true,
    strict: false
});
export default model("Prescriptions", prescriptionSchema);