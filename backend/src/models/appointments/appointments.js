/*
Campos:
    doctor_id
    patient_id
    nurse_id
    procedure_id
    type
    date
    start_time
    end_time
    duration_minutes
    description
    status
    total
    cancellation_reason
*/

import mongoose, { Schema, model } from "mongoose";

const appointmentsSchema = new Schema({
    doctor_id: { type: mongoose.Schema.Types.ObjectId, ref: "Doctors", required: true },
    patient_id: { type: mongoose.Schema.Types.ObjectId, ref: "Patients", required: true },
    nurse_id: { type: mongoose.Schema.Types.ObjectId, ref: "nurses" },
    procedure_id: { type: mongoose.Schema.Types.ObjectId, ref: "Procedure" },
    type: { type: String, required: true },
    schedule_id: { type: mongoose.Schema.Types.ObjectId, ref: "Schedules", required: true },
    date: { type: Date, required: true },
    start_time: { type: String, required: true },
    end_time: { type: String, required: true },
    duration_minutes: { type: Number, required: true },
    description: { type: String },
    status: { type: String, required: true },
    total: { type: Number, required: true },
    cancellation_reason: { type: String }
}, {
    timestamps: true,
    strict: false
});

export default model("Appointments", appointmentsSchema);