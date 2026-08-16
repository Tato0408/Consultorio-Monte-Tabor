import adminModel from "../models/admin/admins.js";
import notificationModel from "../models/notifications/notification.js";
import patientsModel from "../models/patients/patients.js";
import doctorsModel from "../models/doctors/doctors.js";

const formatAppointmentDate = (appointment) => {
    if (!appointment?.date) return "fecha pendiente";
    const date = new Date(appointment.date);
    const dateText = new Intl.DateTimeFormat("es-SV", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
    }).format(date);
    return `${dateText} a las ${appointment.start_time || "hora pendiente"}`;
};

// Las notificaciones nunca deben revertir la operación principal si la
// campana falla. Son informativas y se reintentarán en el siguiente evento.
export async function notifyAppointmentRecipients(appointment, {
    doctorMessage,
    patientMessage,
    doctorTitle = "Actualización de cita",
    patientTitle = "Actualización de tu cita",
    type = "general",
    actor,
    navigable = true,
} = {}) {
    const notifications = [];
    const actorId = actor?.id?.toString();
    const [patient, doctor] = await Promise.all([
        appointment.patient_id
            ? patientsModel.findById(appointment.patient_id).select("name last_name").lean()
            : null,
        appointment.doctor_id
            ? doctorsModel.findById(appointment.doctor_id).select("name last_name").lean()
            : null,
    ]);
    const patientName = patient
        ? `${patient.name} ${patient.last_name || ""}`.trim()
        : "Paciente sin nombre";
    const doctorName = doctor
        ? `Dr. ${doctor.name} ${doctor.last_name || ""}`.trim()
        : "Doctor pendiente de asignación";
    const scheduleText = formatAppointmentDate(appointment);

    // Las solicitudes creadas por pacientes nacen sin doctor asignado. No
    // se crea una notificación con recipient_id nulo, el doctor se
    // notifica recién cuando acepta la cita o cuando un administrador se
    // la asigna.
    if (doctorMessage && appointment.doctor_id && appointment.doctor_id.toString() !== actorId) {
        notifications.push({
            recipient_role: "doctor",
            recipient_id: appointment.doctor_id,
            title: doctorTitle,
            type,
            message: `${doctorMessage} Paciente: ${patientName}. Fecha: ${scheduleText}.`,
            appointment_id: appointment._id,
            action_url: navigable ? `/calendar/appointments/${appointment._id}` : null,
        });
    }

    if (patientMessage && appointment.patient_id && appointment.patient_id.toString() !== actorId) {
        notifications.push({
            recipient_role: "patient",
            recipient_id: appointment.patient_id,
            title: patientTitle,
            type,
            message: `${patientMessage} Médico: ${doctorName}. Fecha: ${scheduleText}.`,
            appointment_id: appointment._id,
            action_url: navigable ? `/appointments/${appointment._id}/edit` : null,
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
            title: severity === "agotado" ? "Insumo agotado" : "Inventario bajo",
            type: "inventory_alert",
            message,
            action_url: "/inventory/products",
        })));
    }
}

