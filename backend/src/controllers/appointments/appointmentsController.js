import appointmentsModel from "../../models/appointments/appointments.js";
import patientsModel from "../../models/patients/patients.js";
import doctorsModel from "../../models/doctors/doctors.js";
import notificationModel from "../../models/notifications/notification.js";
import { isSlotFreeForDoctor } from "../schedule/scheduleController.js";
import { isNurseAvailable, isSlotFreeForNurse, anyNurseAvailable } from "../schedule/nurseScheduleController.js";
import { notifyAppointmentRecipients } from "../../services/notificationService.js";
import proceduresModel from "../../models/procedures/procedures.js";
import nursesModel from "../../models/nurses/nurses.js";
import consultationsModel from "../../models/consultations/consultation.js";
import { getNonNegativeError, escapeRegex } from "../../utils/validators.js";
import { RESCHEDULE_REASONS, isCancelLockedForPatient } from "../../utils/appointmentStatus.js";
import { buildActivePartiesAppointmentFilter, assertActiveParties } from "../../utils/activeScope.js";
import { deleteAppointmentCascade } from "../../services/consultationCascade.js";
import { resolveProcedures, resolveProcedureFlags } from "../../utils/procedureAggregation.js";

const appointmentsController = {};

// Falsy-check que además detecta un array vacío ([] es truthy en JS, así que
// "!procedure_ids" solo no bastaba una vez que el campo pasó a ser una lista).
const sinProcedimientos = (procedureIds) =>
    !procedureIds || (Array.isArray(procedureIds) && procedureIds.length === 0);

const toMinutes = (t) => {
    const [h, m] = String(t || "0:0").split(":").map(Number);
    return h * 60 + m;
};

// A diferencia del paciente (que siempre toma type/duración/total del
// catálogo), el personal sí puede fijar un costo distinto al de lista
// (descuentos, tarifas especiales), así que total no se fuerza aquí. Lo que
// sí se valida es que duration_minutes sea coherente con el horario elegido
// y con la SUMA de la duración real de los procedimientos elegidos — evita
// que una cita quede con datos internamente contradictorios si el
// formulario falla o cambia.
async function validateStaffServiceCoherence({ procedure_ids, type, duration_minutes, start_time, end_time }) {
    const rangeMinutes = toMinutes(end_time) - toMinutes(start_time);
    if (rangeMinutes <= 0 || Number(duration_minutes) !== rangeMinutes) {
        return "La duración no coincide con el horario seleccionado.";
    }

    // La Consulta Médica General ahora es un procedimiento real más: ya no hay un caso
    // "sin procedimiento" válido para el personal, siempre debe venir al menos uno.
    if (sinProcedimientos(procedure_ids)) {
        return "Debes seleccionar al menos un procedimiento.";
    }

    const resolved = await resolveProcedures(procedure_ids);
    if (!resolved) {
        return "Uno o más procedimientos seleccionados no están disponibles.";
    }
    if (type !== resolved.type || Number(duration_minutes) !== resolved.duration_minutes) {
        return "Los datos del procedimiento no son válidos.";
    }
    return null;
}

// Interpreta "YYYY-MM-DD" como año/mes/día locales, evitando el corrimiento
// de un día que provoca leer una fecha UTC con métodos de hora local.
function getDayRange(dateInput) {
    let year, month, day;
    if (dateInput instanceof Date) {
        // Si ya es una fecha real, se toman sus componentes locales.
        year = dateInput.getFullYear();
        month = dateInput.getMonth() + 1;
        day = dateInput.getDate();
    } else {
        const datePart = String(dateInput).trim().split("T")[0];
        [year, month, day] = datePart.split("-").map(Number);
    }
    const start = new Date(year, month - 1, day, 0, 0, 0, 0);
    const end = new Date(year, month - 1, day, 23, 59, 59, 999);
    return { start, end };
}

// Tiempo máximo que una solicitud puede esperar sin que ningún proveedor la acepte
// antes de pasar a "por reagendar", aunque su fecha todavía no haya llegado.
const PENDING_EXPIRATION_MS = 48 * 60 * 60 * 1000;

// Tiempo máximo que una cita con anticipo en línea espera en "pending_payment" (creada,
// pero el paciente todavía no llega a pagar/abandona la pantalla de tarjeta) antes de
// borrarse sola. Nunca llegó a ser una solicitud real (nadie fue notificado, no ocupa el
// horario para nadie más, ver OCCUPYING_STATUSES), así que no hace falta "cancelarla" con
// motivo: se elimina directo. 30 min es de sobra para completar un formulario de tarjeta.
const PENDING_PAYMENT_EXPIRATION_MS = 30 * 60 * 1000;

// Transiciones automáticas por el paso del tiempo. No hay cron: esto se corre de forma
// perezosa al listar citas (getAppointments), igual que el resto del proyecto.
//   1) scheduled cuya hora de fin ya pasó y no se realizó la consulta  -> no_show.
//   2) pending cuya hora de fin ya pasó, o que lleva +48 h sin aceptar  -> needs_reschedule
//      (el paciente puede reagendarla; ver appointmentStatus.js), con notificación.
// Margen tras la hora de fin antes de dar una cita aceptada por "No se presentó": el
// doctor puede estar atendiendo con retraso. Al pasar este margen sin que se registre la
// consulta, se asume que el paciente no llegó.
const NO_SHOW_GRACE_MS = 60 * 60 * 1000;

// Se exporta para que otros endpoints self-service del paciente (ej.
// patientSelfController.getMyConsultations, que alimenta el dashboard de la app móvil)
// apliquen las mismas transiciones perezosas al leer, sin depender de que el paciente
// pase antes por la pantalla de citas.
export async function runAppointmentAutoTransitions() {
    const now = new Date();
    const { start: startOfToday, end: endOfToday } = getDayRange(now);
    const fmtTime = (d) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    const currentTime = fmtTime(now);
    const staleCutoff = new Date(now.getTime() - PENDING_EXPIRATION_MS);

    // 0) Anticipos nunca pagados: se borran solas, liberando el horario.
    await appointmentsModel.deleteMany({
        status: "pending_payment",
        createdAt: { $lt: new Date(now.getTime() - PENDING_PAYMENT_EXPIRATION_MS) },
    });

    // "Hora de fin ya pasó (sin margen)": para las solicitudes sin aceptar.
    const pastEndTime = [
        { date: { $lt: startOfToday } },
        { date: { $gte: startOfToday, $lte: endOfToday }, end_time: { $lte: currentTime } },
    ];

    // "Hora de fin pasó + margen": para las citas ya aceptadas.
    const graceMoment = new Date(now.getTime() - NO_SHOW_GRACE_MS);
    const graceSameDay = graceMoment.getDate() === now.getDate() && graceMoment.getMonth() === now.getMonth();
    const pastEndPlusGrace = [
        { date: { $lt: startOfToday } },
        ...(graceSameDay
            ? [{ date: { $gte: startOfToday, $lte: endOfToday }, end_time: { $lte: fmtTime(graceMoment) } }]
            : []),
    ];

    // 1) Citas ya aceptadas que no se realizaron -> No se presentó. (Si la consulta se
    //    hubiera hecho, la propia consulta la habría puesto en "completed".)
    await appointmentsModel.updateMany(
        { status: "scheduled", $or: pastEndPlusGrace },
        { $set: { status: "no_show" } }
    );

    // 2) Solicitudes que ningún proveedor aceptó a tiempo -> por reagendar.
    const notAccepted = await appointmentsModel
        .find({ status: "pending", $or: [...pastEndTime, { createdAt: { $lt: staleCutoff } }] })
        .select("_id patient_id");

    if (notAccepted.length > 0) {
        await appointmentsModel.updateMany(
            { _id: { $in: notAccepted.map((a) => a._id) } },
            { $set: { status: "needs_reschedule", reschedule_reason: RESCHEDULE_REASONS.NOT_ACCEPTED } }
        );
        await notificationModel.insertMany(notAccepted.map((a) => ({
            recipient_role: "patient",
            recipient_id: a.patient_id,
            title: "Cita sin aceptar",
            type: "appointment_reschedule_needed",
            // Mismo texto que RESCHEDULE_REASON_TEXT/MOTIVO_REAGENDAR (móvil y portal
            // público) para que la notificación diga exactamente lo mismo que el aviso que
            // el paciente ve al abrir el detalle de la cita.
            message: "Ningún profesional aceptó tu cita a tiempo. Elige una nueva fecha y hora.",
            appointment_id: a._id,
            // El portal público no tiene /appointments/:id/edit; la pantalla real es
            // /mis-citas (ver patientPortalController.js y notificationService.js).
            action_url: "/mis-citas",
        })));
    }

    // 3) Recordatorio de cita, un día antes: se compara por día (no por hora exacta), ya que
    //    esto corre de forma perezosa cada vez que el paciente entra a alguna pantalla de
    //    citas, no en un horario fijo. Solo aplica a citas ya confirmadas (scheduled) — una
    //    "pending" todavía puede no tener proveedor, recordarla sería prematuro. Se deduplica
    //    contra la propia notificación ya creada, para no repetirla en cada carga.
    const { start: startOfTomorrow, end: endOfTomorrow } = getDayRange(new Date(now.getTime() + 24 * 60 * 60 * 1000));
    const upcoming = await appointmentsModel
        .find({ status: "scheduled", date: { $gte: startOfTomorrow, $lte: endOfTomorrow } })
        .select("_id patient_id start_time");

    if (upcoming.length > 0) {
        const yaNotificadas = await notificationModel.distinct("appointment_id", {
            type: "appointment_reminder",
            appointment_id: { $in: upcoming.map((a) => a._id) },
        });
        const yaNotificadasSet = new Set(yaNotificadas.map(String));
        const pendientes = upcoming.filter((a) => !yaNotificadasSet.has(String(a._id)));

        if (pendientes.length > 0) {
            await notificationModel.insertMany(pendientes.map((a) => ({
                recipient_role: "patient",
                recipient_id: a.patient_id,
                title: "Recordatorio de cita",
                type: "appointment_reminder",
                message: `Tienes una cita mañana a las ${a.start_time}. No olvides asistir.`,
                appointment_id: a._id,
                action_url: "/mis-citas",
            })));
        }
    }
}

