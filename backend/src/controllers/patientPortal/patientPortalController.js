import appointmentsModel from "../../models/appointments/appointments.js";
import doctorsModel from "../../models/doctors/doctors.js";
import scheduleModel from "../../models/schedule/schedule.js";
import nurseScheduleModel from "../../models/schedule/nurseSchedule.js";
import procedureModel from "../../models/procedures/procedures.js";
import consultationsModel from "../../models/consultations/consultation.js";
import prescriptionsModel from "../../models/consultations/prescription.js";
import labOrdersModel from "../../models/consultations/labOrder.js";
import sickLeavesModel from "../../models/sickLeaves/sickLeave.js";
import medicationLogModel from "../../models/medicationLog/medicationLog.js";
import patientsModel from "../../models/patients/patients.js";
import notificationModel from "../../models/notifications/notification.js";
import nursesModel from "../../models/nurses/nurses.js";
import { isNurseAvailable, isSlotFreeForNurse } from "../../controllers/schedule/nurseScheduleController.js";
import { isSlotFreeForDoctor, MIN_BOOKING_LEAD_MINUTES } from "../../controllers/schedule/scheduleController.js";
import { runAppointmentAutoTransitions } from "../../controllers/appointments/appointmentsController.js";
import { getTransactionStatus } from "../../utils/wompi.js";
import { RESCHEDULABLE_STATUSES, isCancelLockedForPatient } from "../../utils/appointmentStatus.js";
import { deleteAppointmentCascade } from "../../services/consultationCascade.js";
import { resolveProcedures, resolveProcedureFlags } from "../../utils/procedureAggregation.js";

const patientPortalController = {};

// Pagar en línea solo cobra un anticipo (para apartar la hora), no el total: el resto
// se paga en recepción el día de la cita. Este anticipo no se reembolsa si se cancela.
const DEPOSIT_PERCENTAGE = 0.5;
const calcDepositAmount = (total) => Math.round(total * DEPOSIT_PERCENTAGE * 100) / 100;

// Convierte una hora en formato HH:mm a minutos desde medianoche,
// para poder comparar horarios entre sí.
const toMinutes = (time) => {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
};

// Suma minutos a una hora en formato HH:mm y devuelve otra hora en el
// mismo formato.
const addMinutes = (time, minutes) => {
    const total = toMinutes(time) + minutes;
    const hh = String(Math.floor(total / 60)).padStart(2, "0");
    const mm = String(total % 60).padStart(2, "0");
    return `${hh}:${mm}`;
};

// Arma el inicio y fin de un día completo en hora local a partir de
// una fecha en formato YYYY-MM-DD, para no correr la fecha un día por
// culpa de la conversión a UTC.
const getDayRange = (dateStr) => {
    const [year, month, day] = dateStr.split("-").map(Number);
    const start = new Date(year, month - 1, day, 0, 0, 0, 0);
    const end = new Date(year, month - 1, day, 23, 59, 59, 999);
    return { start, end };
};

// Convierte una fecha a formato YYYY-MM-DD en hora local.
const toDateStr = (d) => {
    const dt = new Date(d);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
};

// duration es texto libre (por ejemplo, 7 días), se toma el primer
// número como cantidad de días. Si no se puede leer un número, se
// asume una semana como valor razonable por defecto.
const parseDurationDays = (duration) => {
    const match = String(duration || "").match(/\d+/);
    return match ? Number(match[0]) : 7;
};

// Un medicamento está activo hoy si hoy cae dentro del rango
// [emitido, emitido + duración].
const isActiveToday = (issuedAt, duration) => {
    if (!issuedAt) return false;
    const days = parseDurationDays(duration);
    const start = new Date(issuedAt);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + days);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today >= start && today < end;
};

// Consultas reales del paciente, con el doctor de la cita ya poblado
const fetchConsultations = (patientId) =>
    consultationsModel
        .find({ patient_id: patientId })
        .select("date appointment_id referral follow_up_date clinical_data physical_exam")
        .populate({ path: "appointment_id", populate: { path: "doctor_id", select: "name last_name" } })
        .sort({ date: -1 });

// Recetas del paciente a partir de sus consultas, enlazadas por
// consultation_id (el mismo campo que escribe y lee consultationController).
const fetchPrescriptions = async (patientId, consultations) => {
    const ids = consultations.map((c) => String(c._id));
    const prescriptions = await prescriptionsModel
        .find({ consultation_id: { $in: ids } })
        .sort({ issued_at: -1 });

    const consultationById = new Map(consultations.map((c) => [String(c._id), c]));
    return prescriptions.map((p) => ({
        _id: p._id,
        medications: p.medications,
        post_operative_instructions: p.post_operative_instructions,
        issued_at: p.issued_at,
        doctor: consultationById.get(String(p.consultation_id))?.appointment_id?.doctor_id || null,
    }));
};

// Órdenes de laboratorio del paciente, solo las ya enlazadas a una consulta
// (consultation_id != null), que es lo que las vuelve oficiales. El doctor y la
// fecha salen de la consulta asociada, igual que fetchPrescriptions.
const fetchLabOrders = async (patientId, consultations) => {
    const consultationById = new Map(consultations.map((c) => [String(c._id), c]));
    const labOrders = await labOrdersModel
        .find({ patient_id: patientId, consultation_id: { $ne: null } })
        .sort({ issued_at: -1, createdAt: -1 });

    return labOrders.map((o) => {
        const consultation = consultationById.get(String(o.consultation_id));
        return {
            _id: o._id,
            tests: o.tests || [],
            pregnancy: o.pregnancy || "",
            antibiotic_treatment: o.antibiotic_treatment || "",
            other_tests: o.other_tests || "",
            weight: o.weight,
            height: o.height,
            issued_at: o.issued_at,
            date: consultation?.date || o.issued_at,
            doctor: consultation?.appointment_id?.doctor_id || null,
        };
    });
};

