import mongoose, { Schema, model } from "mongoose";

// Notificación personal simple dentro de la aplicación. La combinación de
// recipient_role y recipient_id identifica a quién pertenece, sin depender
// de una colección única de usuarios, ya que cada rol tiene su propia
// colección con su propio id.
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