// Al aceptar/asignar una cita, el cupo de ESE proveedor a ESA hora queda tomado. Las
// demás solicitudes (pending) del MISMO proveedor que se solapan con ese horario ya no
// pueden concretarse: pasan a needs_reschedule para que esos pacientes reagenden. Las
// solicitudes "sin proveedor elegido" (doctor_id / nurse_id null) no se tocan: otro
// proveedor todavía puede aceptarlas. Nunca debe tumbar la aceptación si algo falla.
async function bumpCompetingRequests(accepted) {
    const providerFilter = accepted.doctor_id
        ? { doctor_id: accepted.doctor_id }
        : accepted.nurse_id
        ? { nurse_id: accepted.nurse_id }
        : null;
    if (!providerFilter) return;

    const { start, end } = getDayRange(accepted.date);
    const competitors = await appointmentsModel
        .find({
            _id: { $ne: accepted._id },
            status: "pending",
            ...providerFilter,
            date: { $gte: start, $lte: end },
        })
        .select("_id patient_id start_time end_time");

    const aStart = toMinutes(accepted.start_time);
    const aEnd = toMinutes(accepted.end_time);
    const overlapping = competitors.filter((c) => toMinutes(c.start_time) < aEnd && toMinutes(c.end_time) > aStart);
    if (overlapping.length === 0) return;

    await appointmentsModel.updateMany(
        { _id: { $in: overlapping.map((c) => c._id) } },
        { $set: { status: "needs_reschedule", reschedule_reason: RESCHEDULE_REASONS.SLOT_TAKEN } }
    );
    await notificationModel.insertMany(overlapping.map((c) => ({
        recipient_role: "patient",
        recipient_id: c.patient_id,
        title: "Tu cupo ya fue asignado",
        type: "appointment_reschedule_needed",
        // Mismo texto que RESCHEDULE_REASON_TEXT/MOTIVO_REAGENDAR (móvil y portal
        // público), ver la nota equivalente en runAppointmentAutoTransitions.
        message: "El horario que solicitaste se le asignó a otro paciente. Elige una nueva fecha y hora.",
        appointment_id: c._id,
        action_url: "/mis-citas",
    })));
}

// Lista citas con paginación, filtros y búsqueda.
appointmentsController.getAppointments = async (req, res) => {
    try {
        await runAppointmentAutoTransitions();

        const {
            date,
            dateFrom,
            dateTo,
            status,
            doctor_id,
            patient_id,
            type,
            appointment_type,
            search,
            sortOrder,
            page = 1,
            limit = 10,
        } = req.query;

        const filters = {};

        // Filtro por un día exacto.
        if (date) {
            const { start, end } = getDayRange(date);
            filters.date = { $gte: start, $lte: end };
        }

        // Filtro por rango de fechas.
        if (dateFrom || dateTo) {
            filters.date = filters.date || {};
            if (dateFrom) {
                filters.date.$gte = getDayRange(dateFrom).start;
            }
            if (dateTo) {
                filters.date.$lte = getDayRange(dateTo).end;
            }
        }

        // Filtro por estado; admite una lista separada por comas.
        if (status) {
            const statusList = status.split(",").map(s => s.trim());
            filters.status = statusList.length > 1 ? { $in: statusList } : statusList[0];
        }

        // "pending_payment" es un estado transitorio interno (anticipo en línea creado
        // pero todavía sin confirmar, ver bookAppointment/activateAfterDeposit): nunca
        // llegó a ser una solicitud real, así que no debe listarse en ningún rol ni
        // filtro como si la cita ya existiera — se excluye siempre, sin importar qué
        // status se haya pedido.
        filters.$and = (filters.$and || []).concat([{ status: { $ne: "pending_payment" } }]);

        if (doctor_id) {
            filters.doctor_id = doctor_id;
        }

        if (patient_id) {
            filters.patient_id = patient_id;
        }

        // Filtro por tipo de servicio (Consulta Médica General / Procedimiento).
        if (type) {
            filters.type = type;
        }

        // Filtro por "Tipo de cita" del catálogo global del admin (ver
        // AppointmentTypesSection.jsx) — es un campo aparte de "type": solo
        // categoriza/colorea la cita, no define su precio ni duración.
        if (appointment_type) {
            filters.appointment_type = appointment_type;
        }

        // Búsqueda libre por paciente, doctor, tipo o descripción; primero se
        // resuelven los ids de paciente/doctor que coinciden con el texto.
        if (search) {
            // escapeRegex evita un patrón con backtracking catastrófico (ReDoS): antes se
            // pasaba el texto del usuario directo a RegExp, a diferencia de los otros 3
            // usos de RegExp en el backend (tipos de cita, inventario, procedimientos),
            // que ya escapaban.
            const regex = new RegExp(escapeRegex(search), "i");
            const [matchingPatients, matchingDoctors] = await Promise.all([
                patientsModel.find({ $or: [{ name: regex }, { last_name: regex }] }).select("_id"),
                doctorsModel.find({ $or: [{ name: regex }, { last_name: regex }] }).select("_id"),
            ]);

            filters.$or = [
                { type: regex },
                { description: regex },
                { patient_id: { $in: matchingPatients.map(p => p._id) } },
                { doctor_id: { $in: matchingDoctors.map(d => d._id) } },
            ];
        }

        // Alcance forzado por rol: el doctor solo ve las suyas; la
        // recepcionista no ve las que aún no han sido aceptadas.
        if (req.user.role === "doctor") {
            // Ve sus citas y las solicitudes aún sin tomar para poder aceptarlas. Se excluyen
            // las solicitudes de un procedimiento sin doctor (requires_doctor false): esas
            // solo debe verlas y aceptarlas la enfermera (ver rama "nurse" más abajo), el
            // doctor no puede tomarlas (acceptAppointment las rechazaría de todos modos).
            const doctorEligibleProcedures = await proceduresModel.find({ requires_doctor: { $ne: false } }).select("_id");
            filters.$and = (filters.$and || []).concat([{
                $or: [
                    { doctor_id: req.user.id },
                    { doctor_id: null, status: "pending", procedure_id: { $in: doctorEligibleProcedures.map(p => p._id) } },
                ],
            }]);
        } else if (req.user.role === "nurse") {
            // Mismo criterio que el doctor: ve las citas donde ya es la enfermera asignada
            // (proveedora principal o de apoyo) y las solicitudes aún sin tomar de un
            // procedimiento sin doctor (ahí ella es la proveedora principal, ver
            // patientPortalController.bookAppointment), para poder aceptarlas. Un
            // procedimiento con doctor + enfermera de apoyo no entra en el segundo caso: esa
            // enfermera la elige el doctor/admin al aceptar/asignar, no hay solicitud propia
            // que la enfermera deba tomar ella misma.
            const nurseOnlyProcedures = await proceduresModel.find({ requires_doctor: false }).select("_id");
            filters.$and = (filters.$and || []).concat([{
                $or: [
                    { nurse_id: req.user.id },
                    { nurse_id: null, status: "pending", procedure_id: { $in: nurseOnlyProcedures.map(p => p._id) } },
                ],
            }]);
        } else if (req.user.role === "patient") {
            filters.patient_id = req.user.id;
        } else if (req.user.role === "receptionist") {
            if (filters.status) {
                filters.$and = (filters.$and || []).concat([{ status: filters.status }, { status: { $ne: "pending" } }]);
                delete filters.status;
            } else {
                filters.status = { $ne: "pending" };
            }
        }

        // Un paciente o doctor inactivo desaparece de la gestion de citas: sus
        // citas no se listan en el calendario ni en la interfaz de consultas.
        // No aplica al propio paciente (solo ve las suyas y no tiene sesion si
        // esta inactivo).
        if (req.user.role !== "patient") {
            const activePartiesFilter = await buildActivePartiesAppointmentFilter();
            if (Object.keys(activePartiesFilter).length > 0) {
                filters.$and = (filters.$and || []).concat([activePartiesFilter]);
            }
        }

        const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
        const limitNumber = Math.max(parseInt(limit, 10) || 10, 1);
        const skip = (pageNumber - 1) * limitNumber;

        // Orden por fecha: ascendente por defecto, descendente si se pide.
        const dateDirection = sortOrder === "asc" ? 1 : -1;

        const [appointments, total] = await Promise.all([
            appointmentsModel
                .find(filters)
                .populate("doctor_id", "name last_name specialty img_url")
                .populate("nurse_id", "name last_name img_url")
                .populate({ path: "patient_id", model: "Patients", select: "name last_name" })
                .populate({ path: "procedure_id", model: "procedure", select: "name requires_nurse requires_doctor" })
                // createdAt asc como desempate: si dos solicitudes son para la misma
                // fecha y hora, en "Por aceptar" aparece primero la que se solicitó antes.
                .sort({ date: dateDirection, start_time: dateDirection, createdAt: 1 })
                .skip(skip)
                .limit(limitNumber),
            appointmentsModel.countDocuments(filters),
        ]);

        // Para la enfermera: marca cada cita cuya consulta ya registrada le
        // falta la nota de enfermería (procedimiento que exige enfermera y
        // ella es la asignada). Alimenta el ícono de warning de la tabla de
        // consultas.
        let responseData = appointments;
        if (req.user.role === "nurse") {
            const noteCandidateIds = appointments
                .filter((a) => a.nurse_id && (a.procedure_id || []).some((p) => p.requires_nurse))
                .map((a) => a._id);
            const noteByAppointment = new Map();
            if (noteCandidateIds.length > 0) {
                const consultations = await consultationsModel
                    .find({ appointment_id: { $in: noteCandidateIds } })
                    .select("appointment_id nurse_note")
                    .lean();
                for (const consultation of consultations) {
                    noteByAppointment.set(String(consultation.appointment_id), consultation.nurse_note);
                }
            }
            responseData = appointments.map((appointment) => {
                const plain = appointment.toObject();
                const key = String(appointment._id);
                const isCandidate = appointment.nurse_id && (appointment.procedure_id || []).some((p) => p.requires_nurse);
                plain.nurse_note_pending = Boolean(
                    isCandidate
                    && noteByAppointment.has(key)
                    && !String(noteByAppointment.get(key) || "").trim()
                );
                return plain;
            });
        }

        return res.status(200).json({
            data: responseData,
            pagination: {
                page: pageNumber,
                limit: limitNumber,
                total,
                totalPages: Math.ceil(total / limitNumber) || 1,
            },
        });

    } catch (error) {
        console.log("error" + error);
        return res.status(500).json({ message: "Error interno del servidor" });
    }
};

