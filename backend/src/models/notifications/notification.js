import mongoose, { Schema, model } from "mongoose";

// Notificación personal simple (in-app): recipient_role + recipient_id
// identifican a quién pertenece, sin depender de una colección única de
// usuarios (cada rol tiene su propia colección con su propio _id).
const notificationSchema = new Schema({
    recipient_role: {
        type: String,
        enum: ["doctor", "patient", "receptionist", "admin"],
        required: true,
    },
    recipient_id: { type: mongoose.Schema.Types.ObjectId, required: true },
    message: { type: String, required: true },
    appointment_id: { type: mongoose.Schema.Types.ObjectId, ref: "Appointments" },
    read: { type: Boolean, default: false },
}, {
    timestamps: true,
});

export default model("Notification", notificationSchema);