// Medicamentos que siguen activos hoy según sus recetas, con si ya se
// marcaron como tomados.
const fetchTodayMedications = async (patientId, prescriptions) => {
    const activeMeds = [];
    for (const p of prescriptions) {
        for (const med of p.medications || []) {
            if (isActiveToday(p.issued_at, med.duration)) {
                activeMeds.push({
                    prescription_id: p._id,
                    medication_id: String(med._id),
                    name: med.name,
                    dose: med.dose,
                    frequency: med.frequency,
                });
            }
        }
    }

    const todayStr = toDateStr(new Date());
    const logs = await medicationLogModel.find({
        patient_id: patientId,
        date: todayStr,
        medication_id: { $in: activeMeds.map((m) => m.medication_id) },
    });
    const takenIds = new Set(logs.filter((l) => l.taken).map((l) => l.medication_id));

    return activeMeds.map((m) => ({ ...m, taken: takenIds.has(m.medication_id) }));
};

// Recordatorio de medicamentos: un aviso al día (la receta no guarda horas de toma
// exactas, solo "duración" en días, así que no se puede recordar dosis por dosis) cuando el
// paciente tiene medicamentos activos hoy sin marcar como tomados. Se deduplica por día: si
// ya se le mandó hoy, no se repite cada vez que abre el dashboard o la lista de medicamentos.
// Nunca lanza: es informativo, no debe tumbar la petición que lo dispara.
async function notifyPendingMedicationsIfAny(patientId, meds) {
    try {
        const pending = meds.filter((m) => !m.taken);
        if (pending.length === 0) return;

        const { start: startOfToday, end: endOfToday } = getDayRange(toDateStr(new Date()));
        const yaNotificadoHoy = await notificationModel.exists({
            recipient_role: "patient",
            recipient_id: patientId,
            type: "medication_reminder",
            createdAt: { $gte: startOfToday, $lte: endOfToday },
        });
        if (yaNotificadoHoy) return;

        await notificationModel.create({
            recipient_role: "patient",
            recipient_id: patientId,
            title: "Recordatorio de medicamentos",
            type: "medication_reminder",
            message: pending.length === 1
                ? `Tienes pendiente tomar ${pending[0].name} hoy.`
                : `Tienes ${pending.length} medicamentos pendientes por tomar hoy.`,
            action_url: "/medicamentos",
        });
    } catch (error) {
        console.log("Error creando recordatorio de medicamentos:", error);
    }
}

