import appointmentsModel from "../../models/appointments/appointments.js";
import doctorsModel from "../../models/doctors/doctors.js";
import scheduleModel from "../../models/schedule/schedule.js";
import procedureModel from "../../models/procedures/procedures.js";
import consultationsModel from "../../models/consultations/consultation.js";
import prescriptionsModel from "../../models/consultations/prescription.js";
import sickLeavesModel from "../../models/sickLeaves/sickLeave.js";
import medicationLogModel from "../../models/medicationLog/medicationLog.js";
import patientsModel from "../../models/patients/patients.js";
import notificationModel from "../../models/notifications/notification.js";
import nursesModel from "../../models/nurses/nurses.js";
import appointmentTypeModel from "../../models/appointmentTypes/appointmentType.js";
import { isNurseAvailable } from "../../controllers/schedule/nurseScheduleController.js";
import { isSlotFreeForDoctor } from "../../controllers/schedule/scheduleController.js";
import { getTransactionStatus } from "../../utils/wompi.js";

const patientPortalController = {};

// Duración y precio fijos para una consulta general (no depende de un procedimiento)
const GENERAL_CONSULT = {
    type: "Consulta Médica General",
    duration: 30,
    price: 15,
    instructions: "Llega 10 minutos antes de tu cita con tu documento de identidad (DUI) a mano.",
};

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

// Resuelve automáticamente el "appointment_type" (catálogo del admin, el que pinta
// la leyenda/color en el calendario) para una cita agendada desde el portal del
// paciente, que nunca lo elige a mano (a diferencia del formulario del panel privado,
// ver AppointmentsFormCalendar.jsx). Sin esto la cita queda con el color/etiqueta
// genéricos de respaldo (ver FALLBACK_COLOR en AppointmentsCalendar.jsx) en vez de la
// etiqueta real creada por el admin en Horarios > Tipos de cita.
// Primero intenta calzar por nombre exacto (con el procedimiento elegido, o con
// "Consulta Médica General"); si no hay coincidencia, cae al primer tipo de esa
// categoría (o "ambos") como mejor aproximación, en vez de dejarlo vacío.
const resolveAppointmentType = async (category, matchName) => {
    const candidates = await appointmentTypeModel
        .find({ category: { $in: [category, "ambos"] } })
        .select("name")
        .lean();
    if (candidates.length === 0) return undefined;
    const exact = matchName
        ? candidates.find((t) => t.name.trim().toLowerCase() === matchName.trim().toLowerCase())
        : null;
    return (exact || candidates[0]).name;
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
        .select("date appointment_id referral follow_up_date")
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
        lab_orders: p.lab_orders,
        post_operative_instructions: p.post_operative_instructions,
        issued_at: p.issued_at,
        doctor: consultationById.get(String(p.consultation_id))?.appointment_id?.doctor_id || null,
    }));
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

