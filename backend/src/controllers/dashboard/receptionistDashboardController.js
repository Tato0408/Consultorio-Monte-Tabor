import appointmentsModel from "../../models/appointments/appointments.js";
import doctorsModel from "../../models/doctors/doctors.js";
import patientsModel from "../../models/patients/patients.js";
import scheduleModel from "../../models/schedule/schedule.js";

const receptionistDashboardController = {};

// Mismo enum que valida appointmentsController.insertAppointment — "confirmada" en la UI
// corresponde a "scheduled" en la base de datos.
const PENDING = "pending";
const CONFIRMED = "scheduled";
const COMPLETED = "completed";
const CANCELLED = "cancelled";

const pad = (n) => String(n).padStart(2, "0");
const timeToMins = (t) => {
    const [h, m] = (t || "0:0").split(":").map(Number);
    return h * 60 + m;
};

const getDayRange = (dateStr) => {
    const [yr, mo, dy] = dateStr.split("-").map(Number);
    const start = new Date(yr, mo - 1, dy, 0, 0, 0, 0);
    const end = new Date(yr, mo - 1, dy, 23, 59, 59, 999);
    return { start, end, dayOfWeek: start.getDay() };
};

// GET /api/receptionist-dashboard/stats
receptionistDashboardController.getStats = async (req, res) => {
    try {
        const now = new Date();
        const today = new Date(now); today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
        const firstDayThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        const currentTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
        const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
        const oneHourLaterTime = `${pad(oneHourLater.getHours())}:${pad(oneHourLater.getMinutes())}`;
        const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);

        // Últimos 7 días, para los sparklines de las StatCard (mismo patrón que
        // dashboardController.js / doctorDashboardController.js)
        const days = Array.from({ length: 7 }, (_, i) => {
            const dayStart = new Date(today); dayStart.setDate(dayStart.getDate() - (6 - i));
            const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);
            return { dayStart, dayEnd };
        });

        const [
            todayAppointments,
            activeDoctors,
            completedTodayAppts,
            completedYesterdayCount,
            apptSparkline,
            attendedSparkline,
        ] = await Promise.all([
            appointmentsModel.find({ date: { $gte: today, $lt: tomorrow } })
                .populate("doctor_id", "name last_name")
                .populate("patient_id", "name last_name createdAt")
                .sort({ start_time: 1 })
                .lean(),
            doctorsModel.find({ is_active: true }, "_id").lean(),
            appointmentsModel.find({ date: { $gte: today, $lt: tomorrow }, status: COMPLETED })
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
        console.error("receptionistDashboard.getStats:", error);
        return res.status(500).json({ message: "Error interno del servidor" });
    }
};

// GET /api/receptionist-dashboard/doctors-agenda?date=YYYY-MM-DD
// Arma la línea de tiempo del día para cada doctor activo: bloques de 30 min marcados como
// ocupados (con la cita), en descanso, o disponibles — para que el recepcionista pueda dar
// clic directo en un espacio libre y agendar ahí.
receptionistDashboardController.getDoctorsAgenda = async (req, res) => {
    try {
        const dateStr = req.query.date || (() => {
            const d = new Date();
            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        })();
        const { start, end, dayOfWeek } = getDayRange(dateStr);

        const [doctors, schedules, appointments] = await Promise.all([
            doctorsModel.find({ is_active: true }, "name last_name img_url specialty").lean(),
            scheduleModel.find({}).lean(),
            appointmentsModel.find({ date: { $gte: start, $lte: end }, status: { $ne: CANCELLED } })
                .populate("patient_id", "name last_name")
                .lean(),
        ]);

        const scheduleByDoctor = new Map(schedules.map((s) => [s.doctor_id.toString(), s]));
        const apptsByDoctor = new Map();
        appointments.forEach((a) => {
            if (!a.doctor_id) return;
            const key = a.doctor_id.toString();
            if (!apptsByDoctor.has(key)) apptsByDoctor.set(key, []);
            apptsByDoctor.get(key).push(a);
        });

        const SLOT_MIN = 30;

        const agenda = doctors.map((doctor) => {
            const schedule = scheduleByDoctor.get(doctor._id.toString());
            const dayConfig = schedule?.weekly_availability?.find((d) => d.day === dayOfWeek);
            const doctorAppts = apptsByDoctor.get(doctor._id.toString()) || [];

            const slots = [];
            if (dayConfig?.is_available && dayConfig.time_blocks?.length) {
                for (const block of dayConfig.time_blocks) {
                    let current = timeToMins(block.start_time);
                    const blockEnd = timeToMins(block.end_time);

                    while (current + SLOT_MIN <= blockEnd) {
                        const slotEnd = current + SLOT_MIN;
                        const hh = pad(Math.floor(current / 60));
                        const mm = pad(current % 60);
                        const hhe = pad(Math.floor(slotEnd / 60));
                        const mme = pad(slotEnd % 60);
                        const startStr = `${hh}:${mm}`;
                        const endStr = `${hhe}:${mme}`;

                        const onBreak = (schedule.breaks || []).some((br) => {
                            if (br.day !== dayOfWeek) return false;
                            return current < timeToMins(br.end_time) && slotEnd > timeToMins(br.start_time);
                        });

                        const matchingAppt = doctorAppts.find((a) =>
                            current < timeToMins(a.end_time) && slotEnd > timeToMins(a.start_time)
                        );

                        if (matchingAppt) {
                            slots.push({
                                start_time: startStr,
                                end_time: endStr,
                                status: matchingAppt.status,
                                appointment: {
                                    _id: matchingAppt._id,
                                    patientName: matchingAppt.patient_id ? `${matchingAppt.patient_id.name} ${matchingAppt.patient_id.last_name}` : "Paciente",
                                    type: matchingAppt.type,
                                },
                            });
                        } else if (onBreak) {
                            slots.push({ start_time: startStr, end_time: endStr, status: "break", appointment: null });
                        } else {
                            slots.push({ start_time: startStr, end_time: endStr, status: "available", appointment: null });
                        }

                        current += SLOT_MIN;
                    }
                }
            }

            return {
                _id: doctor._id,
                name: doctor.name,
                last_name: doctor.last_name,
                img_url: doctor.img_url,
                specialty: doctor.specialty || "",
                hasSchedule: !!dayConfig?.is_available,
                slots,
            };
        });

        return res.status(200).json({ date: dateStr, doctors: agenda });
    } catch (error) {
        console.error("receptionistDashboard.getDoctorsAgenda:", error);
        return res.status(500).json({ message: "Error interno del servidor" });
    }
};

// GET /api/receptionist-dashboard/upcoming-appointments
receptionistDashboardController.getUpcomingAppointments = async (req, res) => {
    try {
        const now = new Date();
        const today = new Date(now); today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
        const currentTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

        const appointments = await appointmentsModel.find({
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
        console.error("receptionistDashboard.getUpcomingAppointments:", error);
        return res.status(500).json({ message: "Error interno del servidor" });
    }
};

// GET /api/receptionist-dashboard/pending-confirmations
receptionistDashboardController.getPendingConfirmations = async (req, res) => {
    try {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

        const appointments = await appointmentsModel.find({
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
        console.error("receptionistDashboard.getPendingConfirmations:", error);
        return res.status(500).json({ message: "Error interno del servidor" });
    }
};

export default receptionistDashboardController;
