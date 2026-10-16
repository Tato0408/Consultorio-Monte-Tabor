import adminModel from "../models/admin/admins.js";
import notificationModel from "../models/notifications/notification.js";
import patientsModel from "../models/patients/patients.js";
import doctorsModel from "../models/doctors/doctors.js";
import appointmentsModel from "../models/appointments/appointments.js";
import proceduresModel from "../models/procedures/procedures.js";
import consultationsModel from "../models/consultations/consultation.js";
import inventoryModel from "../models/inventory/inventory.js";

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

// Busca el doctor espejo vinculado a un admin (ver is_admin_mirror en el
// modelo Doctors). Recibe el id del admin y devuelve el id del espejo, o
// null si ese admin todavía no tiene uno.
export async function find_admin_mirror_id(admin_id) {
    if (!admin_id) return null;
    const mirror = await doctorsModel
        .findOne({ linked_admin_id: admin_id, is_admin_mirror: true })
        .select("_id")
        .lean();
    return mirror?._id || null;
}

// Redirige al admin las notificaciones dirigidas a su doctor espejo. Las
// citas del admin se guardan con el id del espejo como doctor_id, pero el
// admin inicia sesión con su propio id y rol, así que una notificación con
// recipient_role doctor nunca aparecería en su campana. Recibe la lista de
// notificaciones a insertar y devuelve una lista nueva con el destinatario
// resuelto, sin duplicar si el mismo admin queda dos veces para una cita.
export async function redirect_mirror_recipients(notifications) {
    const doctor_ids = [...new Set(
        notifications
            .filter((n) => n.recipient_role === "doctor" && n.recipient_id)
            .map((n) => String(n.recipient_id))
    )];
    if (doctor_ids.length === 0) return notifications;

    const mirrors = await doctorsModel
        .find({ _id: { $in: doctor_ids }, is_admin_mirror: true, linked_admin_id: { $ne: null } })
        .select("_id linked_admin_id")
        .lean();
    if (mirrors.length === 0) return notifications;

    const admin_by_mirror = new Map(mirrors.map((m) => [String(m._id), m.linked_admin_id]));
    const seen = new Set();
    const resolved = [];
    for (const notification of notifications) {
        const admin_id = notification.recipient_role === "doctor"
            ? admin_by_mirror.get(String(notification.recipient_id))
            : null;
        const item = admin_id
            ? { ...notification, recipient_role: "admin", recipient_id: admin_id }
            : notification;
        const key = `${item.recipient_role}:${item.recipient_id}:${item.appointment_id || ""}:${item.title}`;
        if (seen.has(key)) continue;
        seen.add(key);
        resolved.push(item);
    }
    return resolved;
}

// Inserta notificaciones del personal aplicando antes la redirección del
// doctor espejo al admin. Recibe una notificación o una lista.
export async function insert_staff_notifications(notifications) {
    const list = Array.isArray(notifications) ? notifications : [notifications];
    const resolved = await redirect_mirror_recipients(list.filter(Boolean));
    if (resolved.length > 0) {
        await notificationModel.insertMany(resolved);
    }
}

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
            // El portal público no tiene una ruta por id de cita, la pantalla
            // real es /mis-citas, la misma que usa patientPortalController.js.
            action_url: navigable ? "/mis-citas" : null,
        });
    }

    // La enfermera asignada (appointment.nurse_id) también recibe en la
    // campana los cambios de sus citas, igual que el doctor.
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

    // El actor nunca se notifica a sí mismo, tampoco cuando actúa como admin
    // sobre una cita de su doctor espejo.
    const resolved = (await redirect_mirror_recipients(notifications))
        .filter((n) => String(n.recipient_id) !== actorId);
    if (resolved.length > 0) {
        await notificationModel.insertMany(resolved);
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
    // La deduplicación es por insumo (related_id) y severidad (title), no
    // por el mensaje completo, ya que el mensaje incluye el stock actual,
    // que cambia con cada movimiento.
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

// Días de anticipación con que un insumo se considera próximo a vencer,
// la misma ventana que el virtual expiryStatus del modelo de inventario.
const expiry_warning_days = 30;
const day_ms = 24 * 60 * 60 * 1000;

// Formatea una fecha de vencimiento como texto legible en español.
const format_expiry_date = (date) => new Intl.DateTimeFormat("es-SV", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
}).format(new Date(date));

// Alerta de vencimiento de un insumo dirigida a todos los administradores.
// Recibe el insumo y crea a lo sumo una alerta de próximo a vencer y una de
// vencido por cada fecha de vencimiento registrada: la ventana de
// deduplicación se calcula desde esa fecha, así que si el insumo recibe una
// fecha nueva (lote nuevo) las alertas vuelven a generarse.
export async function notify_expiry_admins(item) {
    if (!item?.expiration_date) return;
    const expiration = new Date(item.expiration_date);
    if (isNaN(expiration.getTime())) return;

    const days_left = Math.ceil((expiration.getTime() - Date.now()) / day_ms);
    if (days_left > expiry_warning_days) return;

    const expired = days_left <= 0;
    const title = expired ? "Insumo vencido" : "Insumo próximo a vencer";
    const date_text = format_expiry_date(expiration);
    const message = expired
        ? `El insumo "${item.name}" venció el ${date_text}. Retíralo del inventario disponible.`
        : `El insumo "${item.name}" vence el ${date_text} (${days_left} día${days_left === 1 ? "" : "s"}).`;
    const window_start = expired
        ? expiration
        : new Date(expiration.getTime() - (expiry_warning_days + 1) * day_ms);

    const already_notified = await notificationModel.exists({
        recipient_role: "admin",
        type: "inventory_alert",
        related_id: item._id,
        title,
        createdAt: { $gte: window_start },
    });
    if (already_notified) return;

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

// Intervalo mínimo entre dos revisiones completas del inventario.
const inventory_check_interval_ms = 10 * 60 * 1000;
let last_inventory_check = 0;

// Revisa todo el inventario y genera las alertas de stock bajo, próximo a
// vencer y vencido que falten. El vencimiento depende del paso del tiempo y
// no de un movimiento, por eso se ejecuta de forma periódica (ver index.js)
// y al consultar la campana del admin. Se limita a una revisión cada 10
// minutos por proceso salvo que se pida force. Nunca lanza.
export async function run_inventory_alerts_check({ force = false } = {}) {
    if (!force && Date.now() - last_inventory_check < inventory_check_interval_ms) return;
    last_inventory_check = Date.now();
    try {
        const limit_date = new Date(Date.now() + expiry_warning_days * day_ms);
        const [expiring_items, low_stock_items] = await Promise.all([
            inventoryModel
                .find({ expiration_date: { $ne: null, $lte: limit_date } })
                .select("_id name expiration_date")
                .lean(),
            inventoryModel
                .find({ $expr: { $lte: ["$stock", "$min_stock"] } })
                .select("_id name stock min_stock unit_measure")
                .lean(),
        ]);
        for (const item of expiring_items) {
            await notify_expiry_admins(item);
        }
        for (const item of low_stock_items) {
            await notifyLowStockAdmins(item);
        }
    } catch (error) {
        console.log("Error revisando alertas de inventario:", error);
    }
}
