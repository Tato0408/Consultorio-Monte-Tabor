import adminModel from "../models/admin/admins.js";
import notificationModel from "../models/notifications/notification.js";

// Las notificaciones nunca deben revertir la operación principal si la
// campana falla. Son informativas y se reintentarán en el siguiente evento.
export async function notifyAppointmentRecipients(appointment, { doctorMessage, patientMessage, actor } = {}) {
    const notifications = [];
    const actorId = actor?.id?.toString();

    // Las solicitudes creadas por pacientes nacen sin doctor. No intentes
    // crear una notificación con recipient_id=null; el doctor se notifica
    // cuando acepta la cita o cuando un administrador se la asigna.
    if (doctorMessage && appointment.doctor_id && appointment.doctor_id.toString() !== actorId) {
        notifications.push({
            recipient_role: "doctor",
            recipient_id: appointment.doctor_id,
            message: doctorMessage,
            appointment_id: appointment._id,
        });
    }

    if (patientMessage && appointment.patient_id && appointment.patient_id.toString() !== actorId) {
        notifications.push({
            recipient_role: "patient",
            recipient_id: appointment.patient_id,
            message: patientMessage,
            appointment_id: appointment._id,
        });
    }

    if (notifications.length > 0) {
        await notificationModel.insertMany(notifications);
    }
}

// Alerta de inventario dirigida a todos los administradores. Se limita a una
// por insumo y severidad cada 24 horas para no saturar la campana.
export async function notifyLowStockAdmins(item) {
    const stock = Number(item.stock);
    const minimum = Number(item.min_stock);
    if (stock > minimum) return;

    const severity = stock <= 0 ? "agotado" : "bajo";
    const message = severity === "agotado"
        ? `Inventario crítico: "${item.name}" está agotado.`
        : `Inventario bajo: "${item.name}" tiene ${stock} ${item.unit_measure || "unidades"} (mínimo: ${minimum}).`;
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const alreadyNotified = await notificationModel.exists({
        recipient_role: "admin",
        message,
        createdAt: { $gte: since },
    });
    if (alreadyNotified) return;

    const admins = await adminModel.find({}).select("_id").lean();
    if (admins.length > 0) {
        await notificationModel.insertMany(admins.map((admin) => ({
            recipient_role: "admin",
            recipient_id: admin._id,
            message,
        })));
    }
}