// GET /api/patient-portal/doctors, lista de doctores activos con
// solo los datos necesarios para elegir uno (nunca datos sensibles
// como contraseña, dui o licencia).
patientPortalController.getDoctors = async (req, res) => {
    try {
        const doctors = await doctorsModel
            .find({ is_active: true })
            .select("name last_name img_url");
        return res.status(200).json(doctors);
    } catch (error) {
        console.log("error " + error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// GET /api/patient-portal/doctors-schedulable — solo doctores activos que ya
// configuraron al menos un día laborable en su horario (weekly_availability con
// is_available true). Se usa en el paso "elegir doctor" del agendamiento: un doctor
// sin horario configurado no tiene forma de calcular sus días u horas libres, así que
// no debe aparecer como opción ahí (a diferencia de /doctors, que sigue listando a
// todos los doctores activos para otros usos del portal).
patientPortalController.getSchedulableDoctors = async (req, res) => {
    try {
        const schedules = await scheduleModel
            .find({ "weekly_availability.is_available": true })
            .select("doctor_id");
        const doctorIds = schedules.map((s) => s.doctor_id);

        const doctors = await doctorsModel
            .find({ _id: { $in: doctorIds }, is_active: true })
            .select("name last_name img_url");
        return res.status(200).json(doctors);
    } catch (error) {
        console.log("error " + error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// GET /api/patient-portal/nurses-schedulable — mismo criterio que
// getSchedulableDoctors, pero para enfermeras: solo activas y con al menos un día
// laborable configurado en su horario. Se usa en el paso "elegir enfermera" del
// agendamiento cuando el procedimiento elegido no requiere doctor (requires_doctor
// false), reemplazando ahí al paso "elegir doctor".
patientPortalController.getSchedulableNurses = async (req, res) => {
    try {
        const schedules = await nurseScheduleModel
            .find({ "weekly_availability.is_available": true })
            .select("nurse_id");
        const nurseIds = schedules.map((s) => s.nurse_id);

        const nurses = await nursesModel
            .find({ _id: { $in: nurseIds }, is_active: true })
            .select("name last_name img_url");
        return res.status(200).json(nurses);
    } catch (error) {
        console.log("error " + error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// GET /api/patient-portal/procedures — catálogo de procedimientos activos,
// para que el paciente elija si su cita es un procedimiento o consulta general
patientPortalController.getProcedures = async (req, res) => {
    try {
        // $ne: false, no is_active: true: ver la nota equivalente en
        // appointmentsController.getPatientProcedures — procedimientos antiguos sin el campo
        // guardado se ven "Activo" en el panel web pero no hacían match contra is_active: true.
        const procedures = await procedureModel
            .find({ is_active: { $ne: false } })
            .select("name description estimated_duration price requires_nurse requires_doctor pre_care_instructions")
            .collation({ locale: "es", strength: 1 })
            .sort({ name: 1 });
        return res.status(200).json(procedures);
    } catch (error) {
        console.log("error " + error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// Notifica "cita por aceptar" al proveedor elegido, o a todos los que podrían aceptarla si
// el paciente no eligió uno. Compartido por bookAppointment y rescheduleMyAppointment, para
// que una cita reagendada llegue a "Por aceptar" igual que una nueva. Nunca lanza.
async function notifyPendingRequestToProviders({
    appointmentId, patientId, procedureName, dateStr, dayStart,
    start_time, end_time, requiresDoctor, sinProveedorElegido, doctor_id, nurse_id,
}) {
    try {
        const patient = await patientsModel.findById(patientId).select("name last_name");
        const patientName = patient ? `${patient.name} ${patient.last_name || ""}`.trim() : "un paciente";
        const tipoLabel = procedureName;
        const fechaFormateada = new Intl.DateTimeFormat("es-SV", {
            day: "2-digit", month: "long", year: "numeric", timeZone: "UTC",
        }).format(dayStart);
        const action_url = `/calendar/appointments?view=citas&tab=pending&highlight=${appointmentId}`;

        if (requiresDoctor) {
            const mensaje = sinProveedorElegido
                ? `El paciente ${patientName} solicitó una cita de ${tipoLabel} sin doctor asignado para el ${fechaFormateada} en el horario de ${start_time}. Cualquier doctor puede aceptarla.`
                : `El paciente ${patientName} ha agendado una cita de ${tipoLabel} para el ${fechaFormateada} en el horario de ${start_time}.`;
            if (sinProveedorElegido) {
                const doctoresActivos = await doctorsModel.find({ is_active: true }).select("_id");
                if (doctoresActivos.length > 0) {
                    await notificationModel.insertMany(doctoresActivos.map((d) => ({
                        recipient_role: "doctor", recipient_id: d._id,
                        title: "Nueva solicitud de cita sin asignar", type: "appointment_created",
                        message: mensaje, appointment_id: appointmentId, action_url,
                    })));
                }
            } else {
                await notificationModel.create({
                    recipient_role: "doctor", recipient_id: doctor_id,
                    title: "Nueva cita por aceptar", type: "appointment_created",
                    message: mensaje, appointment_id: appointmentId, action_url,
                });
            }
        } else {
            const mensaje = sinProveedorElegido
                ? `El paciente ${patientName} solicitó una cita de ${tipoLabel} sin enfermera asignada para el ${fechaFormateada} en el horario de ${start_time}. Cualquier enfermera disponible puede aceptarla.`
                : `El paciente ${patientName} ha agendado una cita de ${tipoLabel} para el ${fechaFormateada} en el horario de ${start_time}.`;
            if (sinProveedorElegido) {
                const activeNurses = await nursesModel.find({ is_active: true }).select("_id");
                const disponibilidad = await Promise.all(
                    activeNurses.map((n) => isNurseAvailable(n._id, dateStr, start_time, end_time, appointmentsModel))
                );
                const enfermerasDisponibles = activeNurses.filter((_, i) => disponibilidad[i]);
                if (enfermerasDisponibles.length > 0) {
                    await notificationModel.insertMany(enfermerasDisponibles.map((n) => ({
                        recipient_role: "nurse", recipient_id: n._id,
                        title: "Nueva solicitud de cita sin asignar", type: "appointment_created",
                        message: mensaje, appointment_id: appointmentId, action_url,
                    })));
                }
            } else {
                await notificationModel.create({
                    recipient_role: "nurse", recipient_id: nurse_id,
                    title: "Nueva cita por aceptar", type: "appointment_created",
                    message: mensaje, appointment_id: appointmentId, action_url,
                });
            }
        }
    } catch (notificationError) {
        console.log("Error notificando cita por aceptar:", notificationError);
    }
}

// Convierte una cita recién pagada en una solicitud real: "pending_payment" -> "pending"
// y recién ahí se notifica a los proveedores (ver notifyPendingRequestToProviders). La
// llaman confirmAppointmentPayment (camino normal: el frontend confirma en cuanto termina
// de cobrar) y wompiWebhookController (respaldo si esa llamada nunca llega). Idempotente:
// si la cita ya estaba "pending" (o cualquier otro estado), no hace nada — evita notificar
// dos veces si ambos caminos llegan a correr para el mismo pago.
export async function activateAfterDeposit(appointment) {
    if (appointment.status !== "pending_payment") return;

    // procedure_id puede llegar poblado (confirmAppointmentPayment lo popula para armar
    // la respuesta al cliente) o sin poblar (el webhook, que hace un findById sin
    // populate): se normaliza a ids planos antes de usarlo en cualquier query, porque
    // pasarle documentos completos a un $in revienta el cast a ObjectId — y como eso
    // pasaba ANTES de guardar el status "pending", la cita quedaba pagada
    // (deposit_paid) pero atascada en "pending_payment" para siempre.
    const procedureIds = (appointment.procedure_id || []).map((p) => p?._id || p);

    const procedures = await procedureModel.find({ _id: { $in: procedureIds } }).select("name requires_doctor");
    const { requiresDoctor } = await resolveProcedureFlags(procedureIds);
    const sinProveedorElegido = requiresDoctor ? !appointment.doctor_id : !appointment.nurse_id;

    appointment.status = "pending";
    await appointment.save();

    await notifyPendingRequestToProviders({
        appointmentId: appointment._id,
        patientId: appointment.patient_id,
        procedureName: procedures.map((p) => p.name).join(", ") || appointment.type,
        dateStr: toDateStr(appointment.date),
        dayStart: appointment.date,
        start_time: appointment.start_time,
        end_time: appointment.end_time,
        requiresDoctor,
        sinProveedorElegido,
        doctor_id: appointment.doctor_id,
        nurse_id: appointment.nurse_id,
    });
}

// POST /api/patient-portal/appointments — el paciente logueado agenda su propia cita.
// El tipo, duración y precio se calculan aquí en el servidor y NUNCA se toman del
// frontend, para que un paciente no pueda manipular el monto a pagar.
// doctor_id es opcional: el paciente puede elegir un doctor puntual (se le notifica
// solo a él y debe aceptarla) o dejar la cita sin asignar (se notifica a todos los
// doctores activos y cualquiera puede aceptarla desde "Por aceptar"), mismo mecanismo
// de asignación libre que ya usaba el flujo de la app móvil (ver
// appointmentsController.insertAppointment, rama req.user.role === "patient").
patientPortalController.bookAppointment = async (req, res) => {
    try {
        const { doctor_id, nurse_id, date, start_time, procedure_ids, payment_method } = req.body;
        const description = req.body.description?.trim();
        const pagaEnLinea = payment_method === "online";

        if (!date || !start_time) {
            return res.status(400).json({ message: "Faltan datos para agendar la cita (fecha u hora)." });
        }

        if (description && (description.length < 3 || description.length > 500)) {
            return res.status(400).json({ message: "El motivo debe tener entre 3 y 500 caracteres." });
        }

        // La Consulta Médica General es un procedimiento real más (con su propio
        // estimated_duration/price/requires_doctor/requires_nurse), ya no un caso especial
        // sin procedure_id: se arma tipo/duración/precio/indicaciones siempre a partir del
        // catálogo. Se puede elegir más de uno: la duración y el precio de la cita son la
        // suma de todos los elegidos (ver resolveProcedures).
        const resolved = await resolveProcedures(procedure_ids);
        if (!resolved) {
            return res.status(404).json({ message: "Uno o más procedimientos seleccionados no existen o ya no están disponibles." });
        }
        const { type, duration_minutes: duration, total, instructions, appointmentTypeName } = resolved;
        const procedureRefs = resolved.procedure_ids;
        const requiresNurse = resolved.requiresNurse;
        const requiresDoctor = resolved.requiresDoctor;

        // Un procedimiento sin doctor (requires_doctor false) se agenda con una enfermera
        // como proveedora principal: doctor_id no aplica ahí, nurse_id toma su lugar. Con
        // doctor sí requerido, nurse_id no significa "proveedora principal" (esa asignación
        // la hace el personal al aceptar, ver acceptAppointment), así que se ignora aquí.
        const sinProveedorElegido = requiresDoctor ? !doctor_id : !nurse_id;

        if (requiresDoctor && doctor_id) {
            const doctor = await doctorsModel.findById(doctor_id);
            if (!doctor || doctor.is_active === false) {
                return res.status(404).json({ message: "El doctor seleccionado no está disponible." });
            }
        }
        if (!requiresDoctor && nurse_id) {
            const nurse = await nursesModel.findById(nurse_id);
            if (!nurse) {
                return res.status(404).json({ message: "La enfermera seleccionada no existe." });
            }
        }

        // El paciente nunca elige el tipo de cita del catálogo del admin (a diferencia
        // del formulario del panel privado): se toma el primero que el primer
        // procedimiento elegido haya declarado como elegible (appointment_type_ids, el
        // admin lo decide al crear/editar el procedimiento), para que la cita no quede
        // con la etiqueta/color genéricos de respaldo en el calendario. appointmentTypeName
        // ya viene resuelto de resolveProcedures.

        const end_time = addMinutes(start_time, duration);
        const { start: dayStart, end: dayEnd } = getDayRange(date);

        // El paciente necesita al menos MIN_BOOKING_LEAD_MINUTES (1 h) de anticipación para
        // agendar por su cuenta, no solo que la hora todavía no haya pasado: esta es la
        // validación real (el filtro de getPatientAvailableSlots/getAvailableSlots del lado
        // del listado es solo para que el paciente ni siquiera vea la opción; sin este
        // chequeo aquí, un cliente que ya tenía cargados horarios viejos —o que arma la
        // petición a mano— podía seguir agendando una cita a minutos de la hora actual).
        const [h, m] = start_time.split(":").map(Number);
        const appointmentMoment = new Date(dayStart);
        appointmentMoment.setHours(h, m, 0, 0);
        const minLeadMoment = new Date(Date.now() + MIN_BOOKING_LEAD_MINUTES * 60 * 1000);
        if (appointmentMoment < minLeadMoment) {
            return res.status(400).json({
                message: `Debes agendar con al menos ${MIN_BOOKING_LEAD_MINUTES} minutos de anticipación.`,
            });
        }

        // Vuelve a revisar que el horario siga libre, por si alguien más lo tomó mientras el
        // paciente completaba el formulario. Sin proveedor elegido no hay una agenda puntual
        // contra la cual revalidar (cualquiera podría aceptarla después), así que esta
        // revalidación solo aplica cuando sí se eligió uno. Usa la misma validación que
        // aceptar/asignar una cita en vez de un solape a mano: así también respeta el tiempo
        // entre citas (buffer_time), que antes solo se usaba para sugerir horarios pero nunca
        // se hacía cumplir de verdad al confirmar uno.
        if (requiresDoctor) {
            if (doctor_id) {
                const { free, reason } = await isSlotFreeForDoctor(doctor_id, date, start_time, end_time);
                if (!free) {
                    return res.status(409).json({ message: reason || "Ese horario ya no está disponible. Por favor elige otro." });
                }
            }

            // Si el procedimiento requiere enfermera de apoyo además del doctor, no basta con
            // que un doctor esté libre, también tiene que haber al menos una enfermera libre
            // en ese mismo horario. Si no la hay, el horario no se puede ofrecer: cualquier
            // doctor que acepte la solicitud igual chocaría con ese mismo requisito.
            if (requiresNurse) {
                const activeNurses = await nursesModel.find({ is_active: true }).select("_id").lean();
                const nurseAvailability = await Promise.all(
                    activeNurses.map((n) => isNurseAvailable(n._id, date, start_time, end_time, appointmentsModel))
                );
                if (!nurseAvailability.some(Boolean)) {
                    return res.status(409).json({ message: "No hay enfermeras disponibles para esta fecha y/o horario. Por favor elige otra fecha y/o horario." });
                }
            }
        } else if (nurse_id) {
            const { free, reason } = await isSlotFreeForNurse(nurse_id, date, start_time, end_time, appointmentsModel);
            if (!free) {
                return res.status(409).json({ message: reason || "Ese horario ya no está disponible. Por favor elige otro." });
            }
        } else {
            // Sin enfermera elegida (paso "horario primero"): tiene que haber al menos una
            // enfermera realmente libre en ese horario para poder ofrecerlo como disponible.
            const activeNurses = await nursesModel.find({ is_active: true }).select("_id").lean();
            const nurseAvailability = await Promise.all(
                activeNurses.map((n) => isNurseAvailable(n._id, date, start_time, end_time, appointmentsModel))
            );
            if (!nurseAvailability.some(Boolean)) {
                return res.status(409).json({ message: "No hay enfermeras disponibles para esta fecha y/o horario. Por favor elige otra fecha y/o horario." });
            }
        }

        const newAppointment = new appointmentsModel({
            doctor_id: requiresDoctor && doctor_id ? doctor_id : undefined,
            nurse_id: !requiresDoctor && nurse_id ? nurse_id : undefined,
            patient_id: req.user.id,
            procedure_id: procedureRefs,
            type,
            appointment_type: appointmentTypeName,
            date: dayStart,
            start_time,
            end_time,
            duration_minutes: duration,
            description: description || undefined,
            // Pagar en línea: la cita NO queda "pending" (real, visible en "Por aceptar")
            // hasta que el anticipo se confirme de verdad — ver confirmAppointmentPayment /
            // wompiWebhookController, que la pasan a "pending" y recién ahí notifican a los
            // proveedores (activateAfterDeposit). Antes quedaba "pending" desde este mismo
            // POST, antes de que el paciente llegara siquiera a la pantalla de pago: si
            // abandonaba el pago, ya había un doctor notificado y un horario "solicitado"
            // por una cita que nunca se iba a pagar. "pending_payment" no es un estado real
            // de la máquina de estados de la cita (no aparece en ningún filtro de "Mis
            // citas" ni de "Por aceptar" de ningún rol): es solo el resguardo del horario
            // mientras el paciente está en la pantalla de tarjeta. Si nunca paga, se limpia
            // solo (ver runAppointmentAutoTransitions). Pagar en recepción sigue igual: no
            // hay pago que confirmar, así que queda "pending" desde ya.
            status: pagaEnLinea ? "pending_payment" : "pending",
            total,
            // El pago en línea solo cobra el anticipo, no el total
            deposit_amount: pagaEnLinea ? calcDepositAmount(total) : undefined,
        });
        await newAppointment.save();

        // Se devuelve la cita ya "poblada" para armar el ticket sin pedirla de nuevo.
        // El modelo de procedimientos está registrado como "procedure" (minúscula) aunque
        // el ref del esquema diga "Procedure"; por eso se indica el nombre del modelo a mano.
        const populated = await appointmentsModel
            .findById(newAppointment._id)
            .populate("doctor_id", "name last_name img_url")
            .populate("nurse_id", "name last_name img_url")
            .populate({ path: "procedure_id", model: "procedure", select: "name" });

        // Pagar en línea: todavía no es una solicitud real (ver status arriba), así que
        // nadie se notifica hasta que el anticipo se confirme (activateAfterDeposit).
        if (!pagaEnLinea) {
            await notifyPendingRequestToProviders({
                appointmentId: newAppointment._id,
                patientId: req.user.id,
                procedureName: (populated.procedure_id || []).map((p) => p.name).join(", ") || type,
                dateStr: date,
                dayStart,
                start_time,
                end_time,
                requiresDoctor,
                sinProveedorElegido,
                doctor_id,
                nurse_id,
            });
        }

        return res.status(201).json({
            message: "Cita agendada correctamente",
            appointment: populated,
            instructions,
            requiresPayment: pagaEnLinea,
        });
    } catch (error) {
        console.log("error " + error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// GET /api/patient-portal/appointments — citas del paciente logueado (solo las propias)
patientPortalController.getMyAppointments = async (req, res) => {
    try {
        // Transiciones perezosas al leer: citas pasadas sin realizar -> no_show, y
        // solicitudes que nadie aceptó a tiempo -> needs_reschedule (con su notificación).
        await runAppointmentAutoTransitions();

        const appointments = await appointmentsModel
            .find({ patient_id: req.user.id })
            .populate("doctor_id", "name last_name img_url")
            .populate("nurse_id", "name last_name img_url")
            .populate({ path: "procedure_id", model: "procedure", select: "name" })
            .sort({ date: -1, start_time: -1 });
        return res.status(200).json(appointments);
    } catch (error) {
        console.log("error " + error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// PATCH /api/patient-portal/appointments/:id/cancel — el paciente cancela una cita propia
patientPortalController.cancelMyAppointment = async (req, res) => {
    try {
        const appointment = await appointmentsModel.findById(req.params.id);
        if (!appointment) {
            return res.status(404).json({ message: "Cita no encontrada." });
        }
        // Nunca dejar que un paciente cancele una cita que no es suya
        if (appointment.patient_id.toString() !== req.user.id) {
            return res.status(403).json({ message: "No puedes modificar esta cita." });
        }
        if (["completed", "cancelled", "no_show", "expired"].includes(appointment.status)) {
            return res.status(400).json({ message: "Esta cita ya no se puede cancelar." });
        }

        // A menos de media hora del inicio (o ya empezada), la cita ya no se
        // puede cancelar sola: el paciente debe coordinarlo con quien lo
        // atenderá para no dejar plantado al proveedor a última hora.
        if (isCancelLockedForPatient(appointment)) {
            const conQuien = appointment.doctor_id ? "el doctor que te atenderá" : "la clínica";
            return res.status(400).json({
                message: `Tu cita está próxima a comenzar. Para cancelarla, comunícate con ${conQuien} y lleguen a un acuerdo.`,
            });
        }

        // El motivo real que escribió el paciente (mobile ya lo manda; el portal web manda
        // uno propio según si viene de "Cancelar cita" o de "Reagendar cita"). Antes esto
        // ignoraba por completo lo que llegara en el body y siempre guardaba el mismo texto
        // fijo, así que el personal nunca veía la razón real de la cancelación.
        const reasonEnviado = String(req.body.cancellation_reason || "").trim();
        if (reasonEnviado && (reasonEnviado.length < 3 || reasonEnviado.length > 500)) {
            return res.status(400).json({ message: "El motivo debe tener entre 3 y 500 caracteres." });
        }

        // El anticipo ya pagado (si lo hay) no se reembolsa por política de la clínica:
        // solo aparta la hora, así que cancelar no dispara ningún reembolso ni reversión.
        appointment.status = "cancelled";
        appointment.cancellation_reason = reasonEnviado || "Cancelada por el paciente";
        await appointment.save();

        return res.status(200).json({ message: "Cita cancelada correctamente" });
    } catch (error) {
        console.log("error " + error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// DELETE /api/patient-portal/appointments/:id — el paciente elimina por completo una
// solicitud que nunca llegó a confirmarse (pending, needs_reschedule o expired: los mismos
// 3 estados desde los que ya se puede reagendar). A diferencia de cancelar (que solo cambia
// el status y deja el registro), esto la borra de verdad: como ningún doctor llegó a
// aceptarla, no hay consulta ni nada clínico que dependa de ella. Reusa
// deleteAppointmentCascade, el mismo helper que ya usa el borrado de citas del personal.
patientPortalController.deleteMyAppointmentRequest = async (req, res) => {
    try {
        const appointment = await appointmentsModel.findById(req.params.id).select("patient_id status");
        if (!appointment) {
            return res.status(404).json({ message: "Cita no encontrada." });
        }
        if (appointment.patient_id.toString() !== req.user.id) {
            return res.status(403).json({ message: "No puedes modificar esta cita." });
        }
        if (!["pending", "needs_reschedule", "expired"].includes(appointment.status)) {
            return res.status(400).json({ message: "Esta cita ya no puede eliminarse." });
        }

        await deleteAppointmentCascade(req.params.id);
        return res.status(200).json({ message: "Cita eliminada correctamente." });
    } catch (error) {
        console.log("error " + error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// PATCH /api/patient-portal/appointments/:id/reschedule — el paciente reagenda una cita
// propia que quedó "por reagendar" (nadie la aceptó a tiempo o le dieron el cupo a otro),
// o que sigue "pending" y quiere moverla. Reusa el MISMO registro: conserva id, historial
// y el anticipo ya pagado, y vuelve a "pending" para que un proveedor la acepte otra vez.
patientPortalController.rescheduleMyAppointment = async (req, res) => {
    try {
        const { date, start_time, doctor_id, nurse_id } = req.body;
        if (!date || !start_time) {
            return res.status(400).json({ message: "Debes elegir una nueva fecha y hora." });
        }

        const appointment = await appointmentsModel.findOne({ _id: req.params.id, patient_id: req.user.id });
        if (!appointment) {
            return res.status(404).json({ message: "Cita no encontrada." });
        }
        if (![...RESCHEDULABLE_STATUSES, "pending"].includes(appointment.status)) {
            return res.status(400).json({ message: "Esta cita no se puede reagendar." });
        }

        const procedures = await procedureModel.find({ _id: { $in: appointment.procedure_id } })
            .select("name requires_doctor requires_nurse");
        if (procedures.length === 0) {
            return res.status(400).json({ message: "El procedimiento de esta cita ya no está disponible." });
        }
        const requiresDoctor = procedures.some((p) => p.requires_doctor !== false);
        const requiresNurse = procedures.some((p) => !!p.requires_nurse);

        const end_time = addMinutes(start_time, appointment.duration_minutes);
        const { start: dayStart } = getDayRange(date);

        const [h, m] = start_time.split(":").map(Number);
        const cuando = new Date(dayStart);
        cuando.setHours(h, m, 0, 0);
        // Mismo mínimo de anticipación que bookAppointment (ver MIN_BOOKING_LEAD_MINUTES):
        // reagendar es, en la práctica, agendar de nuevo, así que debe cumplir la misma regla.
        const minLeadMoment = new Date(Date.now() + MIN_BOOKING_LEAD_MINUTES * 60 * 1000);
        if (cuando < minLeadMoment) {
            return res.status(400).json({
                message: `Debes reagendar con al menos ${MIN_BOOKING_LEAD_MINUTES} minutos de anticipación.`,
            });
        }

        const sinProveedorElegido = requiresDoctor ? !doctor_id : !nurse_id;

        // Un pending (scheduled) de otro no bloquea nada mientras sea solicitud; solo
        // bloquean scheduled/completed (ver isSlotFreeForDoctor / OCCUPYING_STATUSES).
        if (requiresDoctor && doctor_id) {
            const { free, reason } = await isSlotFreeForDoctor(doctor_id, date, start_time, end_time, appointment._id);
            if (!free) {
                return res.status(409).json({ message: reason || "Ese horario ya no está disponible. Elige otro." });
            }
        } else if (!requiresDoctor && nurse_id) {
            const { free, reason } = await isSlotFreeForNurse(nurse_id, date, start_time, end_time, appointmentsModel, appointment._id);
            if (!free) {
                return res.status(409).json({ message: reason || "Ese horario ya no está disponible. Elige otro." });
            }
        }
        // Si hace falta enfermera (procedimiento sin doctor, o con doctor + apoyo sin elegir
        // proveedor), tiene que haber al menos una libre en ese horario.
        if ((!requiresDoctor && !nurse_id) || (requiresDoctor && requiresNurse && !doctor_id)) {
            const activeNurses = await nursesModel.find({ is_active: true }).select("_id").lean();
            const disponibles = await Promise.all(
                activeNurses.map((n) => isNurseAvailable(n._id, date, start_time, end_time, appointmentsModel, appointment._id))
            );
            if (!disponibles.some(Boolean)) {
                return res.status(409).json({ message: "No hay enfermeras disponibles para esa fecha y horario. Elige otra." });
            }
        }

        appointment.date = dayStart;
        appointment.start_time = start_time;
        appointment.end_time = end_time;
        appointment.doctor_id = requiresDoctor && doctor_id ? doctor_id : null;
        appointment.nurse_id = !requiresDoctor && nurse_id ? nurse_id : null;
        appointment.status = "pending";
        appointment.reschedule_reason = undefined;
        appointment.cancellation_reason = undefined;
        // deposit_amount / deposit_paid / wompi_transaction_id / total NO se tocan: el
        // anticipo ya pagado sigue en la misma cita reagendada.
        await appointment.save();

        await notifyPendingRequestToProviders({
            appointmentId: appointment._id,
            patientId: req.user.id,
            procedureName: procedures.map((p) => p.name).join(", ") || appointment.type,
            dateStr: date,
            dayStart,
            start_time,
            end_time,
            requiresDoctor,
            sinProveedorElegido,
            doctor_id,
            nurse_id,
        });

        try {
            await notificationModel.create({
                recipient_role: "patient",
                recipient_id: req.user.id,
                title: "Cita reagendada",
                type: "appointment_updated",
                message: "Reagendaste tu cita. Un doctor debe aceptarla para que quede confirmada.",
                appointment_id: appointment._id,
                action_url: "/mis-citas",
            });
        } catch (e) {
            console.log("Error notificando reagendamiento al paciente:", e);
        }

        return res.status(200).json({ message: "Cita reagendada correctamente", appointment });
    } catch (error) {
        console.log("error " + error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// GET /api/patient-portal/prescriptions — recetas médicas reales del paciente
patientPortalController.getPrescriptions = async (req, res) => {
    try {
        const consultations = await fetchConsultations(req.user.id);
        const prescriptions = await fetchPrescriptions(req.user.id, consultations);
        return res.status(200).json(prescriptions);
    } catch (error) {
        console.log("error " + error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// GET /api/patient-portal/lab-orders — órdenes de laboratorio del paciente
// (las que el doctor generó y quedaron enlazadas al finalizar una consulta)
patientPortalController.getMyLabOrders = async (req, res) => {
    try {
        const consultations = await fetchConsultations(req.user.id);
        const labOrders = await fetchLabOrders(req.user.id, consultations);
        return res.status(200).json(labOrders);
    } catch (error) {
        console.log("error " + error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// GET /api/patient-portal/sick-leaves — incapacidades médicas reales del paciente
patientPortalController.getSickLeaves = async (req, res) => {
    try {
        const sickLeaves = await sickLeavesModel
            .find({ patient_id: req.user.id })
            .populate("doctor_id", "name last_name")
            .populate("nurse_id", "name last_name")
            .sort({ start_date: -1 });
        return res.status(200).json(sickLeaves);
    } catch (error) {
        console.log("error " + error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// GET /api/patient-portal/referrals — referencias médicas reales (campo "referral" de cada consulta)
patientPortalController.getReferrals = async (req, res) => {
    try {
        const consultations = await fetchConsultations(req.user.id);
        const referrals = consultations
            .filter((c) => c.referral?.reason)
            .map((c) => ({
                _id: c._id,
                date: c.date,
                doctor: c.appointment_id?.doctor_id || null,
                reason: c.referral.reason,
                referred_to: c.referral.referred_to,
                referred_date: c.referral.referred_date,
                status: c.referral.status,
                // Datos que la hoja de referencia pide y que el paciente ya no
                // ve de otra forma: los tres del panel "Referencia" + los que se
                // sacan del resto de la consulta (diagnóstico, PA, SPO2, examen
                // físico). El nombre/edad/teléfono los pone el front con la sesión.
                referred_doctor_address: c.referral.referred_doctor_address || "",
                referred_doctor_phone: c.referral.referred_doctor_phone || "",
                heart_rate: c.referral.heart_rate || "",
                respiratory_rate: c.referral.respiratory_rate || "",
                diagnosis: c.clinical_data?.diagnosis || "",
                diagnosis_description: c.clinical_data?.diagnosis_description || "",
                icd_diagnosis: c.clinical_data?.icd_diagnosis || "",
                blood_pressure: c.clinical_data?.triage?.blood_pressure || "",
                spo2: c.clinical_data?.triage?.oxygen_saturation ?? "",
                physical_exam: c.physical_exam || null,
            }));
        return res.status(200).json(referrals);
    } catch (error) {
        console.log("error " + error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// GET /api/patient-portal/medications/today — medicamentos activos hoy, con su estado tomado/pendiente
patientPortalController.getTodayMedications = async (req, res) => {
    try {
        const consultations = await fetchConsultations(req.user.id);
        const prescriptions = await fetchPrescriptions(req.user.id, consultations);
        const meds = await fetchTodayMedications(req.user.id, prescriptions);
        notifyPendingMedicationsIfAny(req.user.id, meds);
        return res.status(200).json(meds);
    } catch (error) {
        console.log("error " + error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// PATCH /api/patient-portal/medications/:medicationId/taken — marca/desmarca un medicamento como tomado hoy
patientPortalController.markMedicationTaken = async (req, res) => {
    try {
        const { medicationId } = req.params;
        const { taken } = req.body;
        const todayStr = toDateStr(new Date());

        await medicationLogModel.findOneAndUpdate(
            { patient_id: req.user.id, medication_id: medicationId, date: todayStr },
            { taken: !!taken },
            { upsert: true }
        );

        return res.status(200).json({ message: "Actualizado" });
    } catch (error) {
        console.log("error " + error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// GET /api/patient-portal/dashboard — resumen para el panel principal: próxima cita, contadores,
// actividad reciente, recordatorios y documentos recientes, todo con datos reales del paciente
patientPortalController.getDashboardSummary = async (req, res) => {
    try {
        const patientId = req.user.id;
        const hoy = new Date();
        // Construido explícitamente en UTC (Date.UTC + getters UTC), no con getters locales
        // del proceso: se compara contra appointment.date, que se guarda como medianoche UTC
        // real. Antes funcionaba solo porque Render corre el proceso en UTC, una dependencia
        // implícita de la zona horaria del entorno en vez de una construcción explícita.
        const inicioHoy = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate()));

        // Mismas transiciones perezosas que corren al listar las citas: así el aviso de
        // "citas por reagendar" del dashboard aparece aunque el paciente entre directo aquí.
        await runAppointmentAutoTransitions();

        const [appointments, consultations, sickLeaves] = await Promise.all([
            appointmentsModel
                .find({ patient_id: patientId })
                .populate("doctor_id", "name last_name img_url")
                .sort({ date: -1, start_time: -1 }),
            fetchConsultations(patientId),
            sickLeavesModel.find({ patient_id: patientId }).populate("doctor_id", "name last_name").populate("nurse_id", "name last_name").sort({ start_date: -1 }),
        ]);
        const prescriptions = await fetchPrescriptions(patientId, consultations);
        const todayMedications = await fetchTodayMedications(patientId, prescriptions);
        notifyPendingMedicationsIfAny(patientId, todayMedications);

        // Próxima cita: la más cercana entre las pendientes/programadas de hoy en adelante
        const nextAppointment = appointments
            .filter((a) => ["pending", "scheduled"].includes(a.status) && new Date(a.date) >= inicioHoy)
            .sort((a, b) => new Date(a.date) - new Date(b.date) || a.start_time.localeCompare(b.start_time))[0] || null;

        // Citas por reagendar: nadie las aceptó a tiempo o le dieron el cupo a otro paciente.
        // El dashboard muestra un aviso para que el paciente las reagende.
        const needsReschedule = appointments
            .filter((a) => a.status === "needs_reschedule" || a.status === "expired")
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        // Línea de tiempo: consultas, recetas e incapacidades reales, ordenadas de más reciente a más antigua
        const eventos = [
            ...consultations.map((c) => ({ type: "consulta", label: "Consulta realizada", date: c.date, doctor: c.appointment_id?.doctor_id || null })),
            ...prescriptions.map((p) => ({ type: "receta", label: "Receta emitida", date: p.issued_at, doctor: p.doctor })),
            ...sickLeaves.map((s) => ({ type: "incapacidad", label: "Documento cargado", date: s.start_date, doctor: s.doctor_id })),
        ]
            .filter((e) => e.date)
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 3);

        // Documentos recientes: recetas + incapacidades + referencias, mezclados por fecha
        const referrals = consultations.filter((c) => c.referral?.reason);
        const documentos = [
            ...prescriptions.map((p) => ({ type: "receta", label: "Receta médica", date: p.issued_at, doctor: p.doctor })),
            ...sickLeaves.map((s) => ({ type: "incapacidad", label: "Incapacidad médica", date: s.start_date, doctor: s.doctor_id })),
            ...referrals.map((c) => ({ type: "referencia", label: "Referencia médica", date: c.date, doctor: c.appointment_id?.doctor_id })),
        ]
            .filter((d) => d.date)
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 3);

        const pendingMedsCount = todayMedications.filter((m) => !m.taken).length;

        return res.status(200).json({
            nextAppointment,
            needsReschedule,
            stats: {
                consultas: consultations.length,
                documentos: prescriptions.length + sickLeaves.length + referrals.length,
                recordatorios: (nextAppointment ? 1 : 0) + pendingMedsCount,
            },
            activity: eventos,
            recentDocuments: documentos,
            todayMedications,
        });
    } catch (error) {
        console.log("error " + error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// POST /api/patient-portal/appointments/:id/confirm-payment — el frontend ya cobró la tarjeta
// directamente contra Wompi (vía /api/wompi/paymentTest) y manda aquí el "idTransaccion" que
// Wompi le devolvió. Nunca se confía en ese resultado a ciegas: este endpoint vuelve a
// preguntarle a Wompi por esa transacción con nuestras propias credenciales, y solo si Wompi
// confirma que está aprobada, marca el anticipo como pagado. El status de la cita no cambia
// aquí: pagar el anticipo no salta la aceptación del doctor, la cita sigue "pending" hasta
// que se acepte desde "Por aceptar".
patientPortalController.confirmAppointmentPayment = async (req, res) => {
    try {
        const { transactionId } = req.body;
        if (!transactionId) {
            return res.status(400).json({ message: "Falta el identificador de la transacción." });
        }

        const appointment = await appointmentsModel
            .findById(req.params.id)
            .populate("doctor_id", "name last_name img_url")
            .populate("nurse_id", "name last_name img_url")
            .populate({ path: "procedure_id", model: "procedure", select: "name" });

        if (!appointment) {
            return res.status(404).json({ message: "Cita no encontrada." });
        }
        if (appointment.patient_id.toString() !== req.user.id) {
            return res.status(403).json({ message: "No puedes modificar esta cita." });
        }
        if (appointment.deposit_paid) {
            // Autorreparación: si el anticipo ya había quedado marcado como pagado pero
            // activateAfterDeposit no llegó a completarse la vez anterior (por ejemplo, el
            // bug de cast a ObjectId que atascaba citas en "pending_payment" para siempre),
            // esto le da otra oportunidad de terminar de activarla. No hace nada si ya no
            // aplica (ver el chequeo de status al inicio de esa función).
            await activateAfterDeposit(appointment);
            return res.status(200).json({ status: appointment.status, appointment });
        }

        const transaccion = await getTransactionStatus(transactionId);

        // Se guarda la referencia de la transacción desde ya, sin importar si termina
        // aprobada o no: así nunca se pierde el rastro de un cobro ya intentado, ni
        // aunque esta misma llamada falle más adelante o el paciente cierre la página.
        // Esto permite reconciliar después (o que el paciente reintente confirmar sin
        // volver a cobrar la tarjeta) en vez de arriesgar un cobro duplicado.
        appointment.wompi_transaction_id = transactionId;
        await appointment.save();

        if (transaccion.esAprobada !== true) {
            return res.status(400).json({ message: "El pago no fue aprobado por el banco." });
        }
        // El monto cobrado en Wompi debe coincidir con el anticipo real de la cita (no el
        // total): como el cobro lo dispara el navegador, alguien podría intentar mandar un
        // monto menor
        if (Number(transaccion.monto) < Number(appointment.deposit_amount)) {
            return res.status(400).json({ message: "El monto cobrado no coincide con el anticipo de la cita." });
        }

        appointment.deposit_paid = true;
        await appointment.save();

        // Recién ahora la cita es una solicitud real: pasa a "pending" y se notifica a los
        // proveedores (no hace nada si ya estaba "pending" por algún otro camino).
        await activateAfterDeposit(appointment);

        return res.status(200).json({ status: appointment.status, appointment });
    } catch (error) {
        console.log("error " + error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export default patientPortalController;