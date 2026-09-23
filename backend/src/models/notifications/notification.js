import mongoose, { Schema, model } from "mongoose";
import { broadcastNotification } from "../../services/roleSocket.js";
import { sendExpoPushForNotification } from "../../services/pushNotificationService.js";

// Notificación personal simple dentro de la aplicación. La combinación de
// recipient_role y recipient_id identifica a quién pertenece, sin depender
// de una colección única de usuarios, ya que cada rol tiene su propia
// colección con su propio id.
const notificationSchema = new Schema({
    recipient_role: {
        type: String,
        enum: ["doctor", "patient", "receptionist", "admin", "nurse"],
        required: true,
    },
    recipient_id: { type: mongoose.Schema.Types.ObjectId, required: true },
    title: { type: String, default: "Notificación" },
    type: {
        type: String,
        enum: [
            "appointment_created",
            "appointment_updated",
            "appointment_cancelled",
            "appointment_deleted",
            "appointment_status_changed",
            "appointment_accepted",
            "appointment_assigned",
            "appointment_expired",
            "appointment_reschedule_needed",
            "appointment_reminder",
            "medication_reminder",
            "inventory_alert",
            "nurse_note_pending",
            "general",
        ],
        default: "general",
    },
    message: { type: String, required: true },
    appointment_id: { type: mongoose.Schema.Types.ObjectId, ref: "Appointments" },
    // Id genérico del documento origen de la notificación cuando no es una cita (por ejemplo
    // un insumo de inventario). Sin ref fijo porque el tipo de entidad varía según el type de
    // la notificación. Se usa para deduplicar (ver notifyLowStockAdmins), no solo para mostrar.
    related_id: { type: mongoose.Schema.Types.ObjectId, default: null },
    action_url: { type: String, default: null },
    read: { type: Boolean, default: false },
}, {
    timestamps: true,
});

// Empuja cada notificación recién creada a su destinatario por WebSocket (para la campana
// del panel/portal en tiempo real) y, si es de un paciente con push_token guardado, además
// como notificación push real del sistema operativo (ver pushNotificationService.js) — así
// le llega aunque tenga la app cerrada o en segundo plano, sin tener que agregar el envío en
// cada lugar del código que crea una Notification. Es best effort en ambos casos: si algo
// falla, la notificación ya quedó guardada y el poll de respaldo del frontend la recogerá
// igual. Solo aplica a las altas (save e insertMany); marcar como leída o borrar no dispara
// nada. updateMany y findOneAndUpdate no pasan por estos hooks, así que no hace falta
// filtrarlos.
const pushNotificationRealtime = (documents) => {
    for (const document of Array.isArray(documents) ? documents : [documents]) {
        try {
            broadcastNotification(document?.toObject ? document.toObject() : document);
        } catch (error) {
            console.log("Error empujando notificación en tiempo real:", error);
        }
        sendExpoPushForNotification(document).catch((error) =>
            console.log("Error enviando notificación push:", error)
        );
    }
};

notificationSchema.post("save", function (document) {
    pushNotificationRealtime(document);
});

notificationSchema.post("insertMany", function (documents) {
    pushNotificationRealtime(documents);
});

export default model("Notification", notificationSchema);
