import mongoose from "mongoose";
import appointmentsModel from "../../models/appointments/appointments.js";
import consultationModel from "../../models/consultations/consultation.js";
import { getInactivePatientIds } from "../../utils/activeScope.js";

const doctorDashboardController = {};

// GET /api/doctor-dashboard/stats
// Calcula las estadísticas del doctor autenticado: procedimiento más
// recurrente entre sus consultas, total de pacientes con su crecimiento
// mensual, citas de hoy comparadas con ayer y pacientes nuevos del mes,
// junto con series de los últimos 7 días para los gráficos.
doctorDashboardController.getStats = async (req, res) => {
    try {
        const doctorId = new mongoose.Types.ObjectId(req.user.id);
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
        const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
        const firstDayThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        lastDayLastMonth.setHours(23, 59, 59, 999);

        const doctorAppointments = await appointmentsModel.find({ doctor_id: doctorId }, "_id").lean();
        const doctorApptIds = doctorAppointments.map((a) => a._id);

        const days = Array.from({ length: 7 }, (_, i) => {
            const dayStart = new Date(today); dayStart.setDate(dayStart.getDate() - (6 - i));
            const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);
            return { dayStart, dayEnd };
        });

        const [
            topProcedureAgg, totalPatientIds, newPatientsThisMonthIds, newPatientsLastMonthIds,
            appointmentsToday, appointmentsYesterday, apptSparklineRaw, patientSparklineRaw,
        ] = await Promise.all([
            // Procedimiento más recurrente entre las consultas de este doctor. El modelo
            // de procedimientos se registra como model("procedure", ...) (backend/src/
            // models/procedures/procedures.js), que Mongoose colecciona como
            // "procedures". Se usa el nombre de colección directo en $lookup en vez de
            // population normal porque el "ref" declarado en consultation.js
            // ("Procedures") no coincide con ese nombre de modelo registrado, y el
            // populate fallaría en silencio.
            consultationModel.aggregate([
                { $match: { appointment_id: { $in: doctorApptIds } } },
                { $unwind: "$procedure" },
                { $match: { "procedure.procedure_id": { $exists: true, $ne: null } } },
                { $group: { _id: "$procedure.procedure_id", count: { $sum: 1 } } },
                { $sort: { count: -1 } }, { $limit: 1 },
                { $lookup: { from: "procedures", localField: "_id", foreignField: "_id", as: "procDoc" } },
                { $unwind: { path: "$procDoc", preserveNullAndEmptyArrays: true } },
                { $project: { _id: 0, name: "$procDoc.name", count: 1 } },
            ]),
            appointmentsModel.distinct("patient_id", { doctor_id: doctorId }),
            appointmentsModel.distinct("patient_id", { doctor_id: doctorId, date: { $gte: firstDayThisMonth } }),
            appointmentsModel.distinct("patient_id", { doctor_id: doctorId, date: { $gte: firstDayLastMonth, $lte: lastDayLastMonth } }),
            appointmentsModel.countDocuments({ doctor_id: doctorId, date: { $gte: today, $lt: tomorrow } }),
            appointmentsModel.countDocuments({ doctor_id: doctorId, date: { $gte: yesterday, $lt: today } }),
            Promise.all(days.map(({ dayStart, dayEnd }) =>
                appointmentsModel.countDocuments({ doctor_id: doctorId, date: { $gte: dayStart, $lt: dayEnd } })
            )),
            Promise.all(days.map(({ dayStart, dayEnd }) =>
                appointmentsModel.distinct("patient_id", { doctor_id: doctorId, date: { $gte: dayStart, $lt: dayEnd } })
            )),
        ]);

        const newThis = newPatientsThisMonthIds.length;
        const newLast = newPatientsLastMonthIds.length;
        const patientGrowth = newLast > 0 ? Number((((newThis - newLast) / newLast) * 100).toFixed(1)) : 0;
        const topProcedure = topProcedureAgg.length > 0 && topProcedureAgg[0].name
            ? { name: topProcedureAgg[0].name, count: topProcedureAgg[0].count }
            : null;

        res.status(200).json({
            topProcedure,
            totalPatients: { count: totalPatientIds.length, growth: patientGrowth, sparkline: patientSparklineRaw.map((ids) => ids.length) },
            appointmentsToday: { count: appointmentsToday, vsYesterday: appointmentsToday - appointmentsYesterday, sparkline: apptSparklineRaw },
            newPatients: { count: newThis, vsLastMonth: newThis - newLast, sparkline: patientSparklineRaw.map((ids) => ids.length) },
        });
    } catch (error) {
        console.error("doctorDashboard.getStats:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
};

// GET /api/doctor-dashboard/calendar?year=YYYY
// Devuelve las fechas únicas del año indicado (o el actual por defecto)
// en las que el doctor autenticado tiene al menos una cita.
doctorDashboardController.getCalendar = async (req, res) => {
    try {
        const doctorId = new mongoose.Types.ObjectId(req.user.id);
        const year = parseInt(req.query.year) || new Date().getFullYear();
        const startOfYear = new Date(year, 0, 1);
        const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999);
        const appointments = await appointmentsModel.find({ doctor_id: doctorId, date: { $gte: startOfYear, $lte: endOfYear } }, "date").lean();
        const uniqueDates = [...new Set(appointments.map((a) => {
            const d = new Date(a.date);
            return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
        }))];
        res.status(200).json({ dates: uniqueDates });
    } catch (error) {
        console.error("doctorDashboard.getCalendar:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
};

// GET /api/doctor-dashboard/today-appointments
// Devuelve las citas del día del doctor autenticado, ordenadas por
// hora de inicio, con los datos básicos del paciente.
doctorDashboardController.getTodayAppointments = async (req, res) => {
    try {
        const doctorId = new mongoose.Types.ObjectId(req.user.id);
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
        // Las citas de pacientes inactivos no aparecen en la agenda del doctor.
        const inactivePatientIds = await getInactivePatientIds();
        const appointments = await appointmentsModel
            .find({
                doctor_id: doctorId,
                date: { $gte: today, $lt: tomorrow },
                ...(inactivePatientIds.length ? { patient_id: { $nin: inactivePatientIds } } : {}),
            })
            .populate("patient_id", "name last_name img_url")
            .sort({ start_time: 1 }).lean();
        res.status(200).json(appointments.map((a) => ({
            _id: a._id, patient: a.patient_id, start_time: a.start_time, end_time: a.end_time, type: a.type, status: a.status,
        })));
    } catch (error) {
        console.error("doctorDashboard.getTodayAppointments:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
};

// GET /api/doctor-dashboard/consultations-records
// Devuelve las 5 consultas más recientes del doctor con su diagnóstico
// y los últimos 5 pacientes distintos atendidos, a partir de sus
// últimas 20 citas.
doctorDashboardController.getConsultationsAndRecords = async (req, res) => {
    try {
        const doctorId = new mongoose.Types.ObjectId(req.user.id);
        // Consultas recientes y expedientes: se omiten los pacientes inactivos.
        const inactivePatientIds = await getInactivePatientIds();
        const last20 = await appointmentsModel
            .find({
                doctor_id: doctorId,
                ...(inactivePatientIds.length ? { patient_id: { $nin: inactivePatientIds } } : {}),
            })
            .populate("patient_id", "name last_name img_url")
            .sort({ date: -1 }).limit(20).lean();

        const last5Ids = last20.slice(0, 5).map((a) => a._id);
        const consultations = await consultationModel.find({ appointment_id: { $in: last5Ids } }).lean();
        const consultMap = {};
        consultations.forEach((c) => { consultMap[c.appointment_id.toString()] = c; });

        const recentConsultations = last20.slice(0, 5).map((appt) => {
            const c = consultMap[appt._id.toString()];
            return { _id: appt._id, patient: appt.patient_id, date: appt.date, type: appt.type, status: appt.status, diagnosis: c?.clinical_data?.diagnosis || null };
        });

        // Recorre las citas más recientes y arma la lista de los
        // últimos 5 pacientes distintos, descartando duplicados.
        const seen = new Set();
        const records = [];
        for (const appt of last20) {
            if (!appt.patient_id) continue;
            const pid = appt.patient_id._id.toString();
            if (seen.has(pid)) continue;
            seen.add(pid);
            records.push({ _id: appt.patient_id._id, patient: appt.patient_id, lastVisit: appt.date, appointmentId: appt._id });
            if (records.length === 5) break;
        }
        res.status(200).json({ recentConsultations, records });
    } catch (error) {
        console.error("doctorDashboard.getConsultationsAndRecords:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
};

// GET /api/doctor-dashboard/analytics
// Calcula, para el doctor autenticado, las 5 enfermedades y los 6
// diagnósticos CIE más frecuentes con su porcentaje, además de un
// resumen del mes (consultas, pacientes activos, procedimientos).
doctorDashboardController.getAnalytics = async (req, res) => {
    try {
        const doctorId = new mongoose.Types.ObjectId(req.user.id);
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const firstDayThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const doctorApptIds = (await appointmentsModel.find({ doctor_id: doctorId }, "_id").lean()).map((a) => a._id);

        const [diseaseAgg, treatmentAgg, consultationsThisMonth, activePatientIds, proceduresThisMonth] = await Promise.all([
            consultationModel.aggregate([
                { $match: { appointment_id: { $in: doctorApptIds }, "clinical_data.diagnosis": { $exists: true, $ne: null, $nin: [""] } } },
                { $group: { _id: "$clinical_data.diagnosis", count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 5 },
            ]),
            consultationModel.aggregate([
                { $match: { appointment_id: { $in: doctorApptIds }, "clinical_data.icd_diagnosis": { $exists: true, $ne: null, $nin: [""] } } },
                { $group: { _id: "$clinical_data.icd_diagnosis", count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 6 },
            ]),
            consultationModel.countDocuments({ appointment_id: { $in: doctorApptIds }, createdAt: { $gte: firstDayThisMonth } }),
            appointmentsModel.distinct("patient_id", { doctor_id: doctorId }),
            consultationModel.countDocuments({ appointment_id: { $in: doctorApptIds }, createdAt: { $gte: firstDayThisMonth }, "procedure.0": { $exists: true } }),
        ]);

        const totalD = diseaseAgg.reduce((s, d) => s + d.count, 0);
        const totalT = treatmentAgg.reduce((s, t) => s + t.count, 0);
        res.status(200).json({
            diseases: diseaseAgg.map((d) => ({ name: d._id, count: d.count, pct: totalD > 0 ? Number(((d.count / totalD) * 100).toFixed(1)) : 0 })),
            totalForDiseases: totalD,
            treatments: treatmentAgg.map((t) => ({ name: t._id, count: t.count, pct: totalT > 0 ? Number(((t.count / totalT) * 100).toFixed(1)) : 0 })),
            summary: { consultationsThisMonth, activePatients: activePatientIds.length, proceduresThisMonth, totalConsultations: doctorApptIds.length },
        });
    } catch (error) {
        console.error("doctorDashboard.getAnalytics:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
};

export default doctorDashboardController;
