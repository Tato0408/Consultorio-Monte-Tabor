import appointmentsModel from "../../models/appointments/appointments.js";
import doctorsModel from "../../models/doctors/doctors.js";
import nursesModel from "../../models/nurses/nurses.js";
import scheduleModel from "../../models/schedule/schedule.js";
import nurseScheduleModel from "../../models/schedule/nurseSchedule.js";
import { buildProviderAgenda } from "../../services/agendaService.js";
import { buildActivePartiesAppointmentFilter } from "../../utils/activeScope.js";

const nurseDashboardController = {};

// Mismo enum que valida appointmentsController.insertAppointment. El
// estado confirmada en la UI corresponde a scheduled en la base de
// datos.
const PENDING = "pending";
const CONFIRMED = "scheduled";
const COMPLETED = "completed";
const CANCELLED = "cancelled";

const pad = (n) => String(n).padStart(2, "0");

const getDayRange = (dateStr) => {
    const [yr, mo, dy] = dateStr.split("-").map(Number);
    const start = new Date(yr, mo - 1, dy, 0, 0, 0, 0);
    const end = new Date(yr, mo - 1, dy, 23, 59, 59, 999);
    return { start, end, dayOfWeek: start.getDay() };
};

// GET /api/nurse-dashboard/stats
nurseDashboardController.getStats = async (req, res) => {
    try {
        const now = new Date();
        const today = new Date(now); today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

        const currentTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
        const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
        const oneHourLaterTime = `${pad(oneHourLater.getHours())}:${pad(oneHourLater.getMinutes())}`;
        const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);

        // Últimos 7 días, para los sparklines de las StatCard (mismo
        // patrón que dashboardController.js, doctorDashboardController.js
        // y receptionistDashboardController.js).
        const days = Array.from({ length: 7 }, (_, i) => {
            const dayStart = new Date(today); dayStart.setDate(dayStart.getDate() - (6 - i));
            const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);
            return { dayStart, dayEnd };
        });

        // Las citas de pacientes o doctores inactivos no cuentan en la agenda
        // ni en los recortes operativos del dashboard.
        const activePartiesFilter = await buildActivePartiesAppointmentFilter();

        const [
            todayAppointments,
            activeDoctors,
            completedTodayAppts,
            completedYesterdayCount,
            apptSparkline,
            attendedSparkline,
        ] = await Promise.all([
            // "pending_payment" (anticipo en línea sin confirmar aún) nunca es una cita
            // real: se excluye para que ni el conteo ni el desglose de "citas de hoy"
            // la cuenten como si ya estuviera agendada.
            appointmentsModel.find({ ...activePartiesFilter, date: { $gte: today, $lt: tomorrow }, status: { $ne: "pending_payment" } })
                .populate("doctor_id", "name last_name")
                .populate("patient_id", "name last_name createdAt")
                .sort({ start_time: 1 })
                .lean(),
            doctorsModel.find({ is_active: true }, "_id").lean(),
            appointmentsModel.find({ ...activePartiesFilter, date: { $gte: today, $lt: tomorrow }, status: COMPLETED })
                .populate("patient_id", "name last_name createdAt")
                .lean(),
            appointmentsModel.countDocuments({ date: { $gte: yesterday, $lt: today }, status: COMPLETED }),
            Promise.all(days.map(({ dayStart, dayEnd }) =>
                appointmentsModel.countDocuments({ date: { $gte: dayStart, $lt: dayEnd } })
            )),
            Promise.all(days.map(({ dayStart, dayEnd }) =>
                appointmentsModel.distinct("patient_id", { date: { $gte: dayStart, $lt: dayEnd }, status: COMPLETED })
            )),
        ]);

        // Citas de hoy: total + desglose pendiente/confirmada
        const pendingCount = todayAppointments.filter((a) => a.status === PENDING).length;
        const confirmedCount = todayAppointments.filter((a) => a.status === CONFIRMED).length;

        // Pacientes atendidos hoy: pacientes distintos con cita completada hoy, nuevos vs recurrentes
        // ("nuevo" = su cuenta de paciente se creó el mismo día de hoy)
        const attendedPatientIds = new Map();
        completedTodayAppts.forEach((a) => {
            if (a.patient_id?._id) attendedPatientIds.set(a.patient_id._id.toString(), a.patient_id);
        });
        let newPatients = 0;
        attendedPatientIds.forEach((p) => {
            if (p.createdAt && new Date(p.createdAt) >= today) newPatients += 1;
        });

        // Doctores disponibles: activos y sin una cita en curso justo ahora (pendiente o confirmada
        // que ya empezó y todavía no termina)
        const inConsultationDoctorIds = new Set(
            todayAppointments
                .filter((a) => (a.status === CONFIRMED || a.status === PENDING) && a.start_time <= currentTime && a.end_time > currentTime)
                .filter((a) => a.doctor_id)
                .map((a) => a.doctor_id._id.toString())
        );
        const availableDoctors = activeDoctors.filter((d) => !inConsultationDoctorIds.has(d._id.toString())).length;

        // Citas próximas (dentro de la próxima hora) + detalle de la siguiente
        const upcoming = todayAppointments.filter((a) =>
            (a.status === CONFIRMED || a.status === PENDING) &&
            a.start_time >= currentTime && a.start_time <= oneHourLaterTime
        );
        const nextAppointment = upcoming[0]
            ? {
                start_time: upcoming[0].start_time,
                end_time: upcoming[0].end_time,
                doctorName: upcoming[0].doctor_id ? `Dr. ${upcoming[0].doctor_id.name} ${upcoming[0].doctor_id.last_name}` : "",
            }
            : null;

        return res.status(200).json({
            appointmentsToday: {
                count: todayAppointments.length, pending: pendingCount, confirmed: confirmedCount,
                sparkline: apptSparkline,
            },
            patientsAttendedToday: {
                count: attendedPatientIds.size, new: newPatients, returning: attendedPatientIds.size - newPatients,
                vsYesterday: attendedPatientIds.size - completedYesterdayCount,
                sparkline: attendedSparkline.map((ids) => ids.length),
            },
            availableDoctors: { count: availableDoctors, total: activeDoctors.length },
            upcomingAppointments: { count: upcoming.length, next: nextAppointment },
        });
    } catch (error) {
        console.error("nurseDashboard.getStats:", error);
        return res.status(500).json({ message: "Error interno del servidor" });
    }
};

