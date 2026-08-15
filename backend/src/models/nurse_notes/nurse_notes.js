import {Schema, model} from "mongoose";

const nurseNotesSchema = new Schema({
    appointment_id: {
        type: Schema.Types.ObjectId,
        ref: "Appointments"
    },
    nurse_id: {
        type: Schema.Types.ObjectId,
        ref: "nurses"
    },
    patient_id: {
        type: Schema.Types.ObjectId,
        ref: "Patients"
    },
    instructions: {
        type: String
    }
});

export default model("nurse_notes", nurseNotesSchema);