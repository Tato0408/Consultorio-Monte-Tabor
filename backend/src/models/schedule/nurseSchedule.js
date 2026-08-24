/*
Guarda el horario de las enfermeras con el mismo formato que schedule.js
(horario de doctores), pero en una colección separada en lugar de
reutilizar Schedules con un discriminador. Esto evita mezclar horarios de
doctor y de enfermera en las consultas existentes de scheduleController.js,
que asumen que todo lo que hay en Schedules pertenece a un doctor.
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
            type:          { type: String, enum: ["non_working", "special_hours", "vacation", "other"], required: true },
            // Se usa solo cuando el campo type es other, para la etiqueta
            // que la enfermera escribió a mano.
            custom_type:   { type: String },
            description:   { type: String },
            schedule_info: { type: String }
        }
    ],

    buffer_time:         { type: Number, default: 10 },
    buffer_time_options: { type: [Number], default: [0, 5, 10, 15, 20, 30] },
    allow_outside_hours: { type: Boolean, default: false }

}, {
    timestamps: true,
    strict: false
});

export default model("NurseSchedules", nurseScheduleSchema);