// GET /api/patient-portal/procedures — catálogo de procedimientos activos,
// para que el paciente elija si su cita es un procedimiento o consulta general
patientPortalController.getProcedures = async (req, res) => {
    try {
        const procedures = await procedureModel
            .find({ is_active: true })
            .select("name description estimated_duration price requires_nurse pre_care_instructions");
        return res.status(200).json(procedures);
    } catch (error) {
        console.log("error " + error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

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
        const { doctor_id, date, start_time, procedure_id, payment_method } = req.body;
        const description = req.body.description?.trim();
        const pagaEnLinea = payment_method === "online";
        const sinDoctorElegido = !doctor_id;

        if (!date || !start_time) {
            return res.status(400).json({ message: "Faltan datos para agendar la cita (fecha u hora)." });
        }

        if (description && (description.length < 3 || description.length > 500)) {
            return res.status(400).json({ message: "El motivo debe tener entre 3 y 500 caracteres." });
        }

        if (!sinDoctorElegido) {
            const doctor = await doctorsModel.findById(doctor_id);
            if (!doctor) {
                return res.status(404).json({ message: "El doctor seleccionado no existe." });
            }
        }

        // Según sea consulta general o un procedimiento, se arma tipo/duración/precio/indicaciones
        let type, duration, total, instructions, procedureRef, procedureName, requiresNurse = false;
        if (procedure_id) {
            const procedure = await procedureModel.findOne({ _id: procedure_id, is_active: true });
            if (!procedure) {
                return res.status(404).json({ message: "El procedimiento seleccionado no existe o ya no está disponible." });
            }
            type = "Procedimiento";
            duration = Number(procedure.estimated_duration) || 30;
            total = Number(procedure.price) || 0;
            instructions = procedure.pre_care_instructions || GENERAL_CONSULT.instructions;
            procedureRef = procedure._id;
            procedureName = procedure.name;
            requiresNurse = !!procedure.requires_nurse;
        } else {
            type = GENERAL_CONSULT.type;
            duration = GENERAL_CONSULT.duration;
            total = GENERAL_CONSULT.price;
            instructions = GENERAL_CONSULT.instructions;
            procedureRef = undefined;
        }

        // El paciente nunca elige el tipo de cita del catálogo del admin (a diferencia
        // del formulario del panel privado): se resuelve solo para que la cita no quede
        // con la etiqueta/color genéricos de respaldo en el calendario.
        const appointmentTypeName = await resolveAppointmentType(
            procedure_id ? "procedimiento" : "consulta",
            procedure_id ? procedureName : GENERAL_CONSULT.type
        );

        const end_time = addMinutes(start_time, duration);
        const { start: dayStart, end: dayEnd } = getDayRange(date);

        // No se puede agendar una cita en una fecha/hora que ya pasó
        const [h, m] = start_time.split(":").map(Number);
        const appointmentMoment = new Date(dayStart);
        appointmentMoment.setHours(h, m, 0, 0);
        if (appointmentMoment < new Date()) {
            return res.status(400).json({ message: "No puedes agendar una cita en una fecha u hora que ya pasó." });
        }

        // Vuelve a revisar que el horario siga libre, por si alguien más lo tomó
        // mientras el paciente completaba el formulario. Sin doctor elegido no hay una
        // agenda puntual contra la cual revalidar (cualquier doctor podría aceptarla
        // después), así que esta revalidación solo aplica cuando sí se eligió doctor.
        // Usa la misma validación que aceptar/asignar una cita (isSlotFreeForDoctor) en
        // vez de un solape a mano: así también respeta el tiempo entre citas (buffer_time)
        // del doctor, que antes solo se usaba para sugerir horarios pero nunca se hacía
        // cumplir de verdad al confirmar uno.
        if (!sinDoctorElegido) {
            const { free, reason } = await isSlotFreeForDoctor(doctor_id, date, start_time, end_time);
            if (!free) {
                return res.status(409).json({ message: reason || "Ese horario ya no está disponible. Por favor elige otro." });
            }
        }

        // Igual que en appointmentsController.acceptAppointment (el flujo del panel privado):
        // si el procedimiento requiere enfermera, no basta con que un doctor esté libre, también
        // tiene que haber al menos una enfermera libre en ese mismo horario. Si no la hay, el
        // horario no se puede ofrecer: cualquier doctor que acepte la solicitud igual chocaría con
        // ese mismo requisito al intentar aceptarla.
        if (requiresNurse) {
            const activeNurses = await nursesModel.find({ is_active: true }).select("_id").lean();
            const nurseAvailability = await Promise.all(
                activeNurses.map((n) => isNurseAvailable(n._id, date, start_time, end_time, appointmentsModel))
            );
            if (!nurseAvailability.some(Boolean)) {
                return res.status(409).json({ message: "No hay enfermeras disponibles en ese horario para este procedimiento. Por favor elige otro." });
            }
        }

        const newAppointment = new appointmentsModel({
            doctor_id: sinDoctorElegido ? undefined : doctor_id,
            patient_id: req.user.id,
            procedure_id: procedureRef,
            type,
            appointment_type: appointmentTypeName,
            date: dayStart,
            start_time,
            end_time,
            duration_minutes: duration,
            description: description || undefined,
            // Toda cita creada desde el portal público queda "pending" sin importar el
            // método de pago: el doctor elegido debe aceptarla desde "Por aceptar" antes
            // de que quede realmente agendada, igual que las solicitudes sin doctor.
            status: "pending",
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
            .populate({ path: "procedure_id", model: "procedure", select: "name" });

        // Notifica al doctor elegido (o, sin doctor elegido, a todos los doctores activos)
        // que hay una cita nueva por aceptar. Nunca debe tumbar la creación de la cita si
        // la notificación falla.
        try {
            const patient = await patientsModel.findById(req.user.id).select("name last_name");
            const patientName = patient ? `${patient.name} ${patient.last_name || ""}`.trim() : "un paciente";
            const tipoLabel = procedure_id ? populated.procedure_id?.name || type : GENERAL_CONSULT.type;
            const fechaFormateada = new Intl.DateTimeFormat("es-SV", {
                day: "2-digit", month: "long", year: "numeric", timeZone: "UTC",
            }).format(dayStart);
            const mensaje = sinDoctorElegido
                ? `El paciente ${patientName} solicitó una cita de ${tipoLabel} sin doctor asignado para el ${fechaFormateada} en el horario de ${start_time}. Cualquier doctor puede aceptarla.`
                : `El paciente ${patientName} ha agendado una cita de ${tipoLabel} para el ${fechaFormateada} en el horario de ${start_time}.`;

            if (sinDoctorElegido) {
                const doctoresActivos = await doctorsModel.find({ is_active: true }).select("_id");
                if (doctoresActivos.length > 0) {
                    await notificationModel.insertMany(doctoresActivos.map((d) => ({
                        recipient_role: "doctor",
                        recipient_id: d._id,
                        title: "Nueva solicitud de cita sin asignar",
                        type: "appointment_created",
                        message: mensaje,
                        appointment_id: newAppointment._id,
                        // Sin doctor asignado, ningún doctor en particular "tiene" esta cita
                        // todavía: manda al listado de Citas, no al formulario de edición de
                        // esta cita puntual. ?view=citas fuerza la pestaña superior "Citas" de
                        // esta página (por defecto abre en "Calendario"); adentro,
                        // AppointmentsGrid ya abre en "Por aceptar" por defecto. tab=pending y
                        // highlight (aporte del compañero) llevan directo a esa sub pestaña con
                        // esta tarjeta resaltada.
                        action_url: `/calendar/appointments?view=citas&tab=pending&highlight=${newAppointment._id}`,
                    })));
                }
            } else {
                await notificationModel.create({
                    recipient_role: "doctor",
                    recipient_id: doctor_id,
                    title: "Nueva cita por aceptar",
                    type: "appointment_created",
                    message: mensaje,
                    appointment_id: newAppointment._id,
                    // Manda al listado de Citas (pestaña "Por aceptar" por defecto para un
                    // doctor), no al detalle/edición de esta cita puntual: ahí es donde
                    // realmente se acepta, con el flujo de aceptación completo (asignar
                    // enfermera si aplica, etc.), no en la pantalla de editar. ?view=citas
                    // fuerza la pestaña superior "Citas" (por defecto abre en "Calendario").
                    action_url: `/calendar/appointments?view=citas&tab=pending&highlight=${newAppointment._id}`,
                });
            }
        } catch (notificationError) {
            console.log("Error notificando nueva cita al doctor:", notificationError);
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
        const appointments = await appointmentsModel
            .find({ patient_id: req.user.id })
            .populate("doctor_id", "name last_name img_url")
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

// GET /api/patient-portal/sick-leaves — incapacidades médicas reales del paciente
patientPortalController.getSickLeaves = async (req, res) => {
    try {
        const sickLeaves = await sickLeavesModel
            .find({ patient_id: req.user.id })
            .populate("doctor_id", "name last_name")
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
        const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());

        const [appointments, consultations, sickLeaves] = await Promise.all([
            appointmentsModel
                .find({ patient_id: patientId })
                .populate("doctor_id", "name last_name img_url")
                .sort({ date: -1, start_time: -1 }),
            fetchConsultations(patientId),
            sickLeavesModel.find({ patient_id: patientId }).populate("doctor_id", "name last_name").sort({ start_date: -1 }),
        ]);
        const prescriptions = await fetchPrescriptions(patientId, consultations);
        const todayMedications = await fetchTodayMedications(patientId, prescriptions);

        // Próxima cita: la más cercana entre las pendientes/programadas de hoy en adelante
        const nextAppointment = appointments
            .filter((a) => ["pending", "scheduled"].includes(a.status) && new Date(a.date) >= inicioHoy)
            .sort((a, b) => new Date(a.date) - new Date(b.date) || a.start_time.localeCompare(b.start_time))[0] || null;

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
            .populate({ path: "procedure_id", model: "procedure", select: "name" });

        if (!appointment) {
            return res.status(404).json({ message: "Cita no encontrada." });
        }
        if (appointment.patient_id.toString() !== req.user.id) {
            return res.status(403).json({ message: "No puedes modificar esta cita." });
        }
        if (appointment.deposit_paid) {
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

        return res.status(200).json({ status: appointment.status, appointment });
    } catch (error) {
        console.log("error " + error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export default patientPortalController;