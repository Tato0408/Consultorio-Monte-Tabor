import adminModel from "../models/admin/admins.js";
import notificationModel from "../models/notifications/notification.js";
import patientsModel from "../models/patients/patients.js";
import doctorsModel from "../models/doctors/doctors.js";
import appointmentsModel from "../models/appointments/appointments.js";
import proceduresModel from "../models/procedures/procedures.js";
import consultationsModel from "../models/consultations/consultation.js";

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
    nurseMessage,
    doctorTitle = "Actualización de cita",
    patientTitle = "Actualización de tu cita",
    nurseTitle = "Actualización de cita",
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
            // El portal público no tiene una ruta por id (/appointments/:id/edit no
            // existe ahí); la pantalla real es /mis-citas, igual que ya usa
            // patientPortalController.js para "Cita reagendada".
            action_url: navigable ? "/mis-citas" : null,
        });
    }

    // El resto del personal se entera de cambios en sus citas por la campana; a la
    // enfermera asignada (appointment.nurse_id) le llegaba lo mismo que a nadie, aunque el
    // modelo de citas sí la vincula igual que al doctor.
    if (nurseMessage && appointment.nurse_id && appointment.nurse_id.toString() !== actorId) {
        notifications.push({
            recipient_role: "nurse",
            recipient_id: appointment.nurse_id,
            title: nurseTitle,
            type,
            message: `${nurseMessage} Paciente: ${patientName}. Fecha: ${scheduleText}.`,
            appointment_id: appointment._id,
            action_url: navigable ? `/calendar/appointments/${appointment._id}` : null,
        });
    }

    if (notifications.length > 0) {
        await notificationModel.insertMany(notifications);
    }
}

// Cuenta las notas de enfermería pendientes de una enfermera: consultas ya
// registradas, de citas donde ella es la enfermera asignada y cuyo
// procedimiento exige enfermera, que todavía no tienen nurse_note. No filtra
// por estado de la cita: que exista la consulta ya significa que el doctor
// (o la enfermera) la registró.
async function countPendingNurseNotes(nurseId) {
    const appointments = await appointmentsModel
        .find({ nurse_id: nurseId })
        .select("_id procedure_id")
        .lean();
    if (!appointments.length) return 0;

    // Cada cita puede traer más de un procedimiento: se aplanan todos los ids de todas
    // las citas antes de deduplicar y consultar cuáles exigen enfermera.
    const procedureIds = [
        ...new Set(appointments.flatMap((a) => (a.procedure_id || []).map(String))),
    ];
    const requiresNurse = new Set(
        (await proceduresModel
            .find({ _id: { $in: procedureIds }, requires_nurse: true })
            .select("_id")
            .lean()
        ).map((p) => String(p._id))
    );

    // La cita exige enfermera si ALGUNO de sus procedimientos lo exige.
    const appointmentIds = appointments
        .filter((a) => (a.procedure_id || []).some((id) => requiresNurse.has(String(id))))
        .map((a) => a._id);
    if (!appointmentIds.length) return 0;

    const consultations = await consultationsModel
        .find({ appointment_id: { $in: appointmentIds } })
        .select("nurse_note")
        .lean();

    return consultations.filter((c) => !String(c.nurse_note || "").trim()).length;
}

// Mantiene una única notificación consolidada por enfermera con el total de
// notas de enfermería que le faltan por agregar. Se llama al finalizar una
// consulta que exige nota y al guardar una nota. Reemplaza siempre la
// anterior para que la campana muestre solo una, siempre al día. Best effort:
// nunca revierte la operación principal si algo falla.
export async function refreshNurseNotePendingNotification(nurseId) {
    if (!nurseId) return;
    try {
        const pending = await countPendingNurseNotes(nurseId);

        await notificationModel.deleteMany({
            recipient_role: "nurse",
            recipient_id: nurseId,
            type: "nurse_note_pending",
        });

        if (pending > 0) {
            await notificationModel.create({
                recipient_role: "nurse",
                recipient_id: nurseId,
                title: "Notas de enfermería pendientes",
                type: "nurse_note_pending",
                message: `Tienes ${pending} nota${pending === 1 ? "" : "s"} de enfermería por agregar.`,
                action_url: "/calendar/consultations",
            });
        }
    } catch (error) {
        console.log("Error actualizando notificación de notas de enfermería:", error);
    }
}

// Alerta de inventario dirigida a todos los administradores. Se limita a una
// por insumo y severidad cada 24 horas para no saturar la campana.
export async function notifyLowStockAdmins(item) {
    const stock = Number(item.stock);
    const minimum = Number(item.min_stock);
    if (stock > minimum) return;

    const severity = stock <= 0 ? "agotado" : "bajo";
    const title = severity === "agotado" ? "Insumo agotado" : "Inventario bajo";
    const message = severity === "agotado"
        ? `Inventario crítico: "${item.name}" está agotado.`
        : `Inventario bajo: "${item.name}" tiene ${stock} ${item.unit_measure || "unidades"} (mínimo: ${minimum}).`;
    // La deduplicación es por insumo (related_id) y severidad (title), no por el mensaje
    // completo: el mensaje embebe el stock actual, que cambia con cada movimiento, así que
    // deduplicar por texto exacto casi nunca encontraba coincidencia y el límite de "una cada
    // 24h" no se cumplía en la práctica.
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const alreadyNotified = await notificationModel.exists({
        recipient_role: "admin",
        type: "inventory_alert",
        related_id: item._id,
        title,
        createdAt: { $gte: since },
    });
    if (alreadyNotified) return;

    const admins = await adminModel.find({}).select("_id").lean();
    if (admins.length > 0) {
        await notificationModel.insertMany(admins.map((admin) => ({
            recipient_role: "admin",
            recipient_id: admin._id,
            title,
            type: "inventory_alert",
            related_id: item._id,
            message,
            action_url: "/inventory/products",
        })));
    }
}

