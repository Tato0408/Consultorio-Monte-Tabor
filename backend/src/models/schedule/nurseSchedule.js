/*
Mismo shape que schedule.js (horario de doctores), pero para enfermeras. Colección separada
en vez de reutilizar "Schedules" con un discriminador: evita cualquier riesgo de mezclar
horarios de doctor/enfermera en las consultas existentes de scheduleController.js, que ya
asumen que todo lo que hay en "Schedules" es de un doctor.

Campos:
    nurse_id
    weekly_availability → [{ day, is_available, time_blocks: [{ start_time, end_time }] }]
    breaks             → [{ day, start_time, end_time }]
    exceptions         → [{ date, end_date, type, description, schedule_info }]
    buffer_time
    min_block_duration
    allow_outside_hours
*/

import mongoose, { Schema, model } from "mongoose";

const nurseScheduleSchema = new Schema({
    nurse_id: { type: mongoose.Schema.Types.ObjectId, ref: "Nurses", required: true, unique: true },

    weekly_availability: [
        {
            day:          { type: Number, min: 0, max: 6, required: true },
            is_available: { type: Boolean, default: false },
            time_blocks: [
                {
                    start_time: { type: String },
                    end_time:   { type: String }
                }
            ]
        }
    ],

    breaks: [
        {
            day:        { type: Number, min: 0, max: 6, required: true },
            start_time: { type: String, required: true },
            end_time:   { type: String, required: true }
        }
    ],

    exceptions: [
        {
            date:          { type: Date, required: true },
            end_date:      { type: Date },
            type:          { type: String, enum: ["non_working", "special_hours", "vacation"], required: true },
            description:   { type: String },
            schedule_info: { type: String }
        }
    ],

    buffer_time:         { type: Number, default: 10 },
    min_block_duration:  { type: Number, default: 30 },
    allow_outside_hours: { type: Boolean, default: false }

}, {
    timestamps: true,
    strict: false
});

export default model("NurseSchedules", nurseScheduleSchema);