// GET /api/nurse-dashboard/doctors-agenda?date=YYYY-MM-DD
// Arma la línea de tiempo del día para cada doctor activo: bloques de
// 30 minutos marcados como ocupados (con la cita), en descanso o
// disponibles, para que la enfermera pueda hacer clic directo en un
// espacio libre y agendar ahí.
nurseDashboardController.getDoctorsAgenda = async (req, res) => {
    try {
        const dateStr = req.query.date || (() => {
            const d = new Date();
            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        })();
        // Duración real del procedimiento elegido en el registro rápido de citas (ver
        // QuickAppointmentForm.jsx → onProcedureInfoChange). 30 min por defecto cuando aún no
        // se ha elegido ninguno, mismo valor que Consulta Médica General.
        const durationMin = Number(req.query.duration) || 30;
        const { start, end, dayOfWeek } = getDayRange(dateStr);

        const [doctors, schedules, appointments] = await Promise.all([
            doctorsModel.find({ is_active: true }, "name last_name img_url specialty").lean(),
            scheduleModel.find({}).lean(),
            appointmentsModel.find({ ...(await buildActivePartiesAppointmentFilter()), date: { $gte: start, $lte: end }, status: { $nin: [CANCELLED, "pending_payment"] } })
                .populate("patient_id", "name last_name")
                .lean(),
        ]);

        const agenda = buildProviderAgenda(doctors, schedules, appointments, dayOfWeek, "doctor_id", durationMin);
        return res.status(200).json({ date: dateStr, doctors: agenda });
    } catch (error) {
        console.error("nurseDashboard.getDoctorsAgenda:", error);
        return res.status(500).json({ message: "Error interno del servidor" });
    }
};

