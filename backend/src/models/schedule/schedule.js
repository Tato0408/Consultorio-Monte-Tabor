/*
Define el horario de un doctor: tipos de cita que ofrece, disponibilidad
semanal, descansos y excepciones (vacaciones, horario especial, etc).
buffer_time es el tiempo entre citas actualmente seleccionado.
buffer_time_options es la lista propia del doctor de tiempos entre citas
disponibles para elegir.
La duración de cada cita ya no es una configuración propia del doctor
(ya no existe block_durations): siempre la define el procedimiento
elegido al agendar, o un valor fijo para Consulta Médica General.
*/

import mongoose, { Schema, model } from "mongoose";

const scheduleSchema = new Schema({
    doctor_id: { type: mongoose.Schema.Types.ObjectId, ref: "Doctors", required: true, unique: true },

    appointment_types: [
        {
            name:     { type: String, required: true },
            duration: { type: Number, required: true },
            color:    { type: String, default: "#6366f1" }
        }
    ],

    weekly_availability: [
        {
            day:          { type: Number, min: 0, max: 6, required: true },
            is_available: { type: Boolean, default: false },
            time_blocks: [
                {
                    start_time: { type: String },
                    // Comparación lexicográfica válida porque start_time/end_time
                    // siempre son "HH:mm" con cero a la izquierda: no rechaza el
                    // guardado de un bloque incompleto (sin end_time todavía).
                    end_time:   {
                        type: String,
                        validate: {
                            validator: function (value) {
                                return !value || !this.start_time || value > this.start_time;
                            },
                            message: "La hora de fin debe ser posterior a la de inicio."
                        }
                    }
                }
            ]
        }
    ],

    breaks: [
        {
            day:        { type: Number, min: 0, max: 6, required: true },
            start_time: { type: String, required: true },
            end_time:   {
                type: String,
                required: true,
                validate: {
                    validator: function (value) {
                        return !this.start_time || value > this.start_time;
                    },
                    message: "La hora de fin debe ser posterior a la de inicio."
                }
            }
        }
    ],

    exceptions: [
        {
            date:          { type: Date, required: true },
            end_date:      { type: Date },
            type:          { type: String, enum: ["non_working", "special_hours", "vacation", "other"], required: true },
            // Se usa solo cuando el campo type es other, para la etiqueta
            // que el doctor escribió a mano.
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

export default model("Schedules", scheduleSchema);
