import appointmentsModel from "../../models/appointments/appointments.js";
import doctorsModel from "../../models/doctors/doctors.js";
import patientsModel from "../../models/patients/patients.js";
import receptionistModel from "../../models/receptionist/receptionist.js";
import consultationModel from "../../models/consultations/consultation.js";

const dashboardController = {};

// GET /api/dashboard/stats
dashboardController.getStats = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const firstDayThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        lastDayLastMonth.setHours(23, 59, 59, 999);

        // Ingreso real = anticipos efectivamente cobrados y confirmados vía Wompi desde el
        // portal público del paciente (wompi_transaction_id solo queda así tras una confirmación
        // aprobada — ver confirmAppointmentPayment). No se incluyen pagos en recepción (no dejan
        // rastro digital de cobro) ni intentos de pago que quedaron en "pending" sin confirmarse.
        const paidOnlineMatch = { wompi_transaction_id: { $exists: true, $ne: null }, status: { $ne: "pending" } };

        const [
            revenueAgg,
            lastMonthRevenueAgg,
            thisMonthRevenueAgg,
            activeDoctors,
            appointmentsToday,
            appointmentsYesterday,
            totalPatients,
            lastMonthPatients,
        ] = await Promise.all([
            appointmentsModel.aggregate([
                { $match: paidOnlineMatch },
                { $group: { _id: null, total: { $sum: "$deposit_amount" } } },
            ]),
            appointmentsModel.aggregate([
                { $match: { ...paidOnlineMatch, date: { $gte: firstDayLastMonth, $lte: lastDayLastMonth } } },
                { $group: { _id: null, total: { $sum: "$deposit_amount" } } },
            ]),
            appointmentsModel.aggregate([
                { $match: { ...paidOnlineMatch, date: { $gte: firstDayThisMonth } } },
                { $group: { _id: null, total: { $sum: "$deposit_amount" } } },
            ]),
            doctorsModel.countDocuments({ is_active: true }),
            appointmentsModel.countDocuments({ date: { $gte: today, $lt: tomorrow } }),
            appointmentsModel.countDocuments({ date: { $gte: yesterday, $lt: today } }),
            patientsModel.countDocuments(),
            patientsModel.countDocuments({ createdAt: { $lt: firstDayThisMonth } }),
        ]);

        const totalRevenue = revenueAgg[0]?.total || 0;
        const lastMonthRevenue = lastMonthRevenueAgg[0]?.total || 0;
        const thisMonthRevenue = thisMonthRevenueAgg[0]?.total || 0;
        const revenueGrowth = lastMonthRevenue > 0
            ? (((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100).toFixed(1)
            : 0;
        const patientGrowth = lastMonthPatients > 0
            ? (((totalPatients - lastMonthPatients) / lastMonthPatients) * 100).toFixed(1)
            : 0;

        // Sparklines: last 7 days per metric
        const days = Array.from({ length: 7 }, (_, i) => {
            const dayStart = new Date(today);
            dayStart.setDate(dayStart.getDate() - (6 - i));
            const dayEnd = new Date(dayStart);
            dayEnd.setDate(dayEnd.getDate() + 1);
            return { dayStart, dayEnd };
        });

        const [apptSparkline, patientSparkline] = await Promise.all([
            Promise.all(days.map(({ dayStart, dayEnd }) =>
                appointmentsModel.countDocuments({ date: { $gte: dayStart, $lt: dayEnd } })
            )),
            Promise.all(days.map(({ dayStart, dayEnd }) =>
                patientsModel.countDocuments({ createdAt: { $gte: dayStart, $lt: dayEnd } })
            )),
        ]);

        res.status(200).json({
            revenue:           { total: totalRevenue,     growth: Number(revenueGrowth),  sparkline: apptSparkline },
            activeDoctors:     { count: activeDoctors,    vsYesterday: 0,                 sparkline: apptSparkline },
            appointmentsToday: { count: appointmentsToday, vsYesterday: appointmentsToday - appointmentsYesterday, sparkline: apptSparkline },
            totalPatients:     { count: totalPatients,    growth: Number(patientGrowth),  sparkline: patientSparkline },
        });
    } catch (error) {
        console.error("dashboard.getStats:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
};

// GET /api/dashboard/doctor-status
dashboardController.getDoctorStatus = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const now = new Date();
        const pad = (n) => String(n).padStart(2, "0");
        const currentTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
        const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
        const oneHourLaterTime = `${pad(oneHourLater.getHours())}:${pad(oneHourLater.getMinutes())}`;

        const todayAppointments = await appointmentsModel
            .find({ date: { $gte: today, $lt: tomorrow } })
            .populate("doctor_id", "name last_name img_url specialty")
            .populate("patient_id", "name last_name");

        const IN_PROGRESS_STATUSES = ["in-progress", "in_progress", "en-consulta", "attending", "in progress"];
        const SCHEDULED_STATUSES = ["scheduled", "confirmed", "pendiente", "programada", "pending"];

        const inConsultation = todayAppointments.filter((a) =>
            IN_PROGRESS_STATUSES.includes((a.status || "").toLowerCase())
        );
        const upcoming = todayAppointments.filter((a) => {
            if (!SCHEDULED_STATUSES.includes((a.status || "").toLowerCase())) return false;
            return a.start_time >= currentTime && a.start_time <= oneHourLaterTime;
        });

        const allDoctors = await doctorsModel.find({}, "name last_name img_url is_active");
        const inConsultationIds = new Set(inConsultation.filter((a) => a.doctor_id).map((a) => a.doctor_id._id.toString()));
        const upcomingIds = new Set(upcoming.filter((a) => a.doctor_id).map((a) => a.doctor_id._id.toString()));

        const availableCount = allDoctors.filter((d) => d.is_active && !inConsultationIds.has(d._id.toString()) && !upcomingIds.has(d._id.toString())).length;
        const unavailableCount = allDoctors.filter((d) => !d.is_active).length;

        const mapAppt = (a) => ({
            _id: a._id,
            doctor: a.doctor_id,
            patient: a.patient_id,
            start_time: a.start_time,
            end_time: a.end_time,
            type: a.type,
            status: a.status,
        });

        // Agenda completa del día (todas las citas de hoy, en orden cronológico) — para el
        // panel "Agenda del día" del dashboard de admin, más completo que los recortes de
        // "en consulta ahora" / "próxima hora" de arriba.
        const schedule = [...todayAppointments]
            .sort((a, b) => (a.start_time || "").localeCompare(b.start_time || ""))
            .map(mapAppt);

        res.status(200).json({
            counts: {
                inConsultation: inConsultation.length,
                upcoming: upcoming.length,
                available: availableCount,
                unavailable: unavailableCount,
            },
            inConsultation: inConsultation.map(mapAppt),
            upcoming: upcoming.map(mapAppt),
            schedule,
        });
    } catch (error) {
        console.error("dashboard.getDoctorStatus:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
};

// GET /api/dashboard/user-stats
dashboardController.getUserStats = async (req, res) => {
    try {
        const [
            totalPatients, activePatients,
            totalDoctors, activeDoctors, pendingDoctors,
            totalReceptionists, activeReceptionists,
            recentDoctors, recentReceptionists, recentPatients,
        ] = await Promise.all([
            patientsModel.countDocuments(),
            patientsModel.countDocuments({ is_active: true }),
            doctorsModel.countDocuments(),
            doctorsModel.countDocuments({ is_active: true }),
            doctorsModel.countDocuments({ is_verified: false }),
            receptionistModel.countDocuments(),
            receptionistModel.countDocuments({ is_active: true }),
            doctorsModel.find({}, "name last_name img_url createdAt specialty").sort({ createdAt: -1 }).limit(3),
            receptionistModel.find({}, "name last_name img_url createdAt").sort({ createdAt: -1 }).limit(2),
            patientsModel.find({}, "name last_name createdAt").sort({ createdAt: -1 }).limit(2),
        ]);

        const recentUsers = [
            ...recentDoctors.map((d) => ({ ...d.toObject(), role: "Doctor" })),
            ...recentReceptionists.map((r) => ({ ...r.toObject(), role: "Recepcionista" })),
            ...recentPatients.map((p) => ({ ...p.toObject(), role: "Paciente" })),
        ]
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 5);

        res.status(200).json({
            patients: { total: totalPatients, active: activePatients, inactive: totalPatients - activePatients },
            doctors: { total: totalDoctors, active: activeDoctors, pending: pendingDoctors },
            receptionists: { total: totalReceptionists, active: activeReceptionists, inactive: totalReceptionists - activeReceptionists },
            recentUsers,
        });
    } catch (error) {
        console.error("dashboard.getUserStats:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
};

// GET /api/dashboard/report-stats
dashboardController.getReportStats = async (req, res) => {
    try {
        const now = new Date();
        const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        lastDayLastMonth.setHours(23, 59, 59, 999);

        // Last 6 months data
        const monthlyPromises = Array.from({ length: 6 }, (_, i) => {
            const monthStart = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() - (5 - i) + 1, 0);
            monthEnd.setHours(23, 59, 59, 999);
            return Promise.all([
                appointmentsModel.countDocuments({ date: { $gte: monthStart, $lte: monthEnd } }),
                patientsModel.countDocuments({ createdAt: { $gte: monthStart, $lte: monthEnd } }),
                consultationModel.countDocuments({ createdAt: { $gte: monthStart, $lte: monthEnd } }),
            ]);
        });

        const [monthlyData, apptThisMonth, apptLastMonth, patientsThisMonth, patientsLastMonth, consultThisMonth, consultLastMonth, totalAppts] = await Promise.all([
            Promise.all(monthlyPromises),
            appointmentsModel.countDocuments({ date: { $gte: firstDayThisMonth } }),
            appointmentsModel.countDocuments({ date: { $gte: firstDayLastMonth, $lte: lastDayLastMonth } }),
            patientsModel.countDocuments({ createdAt: { $gte: firstDayThisMonth } }),
            patientsModel.countDocuments({ createdAt: { $gte: firstDayLastMonth, $lte: lastDayLastMonth } }),
            consultationModel.countDocuments({ createdAt: { $gte: firstDayThisMonth } }),
            consultationModel.countDocuments({ createdAt: { $gte: firstDayLastMonth, $lte: lastDayLastMonth } }),
            appointmentsModel.countDocuments(),
        ]);

        const growth = (current, prev) =>
            prev > 0 ? Number((((current - prev) / prev) * 100).toFixed(1)) : 0;

        res.status(200).json({
            appointments: {
                total: totalAppts,
                thisMonth: apptThisMonth,
                growth: growth(apptThisMonth, apptLastMonth),
                monthlyData: monthlyData.map((m) => m[0]),
            },
            patients: {
                thisMonth: patientsThisMonth,
                growth: growth(patientsThisMonth, patientsLastMonth),
                monthlyData: monthlyData.map((m) => m[1]),
            },
            consultations: {
                thisMonth: consultThisMonth,
                growth: growth(consultThisMonth, consultLastMonth),
                monthlyData: monthlyData.map((m) => m[2]),
            },
        });
    } catch (error) {
        console.error("dashboard.getReportStats:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
};

export default dashboardController;