// GET /api/nurse-dashboard/nurses-agenda?date=YYYY-MM-DD
// Igual que getDoctorsAgenda, pero para enfermeras: se usa cuando el procedimiento elegido
// en el registro rápido de citas requiere una enfermera (de apoyo o como proveedora
// principal, ver QuickAppointmentForm.jsx).
nurseDashboardController.getNursesAgenda = async (req, res) => {
    try {
        const dateStr = req.query.date || (() => {
            const d = new Date();
            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        })();
        const durationMin = Number(req.query.duration) || 30;
        const { start, end, dayOfWeek } = getDayRange(dateStr);

        const [nurses, schedules, appointments] = await Promise.all([
            nursesModel.find({ is_active: true }, "name last_name img_url").lean(),
            nurseScheduleModel.find({}).lean(),
            appointmentsModel.find({ ...(await buildActivePartiesAppointmentFilter()), date: { $gte: start, $lte: end }, status: { $nin: [CANCELLED, "pending_payment"] } })
                .populate("patient_id", "name last_name")
                .lean(),
        ]);

        const agenda = buildProviderAgenda(nurses, schedules, appointments, dayOfWeek, "nurse_id", durationMin);
        return res.status(200).json({ date: dateStr, nurses: agenda });
    } catch (error) {
        console.error("nurseDashboard.getNursesAgenda:", error);
        return res.status(500).json({ message: "Error interno del servidor" });
    }
};

// GET /api/nurse-dashboard/upcoming-appointments
nurseDashboardController.getUpcomingAppointments = async (req, res) => {
    try {
        const now = new Date();
        const today = new Date(now); today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
        const currentTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

        const appointments = await appointmentsModel.find({
            ...(await buildActivePartiesAppointmentFilter()),
            date: { $gte: today, $lt: tomorrow },
            status: { $in: [PENDING, CONFIRMED] },
            start_time: { $gte: currentTime },
        })
            .populate("patient_id", "name last_name")
            .populate("doctor_id", "name last_name")
            .sort({ start_time: 1 })
            .limit(10)
            .lean();

        return res.status(200).json(appointments.map((a) => ({
            _id: a._id,
            start_time: a.start_time,
            end_time: a.end_time,
            type: a.type,
            status: a.status,
            patient: a.patient_id,
            doctor: a.doctor_id,
        })));
    } catch (error) {
        console.error("nurseDashboard.getUpcomingAppointments:", error);
        return res.status(500).json({ message: "Error interno del servidor" });
    }
};

// GET /api/nurse-dashboard/pending-confirmations
nurseDashboardController.getPendingConfirmations = async (req, res) => {
    try {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

        const appointments = await appointmentsModel.find({
            ...(await buildActivePartiesAppointmentFilter()),
            date: { $gte: today, $lt: tomorrow },
            status: { $in: [PENDING, CONFIRMED] },
        })
            .populate("patient_id", "name last_name")
            .populate("doctor_id", "name last_name")
            .sort({ start_time: 1 })
            .lean();

        const map = (a) => ({
            _id: a._id,
            start_time: a.start_time,
            end_time: a.end_time,
            type: a.type,
            status: a.status,
            patient: a.patient_id,
            doctor: a.doctor_id,
        });

        const pending = appointments.filter((a) => a.status === PENDING).map(map);
        const confirmed = appointments.filter((a) => a.status === CONFIRMED).map(map);

        return res.status(200).json({
            pending,
            confirmed,
            counts: { pending: pending.length, confirmed: confirmed.length },
        });
    } catch (error) {
        console.error("nurseDashboard.getPendingConfirmations:", error);
        return res.status(500).json({ message: "Error interno del servidor" });
    }
};

export default nurseDashboardController;
