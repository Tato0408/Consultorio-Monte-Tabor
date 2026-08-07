import appointmentsModel from "../../models/appointments/appointments.js";
import patientsModel from "../../models/patients/patients.js";
import doctorsModel from "../../models/doctors/doctors.js";
import inventoryModel from "../../models/inventory/inventory.js";
import movementsModel from "../../models/inventory/movements.js";
import prescriptionModel from "../../models/consultations/prescription.js";
import {
    resolveRange,
    dateFilter,
    growthPct,
    formatVariation,
    buildRow,
    pctOf,
    formatCurrency,
    buildTimeSeries,
    formatPeriodLabel,
    rangeMeta,
} from "../../utils/reportDateRange.js";

const reportsController = {};

// Las citas solo tienen 2 valores reales de "type" (ver AppointmentsForm.jsx) — no existe un
// campo de especialidad médica en el sistema, así que estos 2 tipos son la agrupación de
// "servicio" más fiel a los datos reales disponibles.
const TYPE_GENERAL = "Consulta Médica General";
const TYPE_PROCEDURE = "Procedimiento";

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/reports/appointments?dateFrom=&dateTo=&general=true
// ─────────────────────────────────────────────────────────────────────────────
reportsController.getAppointmentsReport = async (req, res) => {
    try {
        const range = resolveRange(req.query);
        const { isGeneral, start, end, prevStart, prevEnd } = range;

        const curFilter = dateFilter("date", start, end);
        const prevFilter = isGeneral ? {} : dateFilter("date", prevStart, prevEnd);
        const countCur = (extra = {}) => appointmentsModel.countDocuments({ ...curFilter, ...extra });
        const countPrev = (extra = {}) =>
            isGeneral ? Promise.resolve(0) : appointmentsModel.countDocuments({ ...prevFilter, ...extra });
        const sumTotal = (filter) =>
            appointmentsModel
                .aggregate([{ $match: filter }, { $group: { _id: null, total: { $sum: "$total" } } }])
                .then((r) => r[0]?.total || 0);

        const [
            totalCur, totalPrev,
            completedCur, completedPrev,
            cancelledCur, cancelledPrev,
            noShowCur, noShowPrev,
            pendingCur, pendingPrev,
            generalCur, generalPrev,
            procedureCur, procedurePrev,
            generalCompletedCur, generalCompletedPrev,
            procedureCompletedCur, procedureCompletedPrev,
            revenueCur, revenuePrev,
            revenueGeneralCur, revenueGeneralPrev,
            revenueProcedureCur, revenueProcedurePrev,
            doctorsCur, doctorsPrev,
            avgDurationAgg, avgDurationPrevAgg,
            dailySeries, completedSeries,
            topPatientsAgg,
        ] = await Promise.all([
            countCur(), countPrev(),
            countCur({ status: "completed" }), countPrev({ status: "completed" }),
            countCur({ status: "cancelled" }), countPrev({ status: "cancelled" }),
            countCur({ status: "no_show" }), countPrev({ status: "no_show" }),
            countCur({ status: "pending" }), countPrev({ status: "pending" }),
            countCur({ type: TYPE_GENERAL }), countPrev({ type: TYPE_GENERAL }),
            countCur({ type: TYPE_PROCEDURE }), countPrev({ type: TYPE_PROCEDURE }),
            // Conteos SOLO de citas completadas por tipo — para el gráfico/tabla del PDF, que
            // muestra "visitas reales" junto a los ingresos (también completadas-only). La
            // sección en pantalla "Tipo de atención" sigue usando el conteo de todas las citas
            // (generalCur/procedureCur arriba), porque ahí el foco es volumen de reservas.
            countCur({ type: TYPE_GENERAL, status: "completed" }), countPrev({ type: TYPE_GENERAL, status: "completed" }),
            countCur({ type: TYPE_PROCEDURE, status: "completed" }), countPrev({ type: TYPE_PROCEDURE, status: "completed" }),
            // Los ingresos solo cuentan citas COMPLETADAS — una cancelada o no-show no generó
            // ingreso real aunque tenga un "total" (precio) guardado desde que se agendó.
            sumTotal({ ...curFilter, status: "completed" }), isGeneral ? Promise.resolve(0) : sumTotal({ ...prevFilter, status: "completed" }),
            sumTotal({ ...curFilter, status: "completed", type: TYPE_GENERAL }), isGeneral ? Promise.resolve(0) : sumTotal({ ...prevFilter, status: "completed", type: TYPE_GENERAL }),
            sumTotal({ ...curFilter, status: "completed", type: TYPE_PROCEDURE }), isGeneral ? Promise.resolve(0) : sumTotal({ ...prevFilter, status: "completed", type: TYPE_PROCEDURE }),
            appointmentsModel.distinct("doctor_id", curFilter),
            isGeneral ? Promise.resolve([]) : appointmentsModel.distinct("doctor_id", prevFilter),
            appointmentsModel.aggregate([{ $match: curFilter }, { $group: { _id: null, avg: { $avg: "$duration_minutes" } } }]),
            isGeneral ? Promise.resolve([]) : appointmentsModel.aggregate([{ $match: prevFilter }, { $group: { _id: null, avg: { $avg: "$duration_minutes" } } }]),
            buildTimeSeries(appointmentsModel, "date", {}, range),
            buildTimeSeries(appointmentsModel, "date", { status: "completed" }, range),
            appointmentsModel.aggregate([
                { $match: { ...curFilter, status: "completed" } },
                { $group: { _id: "$patient_id", count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 5 },
            ]),
        ]);

        const avgDuration = Math.round(avgDurationAgg[0]?.avg || 0);
        const avgDurationPrev = Math.round(avgDurationPrevAgg[0]?.avg || 0);

        const patientIds = topPatientsAgg.map((p) => p._id).filter(Boolean);
        const topPatients = await patientsModel.find({ _id: { $in: patientIds } }, "name last_name").lean();
        const nameById = new Map(topPatients.map((p) => [String(p._id), `${p.name} ${p.last_name}`]));
        const mostAttended = topPatientsAgg.map((p) => nameById.get(String(p._id))).filter(Boolean);

        const statDiff = (cur, prev) =>
            isGeneral ? null : `${formatVariation(growthPct(cur, prev))} comparado con el período anterior`;

        const topCards = [
            {
                key: "programadas",
                title: "Citas programadas",
                stat: String(totalCur),
                statLabel: isGeneral ? "total histórico" : "en el período seleccionado",
                statDiff: statDiff(totalCur, totalPrev),
                chartData: { "Por día": dailySeries },
            },
            {
                key: "atendidos",
                title: "Citas completadas",
                stat: String(completedCur),
                statLabel: isGeneral ? "total histórico" : "completadas en el período",
                statDiff: statDiff(completedCur, completedPrev),
                chartType: "bar",
                chartData: { "Por día": completedSeries },
            },
            {
                key: "mas_atendidos",
                title: "Pacientes más atendidos",
                subtitle: "Basado en el número de citas completadas en el período",
                listItems: mostAttended.length ? mostAttended : ["Sin datos suficientes en este período"],
                linkLabel: "Ver todos los pacientes",
            },
        ];

        const sections = [
            {
                key: "volumen",
                title: "Volumen de citas",
                icon: "calendar",
                rows: [
                    buildRow("Total de citas registradas", totalCur, totalPrev, isGeneral),
                    buildRow("Citas completadas", completedCur, completedPrev, isGeneral),
                ],
            },
            {
                key: "estado",
                title: "Estado de citas",
                icon: "clipboard",
                rows: [
                    buildRow("Citas completadas", completedCur, completedPrev, isGeneral, { label: "Completadas", color: "green" }),
                    buildRow("Citas canceladas", cancelledCur, cancelledPrev, isGeneral, { label: "Canceladas", color: "red" }),
                    buildRow("Citas no atendidas", noShowCur, noShowPrev, isGeneral, { label: "No se presentó", color: "orange" }),
                    buildRow("Citas pendientes de confirmar", pendingCur, pendingPrev, isGeneral),
                ],
            },
            {
                key: "tipo_atencion",
                title: "Tipo de atención",
                icon: "stethoscope",
                rows: [
                    buildRow(TYPE_GENERAL, generalCur, generalPrev, isGeneral),
                    buildRow(TYPE_PROCEDURE, procedureCur, procedurePrev, isGeneral),
                ],
            },
            {
                key: "medicos",
                title: "Médicos y duración de consultas",
                icon: "user",
                rows: [
                    buildRow("Doctores con citas asignadas", doctorsCur.length, doctorsPrev.length, isGeneral),
                    {
                        proceso: "Duración promedio de las citas",
                        actual: `${avgDuration} min`,
                        anterior: isGeneral ? "—" : `${avgDurationPrev} min`,
                        variacion: isGeneral ? "—" : formatVariation(growthPct(avgDuration, avgDurationPrev)),
                    },
                ],
            },
        ];

        // cur/prev aquí son conteos de citas COMPLETADAS por tipo (generalCompletedCur, etc.) —
        // así "Consultas" e "Ingresos" quedan consistentes en la misma fila: ambas reflejan
        // solo visitas que sí se atendieron, no todo lo agendado.
        const serviceRow = (servicio, cur, prev, revCur, revPrev) => ({
            servicio,
            consultas: cur,
            pctConsultas: pctOf(cur, completedCur),
            ingresos: formatCurrency(revCur),
            pctIngresos: pctOf(revCur, revenueCur),
            variacion: isGeneral ? "—" : formatVariation(growthPct(cur, prev)),
        });

        const observations = [];
        if (!isGeneral) {
            const genGrowth = growthPct(generalCur, generalPrev);
            const procGrowth = growthPct(procedureCur, procedurePrev);
            if (genGrowth !== 0) observations.push(`${genGrowth > 0 ? "Incremento" : "Disminución"} de ${Math.abs(genGrowth).toFixed(1)}% en consultas médicas generales respecto al período anterior.`);
            if (procGrowth !== 0) observations.push(`${procGrowth > 0 ? "Incremento" : "Disminución"} de ${Math.abs(procGrowth).toFixed(1)}% en procedimientos respecto al período anterior.`);
            if (cancelledCur > 0) observations.push(`Se registraron ${cancelledCur} citas canceladas en el período.`);
        } else {
            observations.push(`Se registran ${generalCur} consultas médicas generales y ${procedureCur} procedimientos en todo el histórico.`);
        }
        if (observations.length === 0) observations.push("No se registran variaciones significativas en este período.");

        const pdf = {
            reportTitle: "Reporte de Citas",
            periodLabel: formatPeriodLabel(range),
            isGeneral,
            stats: [
                { label: "Total de citas", value: String(totalCur), diff: statDiff(totalCur, totalPrev) },
                { label: "Citas completadas", value: String(completedCur), diff: statDiff(completedCur, completedPrev) },
                { label: "Citas canceladas", value: String(cancelledCur), diff: statDiff(cancelledCur, cancelledPrev) },
                { label: "Ingresos totales", value: formatCurrency(revenueCur), diff: statDiff(revenueCur, revenuePrev) },
            ],
            dailySeries,
            dailySeriesLabel: "Citas por día",
            typeSeries: [
                { label: TYPE_GENERAL, total: generalCompletedCur },
                { label: TYPE_PROCEDURE, total: procedureCompletedCur },
            ],
            typeSeriesLabel: "Citas completadas por tipo de atención",
            serviceTableTitle: "Resumen por servicios",
            serviceColumnLabel: "Servicio",
            serviceCountLabel: "Consultas",
            serviceTable: [
                serviceRow(TYPE_GENERAL, generalCompletedCur, generalCompletedPrev, revenueGeneralCur, revenueGeneralPrev),
                serviceRow(TYPE_PROCEDURE, procedureCompletedCur, procedureCompletedPrev, revenueProcedureCur, revenueProcedurePrev),
            ],
            avgRevenuePerConsult: formatCurrency(completedCur > 0 ? revenueCur / completedCur : 0),
            avgRevenueLabel: "Ingreso promedio por consulta",
            observations,
        };

        res.status(200).json({ topCards, sections, pdf, meta: rangeMeta(range) });
    } catch (error) {
        console.error("reports.getAppointmentsReport:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/reports/patients?dateFrom=&dateTo=&general=true
// ─────────────────────────────────────────────────────────────────────────────
reportsController.getPatientsReport = async (req, res) => {
    try {
        const range = resolveRange(req.query);
        const { isGeneral, start, end, prevStart, prevEnd } = range;

        const curFilter = dateFilter("date", start, end);
        const prevFilter = isGeneral ? {} : dateFilter("date", prevStart, prevEnd);
        const createdCurFilter = dateFilter("createdAt", start, end);
        const createdPrevFilter = isGeneral ? {} : dateFilter("createdAt", prevStart, prevEnd);

        const countAppt = (extra = {}) => appointmentsModel.countDocuments({ ...curFilter, ...extra });
        const countApptPrev = (extra = {}) =>
            isGeneral ? Promise.resolve(0) : appointmentsModel.countDocuments({ ...prevFilter, ...extra });

        const genderBreakdown = (filter) =>
            appointmentsModel.aggregate([
                { $match: { ...filter, status: "completed" } },
                { $group: { _id: "$patient_id" } },
                { $lookup: { from: "patients", localField: "_id", foreignField: "_id", as: "patient" } },
                { $unwind: "$patient" },
                { $group: { _id: "$patient.gender", count: { $sum: 1 } } },
            ]);

        const distinctAttended = (filter, type) =>
            appointmentsModel.distinct("patient_id", { ...filter, status: "completed", ...(type ? { type } : {}) });

        const [
            totalPatientsNow, totalPatientsPrevEnd,
            newPatientsCur, newPatientsPrev,
            completedCur, completedPrev,
            cancelledCur, noShowCur,
            genderCur,
            generalAttendedCur, procedureAttendedCur,
            revenueCur, revenuePrev,
            recurrentCount,
            pathologicalCount,
            attendedSeries,
            medsAgg,
        ] = await Promise.all([
            patientsModel.countDocuments(isGeneral ? {} : { createdAt: { $lte: end } }),
            isGeneral ? Promise.resolve(0) : patientsModel.countDocuments({ createdAt: { $lte: prevEnd } }),
            patientsModel.countDocuments(createdCurFilter),
            isGeneral ? Promise.resolve(0) : patientsModel.countDocuments(createdPrevFilter),
            countAppt({ status: "completed" }), countApptPrev({ status: "completed" }),
            countAppt({ status: "cancelled" }),
            countAppt({ status: "no_show" }),
            genderBreakdown(curFilter),
            distinctAttended(curFilter, TYPE_GENERAL), distinctAttended(curFilter, TYPE_PROCEDURE),
            // Los ingresos solo cuentan citas COMPLETADAS — una cancelada o no-show no generó
            // ingreso real aunque tenga un "total" (precio) guardado desde que se agendó.
            appointmentsModel.aggregate([{ $match: { ...curFilter, status: "completed" } }, { $group: { _id: null, total: { $sum: "$total" } } }]).then((r) => r[0]?.total || 0),
            isGeneral ? Promise.resolve(0) : appointmentsModel.aggregate([{ $match: { ...prevFilter, status: "completed" } }, { $group: { _id: null, total: { $sum: "$total" } } }]).then((r) => r[0]?.total || 0),
            appointmentsModel.aggregate([
                { $match: { status: "completed" } },
                { $group: { _id: "$patient_id", count: { $sum: 1 } } },
                { $match: { count: { $gte: 2 } } },
                { $count: "total" },
            ]).then((r) => r[0]?.total || 0),
            patientsModel.countDocuments({ "clinical_history.pathological.0": { $exists: true } }),
            buildTimeSeries(appointmentsModel, "date", { status: "completed" }, range),
            prescriptionModel.aggregate([
                ...(isGeneral ? [] : [{ $match: { issued_at: { $gte: start, $lte: end } } }]),
                { $unwind: "$medications" },
                { $group: { _id: "$medications.name", count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 5 },
            ]),
        ]);

        const maleCur = genderCur.find((g) => /masculino|m/i.test(g._id || ""))?.count || 0;
        const femaleCur = genderCur.find((g) => /femenino|f/i.test(g._id || ""))?.count || 0;
        const attendedTotal = maleCur + femaleCur;

        const statDiff = (cur, prev) =>
            isGeneral ? null : `${formatVariation(growthPct(cur, prev))} comparado con el período anterior`;

        const topCards = [
            {
                key: "atendidos_linea",
                title: "Pacientes atendidos",
                stat: String(completedCur),
                statLabel: isGeneral ? "total histórico" : "citas completadas en el período",
                statDiff: statDiff(completedCur, completedPrev),
                chartData: { "Por día": attendedSeries },
            },
            {
                key: "genero",
                title: "Pacientes atendidos por género",
                chartType: "pie",
                pieData: [
                    { name: "Masculino", value: maleCur, pct: pctOf(maleCur, attendedTotal) },
                    { name: "Femenino", value: femaleCur, pct: pctOf(femaleCur, attendedTotal) },
                ],
                stat: String(attendedTotal),
                statLabel: "Total",
            },
            {
                key: "medicamentos",
                title: "Medicamentos más recetados",
                subtitle: "Basado en las recetas emitidas a los pacientes en el período",
                listItems: medsAgg.length ? medsAgg.map((m) => m._id).filter(Boolean) : ["Sin recetas registradas en este período"],
                linkLabel: "Ver inventario",
            },
        ];

        const sections = [
            {
                key: "registro",
                title: "Registro de pacientes",
                icon: "users",
                rows: [
                    buildRow("Total de pacientes registrados", totalPatientsNow, totalPatientsPrevEnd, isGeneral),
                    buildRow("Pacientes nuevos", newPatientsCur, newPatientsPrev, isGeneral, { label: "Nuevos", color: "blue" }),
                    { proceso: "Pacientes recurrentes (2+ citas completadas)", badge: { label: "Recurrentes", color: "purple" }, actual: String(recurrentCount), anterior: "—", variacion: "—" },
                ],
            },
            {
                key: "asistencia",
                title: "Asistencia y comportamiento",
                icon: "users",
                rows: [
                    buildRow("Citas completadas", completedCur, completedPrev, isGeneral),
                    {
                        proceso: "Tasa de asistencia",
                        actual: pctOf(completedCur, completedCur + cancelledCur + noShowCur),
                        anterior: "—",
                        variacion: "—",
                    },
                ],
            },
            {
                key: "tipo_atencion_pac",
                title: "Tipo de atención recibida",
                icon: "clipboard",
                rows: [
                    buildRow("Pacientes atendidos en consulta general", generalAttendedCur.length, 0, true),
                    buildRow("Pacientes atendidos en procedimientos", procedureAttendedCur.length, 0, true),
                ],
            },
            {
                key: "demografia",
                title: "Distribución demográfica",
                icon: "chart",
                rows: [
                    buildRow("Pacientes masculinos atendidos", maleCur, 0, true),
                    buildRow("Pacientes femeninos atendidos", femaleCur, 0, true),
                ],
            },
            {
                key: "seguimiento",
                title: "Seguimiento clínico",
                icon: "stethoscope",
                rows: [
                    { proceso: "Pacientes con antecedentes patológicos registrados", actual: String(pathologicalCount), anterior: "—", variacion: "—" },
                ],
            },
        ];

        const serviceRow = (servicio, cur) => ({
            servicio,
            consultas: cur,
            pctConsultas: pctOf(cur, generalAttendedCur.length + procedureAttendedCur.length),
            ingresos: "—",
            pctIngresos: "—",
            variacion: "—",
        });

        const observations = [];
        if (!isGeneral) {
            const growthNew = growthPct(newPatientsCur, newPatientsPrev);
            if (growthNew !== 0) observations.push(`${growthNew > 0 ? "Incremento" : "Disminución"} de ${Math.abs(growthNew).toFixed(1)}% en pacientes nuevos respecto al período anterior.`);
            observations.push(`Se registraron ${recurrentCount} pacientes recurrentes (2 o más citas completadas).`);
        } else {
            observations.push(`Se han registrado ${totalPatientsNow} pacientes en total desde la creación del sistema.`);
        }
        if (observations.length === 0) observations.push("No se registran variaciones significativas en este período.");

        const pdf = {
            reportTitle: "Reporte de Pacientes",
            periodLabel: formatPeriodLabel(range),
            isGeneral,
            stats: [
                { label: "Total de pacientes", value: String(totalPatientsNow), diff: statDiff(totalPatientsNow, totalPatientsPrevEnd) },
                { label: "Consultas realizadas", value: String(completedCur), diff: statDiff(completedCur, completedPrev) },
                { label: "Nuevos pacientes", value: String(newPatientsCur), diff: statDiff(newPatientsCur, newPatientsPrev) },
                { label: "Ingresos totales", value: formatCurrency(revenueCur), diff: statDiff(revenueCur, revenuePrev) },
            ],
            dailySeries: attendedSeries,
            dailySeriesLabel: "Pacientes atendidos por día",
            typeSeries: [
                { label: TYPE_GENERAL, total: generalAttendedCur.length },
                { label: TYPE_PROCEDURE, total: procedureAttendedCur.length },
            ],
            typeSeriesLabel: "Pacientes por tipo de atención",
            serviceTableTitle: "Resumen por tipo de atención",
            serviceColumnLabel: "Tipo de atención",
            serviceCountLabel: "Pacientes",
            serviceTable: [
                serviceRow(TYPE_GENERAL, generalAttendedCur.length),
                serviceRow(TYPE_PROCEDURE, procedureAttendedCur.length),
            ],
            avgRevenuePerConsult: formatCurrency(completedCur > 0 ? revenueCur / completedCur : 0),
            avgRevenueLabel: "Ingreso promedio por consulta",
            observations,
        };

        res.status(200).json({ topCards, sections, pdf, meta: rangeMeta(range) });
    } catch (error) {
        console.error("reports.getPatientsReport:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/reports/doctors?dateFrom=&dateTo=&general=true
// ─────────────────────────────────────────────────────────────────────────────
reportsController.getDoctorsReport = async (req, res) => {
    try {
        const range = resolveRange(req.query);
        const { isGeneral, start, end, prevStart, prevEnd } = range;

        const curFilter = dateFilter("date", start, end);
        const prevFilter = isGeneral ? {} : dateFilter("date", prevStart, prevEnd);
        const countCur = (extra = {}) => appointmentsModel.countDocuments({ ...curFilter, ...extra });
        const countPrev = (extra = {}) =>
            isGeneral ? Promise.resolve(0) : appointmentsModel.countDocuments({ ...prevFilter, ...extra });

        const [
            activeDoctors,
            totalCur, totalPrev,
            completedCur, completedPrev,
            cancelledCur, cancelledPrev,
            generalCur, generalPrev,
            procedureCur, procedurePrev,
            doctorsCur, doctorsPrev,
            completedSeries,
            topDoctorsAgg,
        ] = await Promise.all([
            doctorsModel.countDocuments({ is_active: true }),
            countCur(), countPrev(),
            countCur({ status: "completed" }), countPrev({ status: "completed" }),
            countCur({ status: "cancelled" }), countPrev({ status: "cancelled" }),
            countCur({ type: TYPE_GENERAL }), countPrev({ type: TYPE_GENERAL }),
            countCur({ type: TYPE_PROCEDURE }), countPrev({ type: TYPE_PROCEDURE }),
            appointmentsModel.distinct("doctor_id", curFilter),
            isGeneral ? Promise.resolve([]) : appointmentsModel.distinct("doctor_id", prevFilter),
            buildTimeSeries(appointmentsModel, "date", { status: "completed" }, range),
            appointmentsModel.aggregate([
                { $match: { ...curFilter, status: "completed" } },
                { $group: { _id: "$doctor_id", count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 5 },
            ]),
        ]);

        const doctorIds = topDoctorsAgg.map((d) => d._id).filter(Boolean);
        const topDoctorsDocs = await doctorsModel.find({ _id: { $in: doctorIds } }, "name last_name").lean();
        const nameById = new Map(topDoctorsDocs.map((d) => [String(d._id), `${d.name} ${d.last_name}`]));
        const mostActive = topDoctorsAgg.map((d) => nameById.get(String(d._id))).filter(Boolean);

        const statDiff = (cur, prev) =>
            isGeneral ? null : `${formatVariation(growthPct(cur, prev))} comparado con el período anterior`;

        const topCards = [
            {
                key: "citas_atendidas",
                title: "Citas atendidas",
                stat: String(completedCur),
                statLabel: isGeneral ? "total histórico" : "en el período seleccionado",
                statDiff: statDiff(completedCur, completedPrev),
                chartData: { "Por día": completedSeries },
            },
            {
                key: "tipo_pie",
                title: "Atención brindada",
                chartType: "pie",
                pieData: [
                    { name: TYPE_GENERAL, value: generalCur, pct: pctOf(generalCur, generalCur + procedureCur) },
                    { name: TYPE_PROCEDURE, value: procedureCur, pct: pctOf(procedureCur, generalCur + procedureCur) },
                ],
                stat: String(generalCur + procedureCur),
                statLabel: "Total",
            },
            {
                key: "mas_activos",
                title: "Doctores más activos",
                subtitle: "Basado en el número de citas completadas en el período",
                listItems: mostActive.length ? mostActive : ["Sin datos suficientes en este período"],
                linkLabel: "Ver todos los doctores",
            },
        ];

        const promedioPorDoctor = doctorsCur.length > 0 ? (completedCur / doctorsCur.length).toFixed(1) : "0.0";
        const promedioPorDoctorPrev = doctorsPrev.length > 0 ? (completedPrev / doctorsPrev.length).toFixed(1) : "0.0";

        const sections = [
            {
                key: "actividad",
                title: "Actividad general",
                icon: "activity",
                rows: [
                    { proceso: "Doctores activos en el sistema", actual: String(activeDoctors), anterior: "—", variacion: "—" },
                    buildRow("Doctores con citas asignadas", doctorsCur.length, doctorsPrev.length, isGeneral),
                    buildRow("Citas atendidas entre todos los doctores", completedCur, completedPrev, isGeneral),
                    {
                        proceso: "Promedio de citas atendidas por doctor",
                        actual: promedioPorDoctor,
                        anterior: isGeneral ? "—" : promedioPorDoctorPrev,
                        variacion: isGeneral ? "—" : formatVariation(growthPct(Number(promedioPorDoctor), Number(promedioPorDoctorPrev))),
                    },
                ],
            },
            {
                key: "rendimiento",
                title: "Rendimiento clínico",
                icon: "chart",
                rows: [
                    buildRow("Citas canceladas por doctores", cancelledCur, cancelledPrev, isGeneral),
                    {
                        proceso: "Tasa de cumplimiento de citas",
                        actual: pctOf(completedCur, totalCur),
                        anterior: isGeneral ? "—" : pctOf(completedPrev, totalPrev),
                        variacion: "—",
                    },
                ],
            },
            {
                key: "atencion_brindada",
                title: "Atención brindada",
                icon: "stethoscope",
                rows: [
                    buildRow("Consultas generales atendidas", generalCur, generalPrev, isGeneral),
                    buildRow("Procedimientos realizados", procedureCur, procedurePrev, isGeneral),
                ],
            },
        ];

        const serviceRow = (servicio, cur, prev) => ({
            servicio,
            consultas: cur,
            pctConsultas: pctOf(cur, generalCur + procedureCur),
            ingresos: "—",
            pctIngresos: "—",
            variacion: isGeneral ? "—" : formatVariation(growthPct(cur, prev)),
        });

        const observations = [];
        if (!isGeneral) {
            const doctorsGrowth = growthPct(doctorsCur.length, doctorsPrev.length);
            if (doctorsGrowth !== 0) observations.push(`${doctorsGrowth > 0 ? "Incremento" : "Disminución"} de ${Math.abs(doctorsGrowth).toFixed(1)}% en doctores con citas asignadas respecto al período anterior.`);
            observations.push(`Los doctores atendieron en promedio ${promedioPorDoctor} citas cada uno en el período.`);
        } else {
            observations.push(`Se registran ${activeDoctors} doctores activos en el sistema.`);
        }

        const pdf = {
            reportTitle: "Reporte de Doctores",
            periodLabel: formatPeriodLabel(range),
            isGeneral,
            stats: [
                { label: "Doctores activos", value: String(activeDoctors), diff: null },
                { label: "Citas atendidas", value: String(completedCur), diff: statDiff(completedCur, completedPrev) },
                { label: "Citas canceladas", value: String(cancelledCur), diff: statDiff(cancelledCur, cancelledPrev) },
                { label: "Promedio por doctor", value: promedioPorDoctor, diff: null },
            ],
            dailySeries: completedSeries,
            dailySeriesLabel: "Citas atendidas por día",
            typeSeries: [
                { label: TYPE_GENERAL, total: generalCur },
                { label: TYPE_PROCEDURE, total: procedureCur },
            ],
            typeSeriesLabel: "Atención por tipo",
            serviceTableTitle: "Resumen por tipo de atención",
            serviceColumnLabel: "Tipo de atención",
            serviceCountLabel: "Citas",
            serviceTable: [
                serviceRow(TYPE_GENERAL, generalCur, generalPrev),
                serviceRow(TYPE_PROCEDURE, procedureCur, procedurePrev),
            ],
            avgRevenuePerConsult: null,
            avgRevenueLabel: null,
            observations,
        };

        res.status(200).json({ topCards, sections, pdf, meta: rangeMeta(range) });
    } catch (error) {
        console.error("reports.getDoctorsReport:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/reports/inventory?dateFrom=&dateTo=&general=true
// ─────────────────────────────────────────────────────────────────────────────
const USAGE_TYPES = ["Treatment use", "Manual use"];

reportsController.getInventoryReport = async (req, res) => {
    try {
        const range = resolveRange(req.query);
        const { isGeneral, start, end, prevStart, prevEnd } = range;

        const curFilter = dateFilter("date", start, end);
        const prevFilter = isGeneral ? {} : dateFilter("date", prevStart, prevEnd);
        const countMov = (extra = {}) => movementsModel.countDocuments({ ...curFilter, ...extra });
        const countMovPrev = (extra = {}) =>
            isGeneral ? Promise.resolve(0) : movementsModel.countDocuments({ ...prevFilter, ...extra });

        const topUsedAgg = (filter) =>
            movementsModel.aggregate([
                { $match: { ...filter, type: { $in: USAGE_TYPES } } },
                { $group: { _id: "$itemName", total: { $sum: { $abs: "$quantity" } } } },
                { $sort: { total: -1 } },
                { $limit: 5 },
            ]);

        const [
            totalProducts,
            availableProducts,
            lowStockProducts,
            outOfStockProducts,
            valorTotalAgg,
            categoriesAgg,
            totalMovCur, totalMovPrev,
            entriesCur, entriesPrev,
            usageCur, usagePrev,
            adjustmentsCur, adjustmentsPrev,
            movementsSeries, usageSeries,
            topUsedCur, topUsedPrev,
        ] = await Promise.all([
            inventoryModel.countDocuments(),
            inventoryModel.countDocuments({ $expr: { $gt: ["$stock", "$min_stock"] } }),
            inventoryModel.countDocuments({ $expr: { $and: [{ $gt: ["$stock", 0] }, { $lte: ["$stock", "$min_stock"] }] } }),
            inventoryModel.countDocuments({ stock: { $lte: 0 } }),
            inventoryModel.aggregate([{ $group: { _id: null, total: { $sum: { $multiply: ["$stock", "$price"] } } } }]),
            inventoryModel.aggregate([{ $group: { _id: "$category", count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 5 }]),
            countMov(), countMovPrev(),
            countMov({ type: "Stock entry" }), countMovPrev({ type: "Stock entry" }),
            countMov({ type: { $in: USAGE_TYPES } }), countMovPrev({ type: { $in: USAGE_TYPES } }),
            countMov({ type: "Inventory adjustment" }), countMovPrev({ type: "Inventory adjustment" }),
            buildTimeSeries(movementsModel, "date", {}, range),
            buildTimeSeries(movementsModel, "date", { type: { $in: USAGE_TYPES } }, range),
            topUsedAgg(curFilter),
            isGeneral ? Promise.resolve([]) : topUsedAgg(prevFilter),
        ]);

        const valorTotal = valorTotalAgg[0]?.total || 0;
        const prevUsedByName = new Map(topUsedPrev.map((u) => [u._id, u.total]));

        const statDiff = (cur, prev) =>
            isGeneral ? null : `${formatVariation(growthPct(cur, prev))} comparado con el período anterior`;

        const topCards = [
            {
                key: "movimientos",
                title: "Movimientos de inventario",
                stat: String(totalMovCur),
                statLabel: isGeneral ? "total histórico" : "en el período seleccionado",
                statDiff: statDiff(totalMovCur, totalMovPrev),
                chartData: { "Por día": movementsSeries },
            },
            {
                key: "usos",
                title: "Productos usados/consumidos",
                stat: String(usageCur),
                statLabel: isGeneral ? "total histórico" : "en el período",
                statDiff: statDiff(usageCur, usagePrev),
                chartType: "bar",
                chartData: { "Por día": usageSeries },
            },
            {
                key: "mas_usados",
                title: "Productos más utilizados",
                subtitle: "Basado en las unidades consumidas en el período",
                listItems: topUsedCur.length ? topUsedCur.map((u) => u._id).filter(Boolean) : ["Sin movimientos registrados en este período"],
                linkLabel: "Ver el inventario",
            },
        ];

        const sections = [
            {
                key: "estado_general",
                title: "Estado general del inventario",
                icon: "package",
                rows: [
                    { proceso: "Total de productos registrados", actual: String(totalProducts), anterior: "—", variacion: "—" },
                    { proceso: "Productos con stock disponible", actual: String(availableProducts), anterior: "—", variacion: "—" },
                    { proceso: "Productos con stock bajo", badge: { label: "Stock bajo", color: "orange" }, actual: String(lowStockProducts), anterior: "—", variacion: "—" },
                    { proceso: "Productos agotados", badge: { label: "Agotado", color: "red" }, actual: String(outOfStockProducts), anterior: "—", variacion: "—" },
                ],
            },
            {
                key: "categorias",
                title: "Categorías de productos",
                icon: "clipboardCheck",
                rows: categoriesAgg.map((c) => ({ proceso: c._id || "Sin categoría", actual: String(c.count), anterior: "—", variacion: "—" })),
            },
            {
                key: "movimientos_detalle",
                title: "Movimientos de inventario",
                icon: "plusCircle",
                rows: [
                    buildRow("Entradas de stock", entriesCur, entriesPrev, isGeneral),
                    buildRow("Usos/salidas registradas", usageCur, usagePrev, isGeneral),
                    buildRow("Ajustes de inventario", adjustmentsCur, adjustmentsPrev, isGeneral),
                    buildRow("Total de movimientos registrados", totalMovCur, totalMovPrev, isGeneral),
                ],
            },
            {
                key: "mas_utilizados",
                title: "Productos más utilizados",
                icon: "user",
                rows: topUsedCur.length
                    ? topUsedCur.map((u) => buildRow(u._id || "Sin nombre", u.total, prevUsedByName.get(u._id) || 0, isGeneral))
                    : [{ proceso: "Sin movimientos de uso registrados en este período", actual: "0", anterior: "—", variacion: "—" }],
            },
        ];

        const totalCategoryCount = categoriesAgg.reduce((sum, c) => sum + c.count, 0);
        const serviceTable = categoriesAgg.map((c) => ({
            servicio: c._id || "Sin categoría",
            consultas: c.count,
            pctConsultas: pctOf(c.count, totalCategoryCount),
            ingresos: "—",
            pctIngresos: "—",
            variacion: "—",
        }));

        const observations = [];
        if (outOfStockProducts > 0) observations.push(`Hay ${outOfStockProducts} producto(s) agotado(s) que requieren reabastecimiento.`);
        if (lowStockProducts > 0) observations.push(`Hay ${lowStockProducts} producto(s) con stock bajo el mínimo configurado.`);
        if (!isGeneral) {
            const usageGrowth = growthPct(usageCur, usagePrev);
            if (usageGrowth !== 0) observations.push(`${usageGrowth > 0 ? "Incremento" : "Disminución"} de ${Math.abs(usageGrowth).toFixed(1)}% en el consumo de productos respecto al período anterior.`);
        }
        if (observations.length === 0) observations.push("No se registran alertas de inventario en este período.");

        const pdf = {
            reportTitle: "Reporte de Inventario",
            periodLabel: formatPeriodLabel(range),
            isGeneral,
            stats: [
                { label: "Total de productos", value: String(totalProducts), diff: null },
                { label: "Movimientos registrados", value: String(totalMovCur), diff: statDiff(totalMovCur, totalMovPrev) },
                { label: "Productos con alertas", value: String(lowStockProducts + outOfStockProducts), diff: null },
                { label: "Valor total del inventario", value: formatCurrency(valorTotal), diff: null },
            ],
            dailySeries: movementsSeries,
            dailySeriesLabel: "Movimientos por día",
            typeSeries: categoriesAgg.map((c) => ({ label: c._id || "Sin categoría", total: c.count })),
            typeSeriesLabel: "Productos por categoría",
            serviceTableTitle: "Resumen por categoría",
            serviceColumnLabel: "Categoría",
            serviceCountLabel: "Productos",
            serviceTable,
            avgRevenuePerConsult: totalProducts > 0 ? formatCurrency(valorTotal / totalProducts) : formatCurrency(0),
            avgRevenueLabel: "Valor promedio por producto",
            observations,
        };

        res.status(200).json({ topCards, sections, pdf, meta: rangeMeta(range) });
    } catch (error) {
        console.error("reports.getInventoryReport:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
};

export default reportsController;