// Devuelve una cita puntual del paciente autenticado. El filtro por
// patient_id evita consultar citas ajenas cambiando el id de la URL.
appointmentsController.getPatientAppointmentById = async (req, res) => {
    try {
        if (req.user.role !== "patient") {
            return res.status(403).json({ message: "Acceso denegado." });
        }
        const appointment = await appointmentsModel
            .findOne({ _id: req.params.id, patient_id: req.user.id })
            .populate("doctor_id", "name last_name specialty img_url")
            .populate({ path: "nurse_id", model: "nurses", select: "name last_name img_url" })
            .populate({ path: "procedure_id", model: "procedure", select: "name requires_nurse requires_doctor" });
        if (!appointment) {
            return res.status(404).json({ message: "No se encontró la cita." });
        }
        return res.status(200).json({ data: appointment });
    } catch (error) {
        return res.status(500).json({ message: "No se pudo cargar la cita." });
    }
};

// Resumen de citas del día: contadores y la próxima cita confirmada.
appointmentsController.getAppointmentsStats = async (req, res) => {
    try {
        const { date } = req.query;

        const { start, end } = getDayRange(date || new Date());

        const dayFilter = { date: { $gte: start, $lte: end } };
        // El doctor solo ve estadísticas de sus propias citas. La enfermera queda asignada a
        // citas propias vía nurse_id (como proveedora principal de un procedimiento sin
        // doctor, o de apoyo), así que aplica el mismo criterio; sin esto veía los números de
        // toda la clínica en vez de los suyos.
        if (req.user.role === "doctor") {
            dayFilter.doctor_id = req.user.id;
        } else if (req.user.role === "nurse") {
            dayFilter.nurse_id = req.user.id;
        }

        // "Completados" cuenta las citas atendidas HOY (updatedAt), no las
        // agendadas para hoy: una cita agendada hace semanas que recién se
        // completa hoy debe contar igual, y una agendada para hoy que se
        // completa después no debe quedarse contada como si fuera de hoy.
        const completedFilter = { status: "completed", updatedAt: { $gte: start, $lte: end } };
        if (req.user.role === "doctor") {
            completedFilter.doctor_id = req.user.id;
        } else if (req.user.role === "nurse") {
            completedFilter.nurse_id = req.user.id;
        }

        const [scheduled, waiting, completed] = await Promise.all([
            appointmentsModel.countDocuments({ ...dayFilter, status: { $in: ["scheduled", "completed"] } }),
            appointmentsModel.countDocuments({ ...dayFilter, status: "scheduled" }),
            appointmentsModel.countDocuments(completedFilter),
        ]);

        // La tarjeta de "proxima cita" no debe mostrar la cita de un paciente o
        // doctor inactivo, aunque los contadores de arriba si conserven la
        // historia.
        const activePartiesFilter = await buildActivePartiesAppointmentFilter();

        // Busca la próxima cita "scheduled" de hoy con hora igual o mayor a la actual.
        let nextAppointment = await appointmentsModel
            .findOne({ ...dayFilter, ...activePartiesFilter, status: "scheduled", start_time: { $gte: currentTimeString() } })
            .sort({ start_time: 1 })
            .populate("doctor_id", "name last_name specialty img_url")
            .populate({ path: "patient_id", model: "Patients", select: "name last_name" });

        // Si no hay ninguna hoy, busca la siguiente en días futuros.
        if (!nextAppointment) {
            nextAppointment = await appointmentsModel
                .findOne({
                    ...activePartiesFilter,
                    date: { $gt: end },
                    status: "scheduled",
                    ...(req.user.role === "doctor" ? { doctor_id: req.user.id } : {}),
                    ...(req.user.role === "nurse" ? { nurse_id: req.user.id } : {}),
                })
                .sort({ date: 1, start_time: 1 })
                .populate("doctor_id", "name last_name specialty img_url")
                .populate({ path: "patient_id", model: "Patients", select: "name last_name" });
        }

        return res.status(200).json({
            scheduled,
            waiting,
            completed,
            nextAppointment: nextAppointment || null,
        });
    } catch (error) {
        console.log("error" + error);
        return res.status(500).json({ message: "Error interno del servidor" });
    }
};

// Retorna la hora actual en formato "HH:mm" para comparar contra start_time.
function currentTimeString() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
}

// Trae una cita puntual con los datos del paciente, doctor y enfermera.
appointmentsController.getAppointmentById = async (req, res) => {
    try {
        const { id } = req.params;

        await runAppointmentAutoTransitions();

        const appointment = await appointmentsModel.findById(id)
            .populate({ path: "patient_id", model: "Patients", select: "name last_name phone gender birth_date dui clinical_history.blood_type clinical_history.blood_type_verified email clinical_history.hereditary clinical_history.pathological clinical_history.non_pathological clinical_history.ecologycal_social is_active" })
            .populate("doctor_id", "name last_name is_active")
            .populate("nurse_id", "name last_name");

        if (!appointment) {
            return res.status(404).json({ message: "Cita no encontrada" });
        }

        // Una cita de un paciente o doctor inactivo no se muestra al personal:
        // se responde como si no existiera para que la interfaz de consultas y
        // el formulario de edicion la traten igual que una cita eliminada.
        if (appointment.patient_id?.is_active === false || appointment.doctor_id?.is_active === false) {
            return res.status(404).json({ message: "Cita no encontrada" });
        }

        // El doctor solo puede ver el detalle de sus propias citas, salvo que sea una
        // solicitud "pending" sin doctor asignado (procedimiento abierto a cualquier
        // doctor, la misma que ya le aparece en "Por aceptar" vía getAppointments):
        // antes esto daba "No tienes acceso a esta cita" al entrar desde la notificación
        // de una cita nueva sin doctor específico.
        const esSolicitudAbierta = appointment.status === "pending" && !appointment.doctor_id;
        if (req.user.role === "doctor" && !esSolicitudAbierta && appointment.doctor_id?._id?.toString() !== req.user.id && appointment.doctor_id?.toString() !== req.user.id) {
            return res.status(403).json({ message: "No tienes acceso a esta cita." });
        }

        return res.status(200).json(appointment);
    } catch (error) {
        console.log("error " + error);
        return res.status(500).json({ message: "Error interno del servidor" });
    }
};

// Crea una cita nueva.
appointmentsController.insertAppointment = async (req, res) => {
    try {
        let {
            doctor_id,
            patient_id,
            nurse_id,
            procedure_id,
            procedure_ids,
            schedule_id,
            type,
            appointment_type,
            date,
            start_time,
            end_time,
            duration_minutes,
            description,
            status,
            total,
            cancellation_reason,
            confirm_no_nurse,
        } = req.body;
        // Acepta procedure_ids (nombre nuevo, lo que mandan los formularios ya
        // actualizados) o procedure_id (nombre de siempre, admite además un solo id
        // suelto para no romper ningún cliente viejo que todavía no se haya actualizado).
        procedure_id = procedure_ids ?? procedure_id;

        // Sanitiza los campos de texto.
        type = type?.trim();
        description = description?.trim();
        cancellation_reason = cancellation_reason?.trim();

        // La fecha se persiste siempre como inicio del día local del servidor,
        // sin importar quién la mande. El personal (doctor/admin/recepción) la
        // envía como ISO completo (Date.toISOString() del navegador), que cae
        // en un instante distinto al mediodía local según el huso horario del
        // cliente; sin normalizar, ese corrimiento hacía que un filtro
        // dateFrom (límite $gte, sin margen) excluyera citas creadas hoy
        // mismo, y que los contadores/historial del día no coincidieran.
        if (date != null) {
            date = getDayRange(date).start;
        }

        // Un doctor que crea una cita solo puede asignársela a sí mismo, sin
        // importar el payload; admin y recepción sí eligen doctor.
        if (req.user.role === "doctor") {
            doctor_id = req.user.id;
        }
        if (req.user.role === "patient") {
            patient_id = req.user.id;
            doctor_id = null;
            status = "pending";

            // El precio, duración y tipo salen del catálogo del servidor; el
            // paciente solo elige el/los servicio(s), nunca esos valores. Se puede elegir
            // más de un procedimiento: duración y precio son la suma de todos.
            const service = await resolveProcedures(procedure_id);
            if (!service) {
                return res.status(400).json({ message: "Uno o más procedimientos seleccionados no están disponibles." });
            }
            procedure_id = service.procedure_ids;
            type = service.type;
            duration_minutes = service.duration_minutes;
            total = service.total;
        }

        // Un procedimiento sin doctor (requires_doctor false) se agenda con una enfermera
        // como proveedora principal: el personal (admin/recepción/enfermera) no elige
        // doctor ahí, nurse_id lo reemplaza. Con varios procedimientos elegidos, alcanza
        // con que UNO requiera doctor para que la cita entera lo requiera. No aplica a la
        // rama "patient" de arriba (ese flujo del portal público vive en
        // patientPortalController.bookAppointment).
        let procedureRequiresDoctor = true;
        let procedureRequiresNurse = false;
        if (req.user.role !== "patient" && !sinProcedimientos(procedure_id)) {
            const flags = await resolveProcedureFlags(procedure_id);
            procedureRequiresDoctor = flags.requiresDoctor;
            procedureRequiresNurse = flags.requiresNurse;
            if (!procedureRequiresDoctor) {
                doctor_id = null;
                if (!nurse_id) {
                    return res.status(400).json({ message: "Este procedimiento no requiere doctor: selecciona una enfermera." });
                }
            }
        }

        // Valida que estén los campos obligatorios. procedure_id es obligatorio para
        // cualquier cita ahora (la Consulta Médica General es un procedimiento real más,
        // ya no un caso "sin procedimiento"); para el paciente ya quedó resuelto arriba.
        if ((!doctor_id && req.user.role !== "patient" && procedureRequiresDoctor) || !patient_id || sinProcedimientos(procedure_id) || !type || date == null || !start_time || !end_time || duration_minutes == null || !status || total == null) {
            return res.status(400).json({ message: "Completa todos los campos requeridos." });
        }

        // Valida la longitud de la descripción si se envió.
        if (description && (description.length < 3 || description.length > 500)) {
            return res
                .status(400)
                .json({ message: "La descripción debe tener entre 3 y 500 caracteres." });
        }

        const validStatus = [
            "pending",
            "scheduled",
            "completed",
            "cancelled",
            "no_show",
            "expired"
        ];

        // Valida que el status sea uno de los permitidos.
        if (!validStatus.includes(status)) {
            return res.status(400).json({ message: "Estado de la cita inválido" });
        }

        const numberError = getNonNegativeError(total, "El costo total")
            || getNonNegativeError(duration_minutes, "La duración");
        if (numberError) {
            return res.status(400).json({ message: numberError });
        }

        if (req.user.role !== "patient") {
            const coherenceError = await validateStaffServiceCoherence({ procedure_ids: procedure_id, type, duration_minutes, start_time, end_time });
            if (coherenceError) {
                return res.status(400).json({ message: coherenceError });
            }
        }

        // Revalida contra la base de datos que el horario elegido sigue libre, sin confiar en
        // que la lista de horarios sugeridos que vio el cliente siga vigente (pudo quedar
        // desactualizada, o dos personas intentar agendar el mismo horario casi al mismo
        // tiempo). Antes esto nunca se comprobaba al guardar, solo al calcular qué horarios
        // sugerir: la sugerencia excluía bien los solapados, pero nada revisaba de nuevo el
        // horario realmente enviado, así que una cita podía terminar guardada encima de otra
        // ya existente. Se revisan doctor y enfermera por separado: una cita puede tener
        // ambos (enfermera de apoyo) y cualquiera de los dos podría ya estar ocupado.
        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
        if (doctor_id) {
            const { free, reason } = await isSlotFreeForDoctor(doctor_id, dateStr, start_time, end_time);
            if (!free) return res.status(400).json({ message: reason || "Ese horario ya no está disponible para el doctor." });
        }
        if (nurse_id) {
            const { free, reason } = await isSlotFreeForNurse(nurse_id, dateStr, start_time, end_time, appointmentsModel);
            if (!free) return res.status(400).json({ message: reason || "Ese horario ya no está disponible para la enfermera." });
        }

        // Procedimiento con doctor + enfermera de apoyo, sin enfermera asignada todavía: se
        // permite igual que en acceptAppointment/assignDoctor, solo con confirm_no_nurse Y
        // solo si de verdad no hay ninguna enfermera libre para este horario (evita que el
        // bypass sirva para saltarse la asignación cuando sí hay alguna disponible).
        if (procedureRequiresDoctor && procedureRequiresNurse && !nurse_id) {
            if (!confirm_no_nurse) {
                return res.status(400).json({ message: "Este procedimiento requiere seleccionar una enfermera.", code: "NURSE_REQUIRED" });
            }
            const hayEnfermeraLibre = await anyNurseAvailable(dateStr, start_time, end_time);
            if (hayEnfermeraLibre) {
                return res.status(400).json({ message: "Hay enfermeras disponibles para este horario: selecciona una." });
            }
        }

        // Un paciente o doctor inactivo no puede asignarse a una cita nueva.
        const inactivePartyError = await assertActiveParties({ patientId: patient_id, doctorId: doctor_id });
        if (inactivePartyError) {
            return res.status(400).json({ message: inactivePartyError });
        }

        const newAppointment = new appointmentsModel({
            doctor_id,
            patient_id,
            nurse_id,
            procedure_id,
            schedule_id,
            type,
            appointment_type,
            date,
            start_time,
            end_time,
            duration_minutes,
            description,
            status,
            total,
            cancellation_reason,
        });

        await newAppointment.save();

        // Si el personal la creó ya agendada, el cupo de ese proveedor a esa hora quedó
        // tomado: las solicitudes de pacientes que competían por ese mismo horario pasan a
        // "por reagendar".
        if (newAppointment.status === "scheduled") {
            await bumpCompetingRequests(newAppointment).catch((e) => console.log("Error bumpeando solicitudes rivales:", e));
        }

        // Informa al profesional y al paciente sin incluir diagnósticos ni
        // otros datos clínicos en la campana.
        await notifyAppointmentRecipients(newAppointment, {
            doctorMessage: req.user.role === "receptionist"
                ? "Recepción te asignó una nueva cita."
                : "Se te asignó una nueva cita.",
            patientMessage: "La clínica registró una cita para ti.",
            nurseMessage: "Se te asignó como enfermera de una nueva cita.",
            doctorTitle: "Nueva cita asignada",
            patientTitle: "Nueva cita registrada",
            nurseTitle: "Nueva cita asignada",
            type: "appointment_created",
            actor: req.user,
        }).catch((error) => console.log("Error notificando nueva cita:", error));

        return res.status(201).json({ message: "Cita creada correctamente" });
    } catch (error) {
        console.log("error" + error);
        return res.status(500).json({ message: "Error interno del servidor" });
    }
};

// Actualiza una cita existente.
appointmentsController.updateAppointment = async (req, res) => {
    try {
        let {
            doctor_id,
            patient_id,
            nurse_id,
            procedure_id,
            procedure_ids,
            type,
            appointment_type,
            date,
            start_time,
            end_time,
            duration_minutes,
            description,
            status,
            total,
            cancellation_reason,
            confirm_no_nurse,
        } = req.body;
        procedure_id = procedure_ids ?? procedure_id;

        // Sanitiza los campos de texto.
        type = type?.trim();
        description = description?.trim();
        cancellation_reason = cancellation_reason?.trim();

        // Misma normalización que insertAppointment: siempre inicio del día
        // local del servidor, sin importar el huso horario del cliente.
        if (date != null) {
            date = getDayRange(date).start;
        }

        // Igual que insertAppointment: un procedimiento sin doctor (requires_doctor false)
        // se reagenda con una enfermera como proveedora principal, nurse_id reemplaza a
        // doctor_id. Con varios procedimientos elegidos, alcanza con que UNO requiera
        // doctor para que la cita entera lo requiera.
        let procedureRequiresDoctor = true;
        let procedureRequiresNurse = false;
        if (!sinProcedimientos(procedure_id)) {
            const flags = await resolveProcedureFlags(procedure_id);
            procedureRequiresDoctor = flags.requiresDoctor;
            procedureRequiresNurse = flags.requiresNurse;
            if (!procedureRequiresDoctor) {
                doctor_id = null;
                if (!nurse_id) {
                    return res.status(400).json({ message: "Este procedimiento no requiere doctor: selecciona una enfermera." });
                }
            }
        }

        // Valida que estén los campos obligatorios. procedure_id es obligatorio para
        // cualquier cita ahora (ver el mismo comentario en insertAppointment).
        if ((!doctor_id && procedureRequiresDoctor) || !patient_id || sinProcedimientos(procedure_id) || !type || date == null || !start_time || !end_time || duration_minutes == null || !status || total == null) {
            return res.status(400).json({ message: "Completa todos los campos requeridos." });
        }

        // Valida la longitud de la descripción si se envió.
        if (description && (description.length < 3 || description.length > 500)) {
            return res
                .status(400)
                .json({ message: "La descripción debe tener entre 3 y 500 caracteres." });
        }

        const validStatus = [
            "pending",
            "scheduled",
            "completed",
            "cancelled",
            "no_show",
            "expired"
        ];

        // Valida que el status sea uno de los permitidos.
        if (!validStatus.includes(status)) {
            return res.status(400).json({ message: "Estado de la cita inválido" });
        }

        const numberError = getNonNegativeError(total, "El costo total")
            || getNonNegativeError(duration_minutes, "La duración");
        if (numberError) {
            return res.status(400).json({ message: numberError });
        }

        const coherenceError = await validateStaffServiceCoherence({ procedure_ids: procedure_id, type, duration_minutes, start_time, end_time });
        if (coherenceError) {
            return res.status(400).json({ message: coherenceError });
        }

        // Misma revalidación que insertAppointment (ver el comentario ahí): el horario
        // elegido debe seguir libre de verdad, no solo haberlo estado cuando se calculó la
        // lista de sugerencias. excludeAppointmentId es la propia cita que se está editando,
        // para que no choque contra sí misma (su horario actual, antes de este cambio).
        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
        if (doctor_id) {
            const { free, reason } = await isSlotFreeForDoctor(doctor_id, dateStr, start_time, end_time, req.params.id);
            if (!free) return res.status(400).json({ message: reason || "Ese horario ya no está disponible para el doctor." });
        }
        if (nurse_id) {
            const { free, reason } = await isSlotFreeForNurse(nurse_id, dateStr, start_time, end_time, appointmentsModel, req.params.id);
            if (!free) return res.status(400).json({ message: reason || "Ese horario ya no está disponible para la enfermera." });
        }

        // Mismo criterio que insertAppointment: procedimiento con doctor + enfermera de
        // apoyo, sin enfermera asignada, solo se permite con confirm_no_nurse y solo si de
        // verdad no hay ninguna libre para este horario.
        if (procedureRequiresDoctor && procedureRequiresNurse && !nurse_id) {
            if (!confirm_no_nurse) {
                return res.status(400).json({ message: "Este procedimiento requiere seleccionar una enfermera.", code: "NURSE_REQUIRED" });
            }
            const hayEnfermeraLibre = await anyNurseAvailable(dateStr, start_time, end_time, req.params.id);
            if (hayEnfermeraLibre) {
                return res.status(400).json({ message: "Hay enfermeras disponibles para este horario: selecciona una." });
            }
        }

        // Un paciente o doctor inactivo no puede quedar asignado a la cita
        // editada.
        const inactivePartyError = await assertActiveParties({ patientId: patient_id, doctorId: doctor_id });
        if (inactivePartyError) {
            return res.status(400).json({ message: inactivePartyError });
        }

        // Reagendar aplica a una cita Programada, Pendiente, Por reagendar o Vencida (ver
        // AppointmentsFormCalendar.jsx, que solo habilita el botón de editar para estos
        // estados): ninguna de las cuatro tiene todavía una atención real comprometida —
        // pending/needs_reschedule/expired nunca fueron aceptadas por nadie, y el
        // doctor/admin puede reasignarles fecha/hora/procedimiento antes de eso;
        // cancelada/completada/no_show ya no se pueden modificar.
        const existing = await appointmentsModel.findById(req.params.id).select("status");
        if (!existing) {
            return res.status(404).json({ message: "Cita no encontrada" });
        }
        if (!["scheduled", "pending", "needs_reschedule", "expired"].includes(existing.status)) {
            return res.status(400).json({ message: "Esta cita ya no puede modificarse." });
        }

        const appointmentUpdated = await appointmentsModel.findByIdAndUpdate(
            req.params.id,
            {
                doctor_id,
                patient_id,
                nurse_id,
                procedure_id,
                type,
                appointment_type,
                date,
                start_time,
                end_time,
                duration_minutes,
                description,
                status,
                total,
                cancellation_reason,
            },
            { new: true }
        );

        if (!appointmentUpdated) {
            return res.status(404).json({ message: "Cita no encontrada" });
        }

        await notifyAppointmentRecipients(appointmentUpdated, {
            doctorMessage: "Una cita asignada a ti fue actualizada.",
            patientMessage: "La información de tu cita fue actualizada.",
            nurseMessage: "Una cita asignada a ti fue actualizada.",
            doctorTitle: "Cita actualizada",
            patientTitle: "Tu cita fue actualizada",
            nurseTitle: "Cita actualizada",
            type: "appointment_updated",
            actor: req.user,
        }).catch((error) => console.log("Error notificando actualización de cita:", error));

        return res.status(200).json({
            message: "Cita actualizada correctamente"
        });

    } catch (error) {
        console.log("error" + error);
        return res.status(500).json({
            message: "Error interno del servidor"
        });
    }
};

// Edición desde el portal: el paciente solo edita una cita propia y nunca
// puede cambiar la fecha, el paciente ni el doctor asignado.
appointmentsController.updatePatientAppointment = async (req, res) => {
    try {
        if (req.user.role !== "patient") {
            return res.status(403).json({ message: "Acceso denegado." });
        }
        const appointment = await appointmentsModel.findOne({ _id: req.params.id, patient_id: req.user.id });
        if (!appointment) return res.status(404).json({ message: "Cita no encontrada." });
        if (["completed", "cancelled", "no_show", "expired"].includes(appointment.status)) {
            return res.status(400).json({ message: "Esta cita ya no puede modificarse." });
        }

        const { procedure_id, procedure_ids, description } = req.body;
        const procedureInput = procedure_ids ?? procedure_id;
        if (procedureInput !== undefined) {
            const service = await resolveProcedures(procedureInput);
            if (!service) {
                return res.status(400).json({ message: "Uno o más procedimientos seleccionados no están disponibles." });
            }
            appointment.procedure_id = service.procedure_ids;
            appointment.type = service.type;
            appointment.duration_minutes = service.duration_minutes;
            appointment.total = service.total;
        }
        if (description !== undefined) appointment.description = String(description).trim();
        await appointment.save();

        if (appointment.doctor_id) {
            await notifyAppointmentRecipients(appointment, {
                doctorMessage: "El paciente actualizó los datos de una cita asignada a ti.",
                doctorTitle: "Cita actualizada por el paciente",
                type: "appointment_updated",
                actor: req.user,
            }).catch((error) => console.log("Error notificando edición del paciente:", error));
        }
        return res.json({ message: "Cita actualizada.", data: appointment });
    } catch (error) {
        return res.status(500).json({ message: "Error al actualizar la cita." });
    }
};

// El paciente cancela una cita propia con motivo obligatorio; no aplica si
// ya está completada, cancelada, marcada como no_show o vencida.
appointmentsController.cancelPatientAppointment = async (req, res) => {
    try {
        if (req.user.role !== "patient") {
            return res.status(403).json({ message: "Acceso denegado." });
        }

        const reason = String(req.body.cancellation_reason || "").trim();
        if (!reason) {
            return res.status(400).json({ message: "Debes indicar el motivo de la cancelación." });
        }
        if (reason.length < 3 || reason.length > 500) {
            return res.status(400).json({ message: "El motivo debe tener entre 3 y 500 caracteres." });
        }

        const appointment = await appointmentsModel.findOne({ _id: req.params.id, patient_id: req.user.id });
        if (!appointment) {
            return res.status(404).json({ message: "Cita no encontrada." });
        }
        // No se puede cancelar una cita ya cerrada (completada, cancelada, no
        // presentada o vencida). Misma regla en las tres plataformas, ver
        // patientPortalController.cancelMyAppointment para la web.
        if (["completed", "cancelled", "no_show", "expired"].includes(appointment.status)) {
            return res.status(400).json({ message: "Esta cita ya no puede cancelarse." });
        }

        // A menos de media hora del inicio (o ya empezada), la cita aceptada ya
        // no se puede cancelar sola: el paciente debe coordinarlo con quien lo
        // atender\u00e1.
        if (isCancelLockedForPatient(appointment)) {
            const conQuien = appointment.doctor_id ? "el doctor que te atender\u00e1" : "la cl\u00ednica";
            return res.status(400).json({
                message: `Tu cita est\u00e1 pr\u00f3xima a comenzar. Para cancelarla, comun\u00edcate con ${conQuien} y lleguen a un acuerdo.`,
            });
        }

        appointment.status = "cancelled";
        appointment.cancellation_reason = reason;
        await appointment.save();

        if (appointment.doctor_id || appointment.nurse_id) {
            await notifyAppointmentRecipients(appointment, {
                doctorMessage: "El paciente canceló una cita asignada a ti.",
                nurseMessage: "El paciente canceló una cita asignada a ti.",
                doctorTitle: "Cita cancelada por el paciente",
                nurseTitle: "Cita cancelada por el paciente",
                type: "appointment_cancelled",
                actor: req.user,
            }).catch((error) => console.log("Error notificando cancelación del paciente:", error));
        }

        return res.json({ message: "Cita cancelada.", data: appointment });
    } catch (error) {
        return res.status(500).json({ message: "Error al cancelar la cita." });
    }
};

// El paciente elimina por completo una solicitud de cita que nunca llegó a confirmarse
// (pending, needs_reschedule o expired: los mismos 3 estados desde los que ya se puede
// reagendar, ver RESCHEDULABLE en AppointmentDetailScreen.jsx). A diferencia de cancelar
// (que solo cambia el status y deja el registro), esto la borra de verdad: como ningún
// doctor llegó a aceptarla, no hay consulta ni nada clínico que dependa de ella — no tiene
// sentido dejar un registro de una solicitud que nunca se concretó. Reusa
// deleteAppointmentCascade, el mismo helper que ya usa el borrado de citas del personal, así
// que limpia igual cualquier orden de laboratorio huérfana que hubiera quedado ligada.
appointmentsController.deleteMyAppointmentRequest = async (req, res) => {
    try {
        if (req.user.role !== "patient") {
            return res.status(403).json({ message: "Acceso denegado." });
        }

        const appointment = await appointmentsModel
            .findOne({ _id: req.params.id, patient_id: req.user.id })
            .select("status");
        if (!appointment) {
            return res.status(404).json({ message: "Cita no encontrada." });
        }
        if (!["pending", "needs_reschedule", "expired"].includes(appointment.status)) {
            return res.status(400).json({ message: "Esta cita ya no puede eliminarse." });
        }

        await deleteAppointmentCascade(req.params.id);
        return res.status(200).json({ message: "Cita eliminada correctamente." });
    } catch (error) {
        console.log("error" + error);
        return res.status(500).json({ message: "Error interno del servidor" });
    }
};

// Elimina una cita. Si ya tiene una consulta registrada (una cita
// "completed" borrada desde aquí en vez de desde la tabla de Consultas), se
// borra también con toda su cascada (receta, orden de laboratorio,
// expediente, tratamiento) — antes esto solo borraba el documento de la
// cita y dejaba esos registros huérfanos, apuntando a una cita inexistente.
appointmentsController.deleteAppointment = async (req, res) => {
    try {
        const appointment = await deleteAppointmentCascade(req.params.id);
        if (!appointment) {
            return res.status(404).json({ message: "Cita no encontrada" });
        }
        await notifyAppointmentRecipients(appointment, {
            doctorMessage: "Una cita asignada a ti fue eliminada.",
            patientMessage: "Una cita registrada para ti fue eliminada.",
            nurseMessage: "Una cita asignada a ti fue eliminada.",
            doctorTitle: "Cita eliminada",
            patientTitle: "Cita eliminada",
            nurseTitle: "Cita eliminada",
            type: "appointment_deleted",
            navigable: false,
            actor: req.user,
        }).catch((error) => console.log("Error notificando eliminación de cita:", error));
        return res.status(200).json({ message: "Cita eliminada correctamente" });
    } catch (error) {
        console.log("error" + error);
        return res.status(500).json({ message: "Error interno del servidor" });
    }
};

// Cambia únicamente el status de una cita (y el motivo si se cancela).
// Transiciones permitidas desde cada estado actual. completed/cancelled/no_show/expired
// son finales: una vez ahí, esta ruta ya no puede volver a moverla (antes se podía
// "reabrir" una cita completada o cancelada de vuelta a scheduled con solo mandar ese
// status, sin ninguna validación).
const VALID_STATUS_TRANSITIONS = {
    pending: ["cancelled", "needs_reschedule"],
    scheduled: ["completed", "cancelled", "no_show"],
    // El paciente reagenda por su propio endpoint (rescheduleMyAppointment); el personal
    // también puede cancelarla desde aquí.
    needs_reschedule: ["cancelled"],
    completed: [],
    cancelled: [],
    // Si la consulta sí se realizó (con retraso, después del margen de no_show), al
    // guardarla se vuelve a "completed": la consulta real manda sobre el auto-no_show.
    no_show: ["completed"],
    expired: [],
};

appointmentsController.updateAppointmentStatus = async (req, res) => {
    try {
        const { status, cancellation_reason } = req.body;

        if (!status) {
            return res.status(400).json({ message: "El estado es requerido." });
        }
        // El modelo no restringe "status" a un enum (ver appointments.js), así que sin esto
        // cualquier texto se guardaba tal cual. Se valida acá, en el único lugar donde el
        // valor viene directo del cliente sin pasar por un flujo dedicado (aceptar,
        // asignar, cancelar).
        if (!Object.keys(VALID_STATUS_TRANSITIONS).includes(status)) {
            return res.status(400).json({ message: "Estado inválido." });
        }

        const appointment = await appointmentsModel.findById(req.params.id);
        if (!appointment) {
            return res.status(404).json({ message: "Cita no encontrada" });
        }

        // Llamada idempotente: si el estado no cambia, no hay transición que validar.
        // El editor de consultas reenvía "completed" cada vez que se guarda un
        // registro ya existente, y sin esto esa edición fallaba con
        // "No se puede cambiar una cita de completed a completed".
        if (status === appointment.status) {
            if (status === "cancelled" && cancellation_reason) {
                appointment.cancellation_reason = cancellation_reason.trim();
                await appointment.save();
            }
            return res.status(200).json({ message: "Estado actualizado correctamente", data: appointment });
        }

        const permitido = VALID_STATUS_TRANSITIONS[appointment.status] || [];
        if (!permitido.includes(status)) {
            return res.status(400).json({
                message: `No se puede cambiar una cita de "${appointment.status}" a "${status}".`,
            });
        }

        appointment.status = status;
        if (status === "cancelled" && cancellation_reason) {
            appointment.cancellation_reason = cancellation_reason.trim();
        }
        // Al completar la consulta ("Finalizar y guardar"), la cita deja de ocupar la
        // agenda del doctor/enfermera desde el momento REAL en que terminó, no desde la
        // hora de fin originalmente agendada: isSlotFreeForDoctor/isSlotFreeForNurse (y la
        // generación de horarios agregados) bloquean exactamente el rango start_time-
        // end_time guardado, así que si el doctor termina antes de lo previsto, sin este
        // ajuste su horario real seguía bloqueado hasta la hora que ya no aplicaba (y si
        // termina después, quedaba "libre" en un horario en el que en realidad seguía
        // ocupado). Solo se ajusta si se completa el mismo día de la cita: completar tarde
        // una cita de un día ya pasado no debe reescribir la hora de un día que de todas
        // formas ya no se ofrece para agendar.
        if (status === "completed") {
            const ahora = new Date();
            const mismoDia = appointment.date.getFullYear() === ahora.getFullYear()
                && appointment.date.getMonth() === ahora.getMonth()
                && appointment.date.getDate() === ahora.getDate();
            const horaActual = `${String(ahora.getHours()).padStart(2, "0")}:${String(ahora.getMinutes()).padStart(2, "0")}`;
            if (mismoDia && horaActual > appointment.start_time) {
                appointment.end_time = horaActual;
                appointment.duration_minutes = toMinutes(horaActual) - toMinutes(appointment.start_time);
            }
        }
        await appointment.save();
        const appointmentUpdated = appointment;

        const statusLabels = {
            pending: "Pendiente",
            scheduled: "Programada",
            completed: "Completada",
            cancelled: "Cancelada",
            no_show: "No se presentó",
            expired: "Vencida",
            needs_reschedule: "Por reagendar",
        };
        const translatedStatus = statusLabels[status] || status;
        await notifyAppointmentRecipients(appointmentUpdated, {
            doctorMessage: `El estado de una cita asignada a ti cambió a ${translatedStatus}.`,
            patientMessage: `El estado de tu cita cambió a ${translatedStatus}.`,
            nurseMessage: `El estado de una cita asignada a ti cambió a ${translatedStatus}.`,
            doctorTitle: "Estado de cita actualizado",
            patientTitle: "Estado de tu cita actualizado",
            nurseTitle: "Estado de cita actualizado",
            type: status === "cancelled" ? "appointment_cancelled" : "appointment_status_changed",
            actor: req.user,
        }).catch((error) => console.log("Error notificando cambio de estado:", error));

        return res.status(200).json({ message: "Estado actualizado correctamente", data: appointmentUpdated });
    } catch (error) {
        console.log("error" + error);
        return res.status(500).json({ message: "Error interno del servidor" });
    }
};

// El doctor acepta una cita "pending" propia, revalidando antes que el
// horario siga libre desde que se creó la cita.
appointmentsController.acceptAppointment = async (req, res) => {
    try {
        if (req.user.role !== "doctor") {
            return res.status(403).json({ message: "Solo un doctor puede aceptar una cita." });
        }

        const { nurse_id, confirm_no_nurse } = req.body;
        const appointment = await appointmentsModel.findById(req.params.id);
        if (!appointment) {
            return res.status(404).json({ message: "Appointment not found" });
        }

        if (appointment.doctor_id && appointment.doctor_id.toString() !== req.user.id) {
            return res.status(403).json({ message: "No puedes aceptar una cita asignada a otro doctor." });
        }

        if (appointment.status !== "pending") {
            return res.status(400).json({ message: "Esta cita ya no está pendiente de aceptación." });
        }

        // No se puede aceptar una solicitud de un paciente que quedo inactivo
        // despues de agendarla.
        const inactivePartyError = await assertActiveParties({ patientId: appointment.patient_id });
        if (inactivePartyError) {
            return res.status(400).json({ message: inactivePartyError });
        }

        const d = appointment.date;
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

        const { free, reason } = await isSlotFreeForDoctor(
            req.user.id,
            dateStr,
            appointment.start_time,
            appointment.end_time,
            appointment._id
        );

        if (!free) {
            return res.status(409).json({ message: reason || "Ese horario ya no está disponible." });
        }

        let assignedNurse = null;
        if (!sinProcedimientos(appointment.procedure_id)) {
            // Alcanza con que UNO de los procedimientos de la cita requiera enfermera.
            const { requiresNurse } = await resolveProcedureFlags(appointment.procedure_id);
            if (requiresNurse && !nurse_id) {
                // Sin confirm_no_nurse, sigue siendo obligatorio elegir una enfermera. Con
                // confirm_no_nurse, se revalida contra la base de datos que de verdad no haya
                // ninguna libre para este horario antes de dejar pasar el "continuar sin
                // enfermera": ese bypass no debe servir para saltarse la asignación cuando en
                // realidad sí hay alguna disponible.
                if (!confirm_no_nurse) {
                    return res.status(400).json({ message: "Este procedimiento requiere seleccionar una enfermera.", code: "NURSE_REQUIRED" });
                }
                const hayEnfermeraLibre = await anyNurseAvailable(dateStr, appointment.start_time, appointment.end_time, appointment._id);
                if (hayEnfermeraLibre) {
                    return res.status(400).json({ message: "Hay enfermeras disponibles para este horario: selecciona una." });
                }
            }
        }
        if (nurse_id) {
            assignedNurse = await nursesModel.findById(nurse_id).select("_id");
            if (!assignedNurse) {
                return res.status(400).json({ message: "La enfermera seleccionada no existe." });
            }
            // Revalida contra la base de datos que la enfermera de apoyo siga libre en este
            // horario, mismo criterio que ya se aplica al doctor arriba y al crear/editar una
            // cita (insertAppointment/updateAppointment): el catálogo de enfermeras
            // disponibles que vio el doctor pudo quedar desactualizado entre que se cargó y
            // que se confirma la aceptación.
            const { free: nurseFree, reason: nurseReason } = await isSlotFreeForNurse(
                nurse_id, dateStr, appointment.start_time, appointment.end_time, appointmentsModel, appointment._id
            );
            if (!nurseFree) {
                return res.status(409).json({ message: nurseReason || "Esa enfermera ya no está disponible en este horario." });
            }
        }

        // La condición exige que siga sin asignar (o asignada a este mismo
        // doctor en citas anteriores), para que dos doctores no puedan tomarla.
        const accepted = await appointmentsModel.findOneAndUpdate(
            {
                _id: appointment._id,
                status: "pending",
                doctor_id: appointment.doctor_id ? req.user.id : null,
            },
            { $set: { doctor_id: req.user.id, nurse_id: assignedNurse?._id || null, status: "scheduled" } },
            { new: true }
        );
        if (!accepted) {
            return res.status(409).json({ message: "Esta cita ya fue tomada por otro doctor." });
        }

        // El cupo de este doctor a esta hora quedó tomado: las demás solicitudes del
        // mismo doctor que se solapan pasan a "por reagendar".
        await bumpCompetingRequests(accepted).catch((e) => console.log("Error bumpeando solicitudes rivales:", e));

        const acceptingDoctor = await doctorsModel.findById(req.user.id).select("name last_name").lean();
        const doctorName = acceptingDoctor
            ? `Dr. ${acceptingDoctor.name} ${acceptingDoctor.last_name || ""}`.trim()
            : "El doctor";

        await notifyAppointmentRecipients(accepted, {
            patientMessage: `${doctorName} aceptó tu cita.`,
            nurseMessage: "Se te asignó como enfermera de una cita aceptada por el doctor.",
            patientTitle: "Cita aceptada",
            nurseTitle: "Nueva cita asignada",
            type: "appointment_accepted",
            actor: req.user,
        }).catch((error) => console.log("Error notificando aceptación de cita:", error));

        return res.status(200).json({ message: "Cita aceptada correctamente", data: accepted });
    } catch (error) {
        console.log("error" + error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// El admin asigna un doctor a una cita "pending", dejándola programada de
// una vez, con la misma revalidación de horario y enfermera que aceptar.
appointmentsController.assignDoctor = async (req, res) => {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({ message: "Solo un administrador puede asignar una cita a un doctor." });
        }

        const { doctor_id, nurse_id, confirm_no_nurse } = req.body;
        if (!doctor_id) {
            return res.status(400).json({ message: "Debes seleccionar un doctor." });
        }

        const appointment = await appointmentsModel.findById(req.params.id);
        if (!appointment) {
            return res.status(404).json({ message: "Appointment not found" });
        }

        if (appointment.status !== "pending") {
            return res.status(400).json({ message: "Esta cita ya no está pendiente de asignación." });
        }

        const doctor = await doctorsModel.findById(doctor_id).select("_id is_active");
        if (!doctor) {
            return res.status(400).json({ message: "El doctor seleccionado no existe." });
        }

        // El doctor asignado y el paciente de la cita deben estar activos.
        const inactivePartyError = await assertActiveParties({ patientId: appointment.patient_id, doctorId: doctor_id });
        if (inactivePartyError) {
            return res.status(400).json({ message: inactivePartyError });
        }

        const d = appointment.date;
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

        const { free, reason } = await isSlotFreeForDoctor(
            doctor_id,
            dateStr,
            appointment.start_time,
            appointment.end_time,
            appointment._id
        );

        if (!free) {
            return res.status(409).json({ message: reason || "Ese horario ya no está disponible para el doctor seleccionado." });
        }

        let assignedNurse = null;
        if (!sinProcedimientos(appointment.procedure_id)) {
            // Alcanza con que UNO de los procedimientos de la cita requiera enfermera.
            const { requiresNurse } = await resolveProcedureFlags(appointment.procedure_id);
            if (requiresNurse && !nurse_id) {
                // Mismo criterio que acceptAppointment: sin confirm_no_nurse sigue siendo
                // obligatorio, y con confirm_no_nurse se revalida que de verdad no haya
                // ninguna enfermera libre antes de dejarlo pasar.
                if (!confirm_no_nurse) {
                    return res.status(400).json({ message: "Este procedimiento requiere seleccionar una enfermera.", code: "NURSE_REQUIRED" });
                }
                const hayEnfermeraLibre = await anyNurseAvailable(dateStr, appointment.start_time, appointment.end_time, appointment._id);
                if (hayEnfermeraLibre) {
                    return res.status(400).json({ message: "Hay enfermeras disponibles para este horario: selecciona una." });
                }
            }
        }
        if (nurse_id) {
            assignedNurse = await nursesModel.findById(nurse_id).select("_id");
            if (!assignedNurse) {
                return res.status(400).json({ message: "La enfermera seleccionada no existe." });
            }
            // Mismo criterio que acceptAppointment: revalida contra la base de datos que la
            // enfermera de apoyo siga libre en este horario, en vez de confiar en el catálogo
            // que vio el admin al armar la solicitud.
            const { free: nurseFree, reason: nurseReason } = await isSlotFreeForNurse(
                nurse_id, dateStr, appointment.start_time, appointment.end_time, appointmentsModel, appointment._id
            );
            if (!nurseFree) {
                return res.status(409).json({ message: nurseReason || "Esa enfermera ya no está disponible en este horario." });
            }
        }

        const assigned = await appointmentsModel.findOneAndUpdate(
            { _id: appointment._id, status: "pending" },
            { $set: { doctor_id, nurse_id: assignedNurse?._id || null, status: "scheduled" } },
            { new: true }
        );
        if (!assigned) {
            return res.status(409).json({ message: "Esta cita ya fue tomada por un doctor." });
        }

        await bumpCompetingRequests(assigned).catch((e) => console.log("Error bumpeando solicitudes rivales:", e));

        await notifyAppointmentRecipients(assigned, {
            doctorMessage: "Se te asignó una nueva cita.",
            patientMessage: "Tu cita fue asignada a un doctor.",
            nurseMessage: "Se te asignó como enfermera de una nueva cita.",
            doctorTitle: "Nueva cita asignada",
            patientTitle: "Doctor asignado a tu cita",
            nurseTitle: "Nueva cita asignada",
            type: "appointment_assigned",
            actor: req.user,
        }).catch((error) => console.log("Error notificando asignación de cita:", error));

        return res.status(200).json({ message: "Cita asignada correctamente", data: assigned });
    } catch (error) {
        console.log("error" + error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// La enfermera acepta una cita "pending" propia (procedimiento sin doctor, ella es la
// proveedora principal), mismo mecanismo que acceptAppointment pero para enfermería:
// revalida que el horario siga libre desde que se creó la solicitud.
appointmentsController.acceptAppointmentAsNurse = async (req, res) => {
    try {
        if (req.user.role !== "nurse") {
            return res.status(403).json({ message: "Solo una enfermera puede aceptar esta cita." });
        }

        const appointment = await appointmentsModel.findById(req.params.id);
        if (!appointment) {
            return res.status(404).json({ message: "Appointment not found" });
        }

        if (appointment.nurse_id && appointment.nurse_id.toString() !== req.user.id) {
            return res.status(403).json({ message: "No puedes aceptar una cita asignada a otra enfermera." });
        }

        if (appointment.status !== "pending") {
            return res.status(400).json({ message: "Esta cita ya no está pendiente de aceptación." });
        }

        // No se puede aceptar una solicitud de un paciente que quedo inactivo.
        const inactivePartyError = await assertActiveParties({ patientId: appointment.patient_id });
        if (inactivePartyError) {
            return res.status(400).json({ message: inactivePartyError });
        }

        const d = appointment.date;
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

        const { free, reason } = await isSlotFreeForNurse(
            req.user.id,
            dateStr,
            appointment.start_time,
            appointment.end_time,
            appointmentsModel,
            appointment._id
        );

        if (!free) {
            return res.status(409).json({ message: reason || "Ese horario ya no está disponible." });
        }

        // La condición exige que siga sin asignar (o asignada a esta misma enfermera en
        // citas anteriores), para que dos enfermeras no puedan tomarla a la vez.
        const accepted = await appointmentsModel.findOneAndUpdate(
            {
                _id: appointment._id,
                status: "pending",
                nurse_id: appointment.nurse_id ? req.user.id : null,
            },
            { $set: { nurse_id: req.user.id, status: "scheduled" } },
            { new: true }
        );
        if (!accepted) {
            return res.status(409).json({ message: "Esta cita ya fue tomada por otra enfermera." });
        }

        await bumpCompetingRequests(accepted).catch((e) => console.log("Error bumpeando solicitudes rivales:", e));

        const acceptingNurse = await nursesModel.findById(req.user.id).select("name last_name").lean();
        const nurseName = acceptingNurse
            ? `${acceptingNurse.name} ${acceptingNurse.last_name || ""}`.trim()
            : "La enfermera";

        await notifyAppointmentRecipients(accepted, {
            patientMessage: `${nurseName} aceptó tu cita.`,
            patientTitle: "Cita aceptada",
            type: "appointment_accepted",
            actor: req.user,
        }).catch((error) => console.log("Error notificando aceptación de cita:", error));

        return res.status(200).json({ message: "Cita aceptada correctamente", data: accepted });
    } catch (error) {
        console.log("error" + error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// El admin asigna una enfermera a una cita "pending" cuyo procedimiento no requiere
// doctor, dejándola programada de una vez. Mismo mecanismo que assignDoctor, pero la
// enfermera queda como proveedora principal en vez de como apoyo de un doctor.
appointmentsController.assignNurse = async (req, res) => {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({ message: "Solo un administrador puede asignar una cita a una enfermera." });
        }

        const { nurse_id } = req.body;
        if (!nurse_id) {
            return res.status(400).json({ message: "Debes seleccionar una enfermera." });
        }

        const appointment = await appointmentsModel.findById(req.params.id);
        if (!appointment) {
            return res.status(404).json({ message: "Appointment not found" });
        }

        if (appointment.status !== "pending") {
            return res.status(400).json({ message: "Esta cita ya no está pendiente de asignación." });
        }

        const nurse = await nursesModel.findById(nurse_id).select("_id");
        if (!nurse) {
            return res.status(400).json({ message: "La enfermera seleccionada no existe." });
        }

        // El paciente de la cita debe seguir activo.
        const inactivePartyError = await assertActiveParties({ patientId: appointment.patient_id });
        if (inactivePartyError) {
            return res.status(400).json({ message: inactivePartyError });
        }

        const d = appointment.date;
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

        const { free, reason } = await isSlotFreeForNurse(
            nurse_id,
            dateStr,
            appointment.start_time,
            appointment.end_time,
            appointmentsModel,
            appointment._id
        );

        if (!free) {
            return res.status(409).json({ message: reason || "Ese horario ya no está disponible para la enfermera seleccionada." });
        }

        const assigned = await appointmentsModel.findOneAndUpdate(
            { _id: appointment._id, status: "pending" },
            { $set: { nurse_id, status: "scheduled" } },
            { new: true }
        );
        if (!assigned) {
            return res.status(409).json({ message: "Esta cita ya fue tomada por otra enfermera." });
        }

        await bumpCompetingRequests(assigned).catch((e) => console.log("Error bumpeando solicitudes rivales:", e));

        await notifyAppointmentRecipients(assigned, {
            nurseMessage: "Se te asignó una nueva cita.",
            patientMessage: "Tu cita fue asignada a una enfermera.",
            nurseTitle: "Nueva cita asignada",
            patientTitle: "Enfermera asignada a tu cita",
            type: "appointment_assigned",
            actor: req.user,
        }).catch((error) => console.log("Error notificando asignación de cita:", error));

        return res.status(200).json({ message: "Cita asignada correctamente", data: assigned });
    } catch (error) {
        console.log("error" + error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// Catálogo seguro del portal: solo procedimientos activos y los campos que
// el paciente necesita para elegir y conocer su precio/duración.
appointmentsController.getPatientProcedures = async (req, res) => {
    try {
        if (req.user.role !== "patient") {
            return res.status(403).json({ message: "Acceso denegado." });
        }
        // $ne: false (no is_active: true) a propósito: procedimientos creados antes de que
        // este campo existiera en el esquema no lo tienen guardado en el documento, así que
        // is_active: true nunca hacía match contra ellos aunque el panel web los mostrara
        // como "Activo" (ProceduresTable.jsx ya los trata así: is_active !== false) — quedaban
        // invisibles para agendar en el móvil y el portal público sin que nadie los hubiera
        // desactivado a propósito.
        const procedures = await proceduresModel.find({ is_active: { $ne: false } })
            .select("name description estimated_duration price requires_nurse requires_doctor")
            .sort({ name: 1 })
            .lean();
        return res.json({ data: procedures });
    } catch (error) {
        return res.status(500).json({ message: "No se pudieron cargar los procedimientos." });
    }
};

// Catálogo mínimo para asignar una enfermera al crear/editar/aceptar una cita — usado tanto por
// AppointmentsForm.jsx (crear/editar) como por AppointmentsGrid.jsx (aceptar/asignar). Se monta
// con authorize("calendar.appointments","view") en las rutas, así que cualquier rol que pueda
// gestionar citas (admin, doctor, recepción, enfermería) llega aquí, sin depender del permiso
// de administración de enfermeras (users.nurses), que es un tema aparte.
// Si se envían date/start_time/end_time (los de la cita a crear/editar/aceptar), el catálogo se
// filtra a solo las enfermeras que tienen ese horario configurado como disponible — igual
// que un doctor solo puede recibir citas dentro de su propio horario. appointment_id se envía
// al editar una cita existente, para no filtrar a la enfermera ya asignada por "chocar" con
// la misma cita que se está editando.
appointmentsController.getNursesForAcceptance = async (req, res) => {
    try {
        const { date, start_time, end_time, appointment_id } = req.query;
        const nurses = await nursesModel.find({ is_active: true }).select("name last_name").sort({ name: 1 }).lean();

        if (!date || !start_time || !end_time) {
            return res.json({ data: nurses });
        }

        const availability = await Promise.all(
            nurses.map((n) => isNurseAvailable(n._id, date, start_time, end_time, appointmentsModel, appointment_id))
        );
        const availableNurses = nurses.filter((_, i) => availability[i]);
        return res.json({ data: availableNurses });
    } catch (error) {
        return res.status(500).json({ message: "No se pudieron cargar las enfermeras." });
    }
};

// Catálogo del filtro "Doctor" del listado de citas — solo doctores que efectivamente tienen al
// menos una cita registrada (no el catálogo completo de doctores), para que el filtro no ofrezca
// opciones que de todos modos no devolverían ningún resultado.
appointmentsController.getDoctorsWithAppointments = async (req, res) => {
    try {
        const doctorIds = await appointmentsModel.distinct("doctor_id", { doctor_id: { $ne: null } });
        const doctors = await doctorsModel
            .find({ _id: { $in: doctorIds }, is_active: true })
            .select("name last_name")
            .sort({ name: 1, last_name: 1 });
        return res.status(200).json(doctors);
    } catch (error) {
        console.log("error" + error);
        return res.status(500).json({ message: "Error interno del servidor" });
    }
};

// Trae las citas completadas del día, para el historial.
appointmentsController.getAppointmentsHistory = async (req, res) => {
    try {
        const { date, limit = 5 } = req.query;

        const { start, end } = getDayRange(date || new Date());

        // Igual que en getAppointmentsStats: se filtra por cuándo se completó
        // (updatedAt), no por la fecha originalmente agendada, para que una
        // cita atrasada que se atiende hoy sí aparezca en "hoy".
        const historyFilter = { status: "completed", updatedAt: { $gte: start, $lte: end } };
        // El doctor solo ve el historial de sus propias citas atendidas.
        if (req.user.role === "doctor") {
            historyFilter.doctor_id = req.user.id;
        }

        // El historial del dia oculta las citas de pacientes o doctores
        // inactivos, igual que el resto de la interfaz de consultas.
        Object.assign(historyFilter, await buildActivePartiesAppointmentFilter());

        const history = await appointmentsModel
            .find(historyFilter)
            .sort({ updatedAt: -1 })
            .limit(Math.max(parseInt(limit, 10) || 5, 1))
            .populate({ path: "patient_id", model: "Patients", select: "name last_name" });

        return res.status(200).json(history);
    } catch (error) {
        console.log("error" + error);
        return res.status(500).json({ message: "Error interno del servidor" });
    }
};

export default appointmentsController;
