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
    describeChange,
    buildComparativeRow,
    averageMonthCount,
    earliestDate,
    baselineNote,
    pctOf,
    formatCurrency,
    buildMonthlySeries,
    formatPeriodLabel,
    rangeMeta,
} from "../../utils/reportDateRange.js";

// Arma el conjunto de helpers de comparación que usan las cuatro
// funciones de reporte a partir del rango resuelto. base(raw) convierte
// un conteo de la ventana de comparación en el valor comparable (dividido
// por la cantidad de meses en modo promedio, o tal cual en modo dos
// meses). cmpRow coloca ese valor y el del mes actual en las columnas
// correctas de la tabla según el modo. statDiff arma el texto corto de
// las tarjetas superiores.
const buildComparisonHelpers = (range, divisor) => {
    const compareReady = !range.isGeneral && (range.mode === "meses" || divisor >= 1);
    const base = (raw) => (!compareReady || raw === null || raw === undefined ? null : raw / divisor);

    const cmpRow = (proceso, currentValue, compareRaw, polarity, badge) => {
        const compareValue = base(compareRaw);
        const isMonths = range.mode === "meses";
        return buildComparativeRow({
            proceso,
            badge,
            leftValue: isMonths ? compareValue : currentValue,
            rightValue: isMonths ? currentValue : compareValue,
            variationOf: range.variationOf,
            polarity,
        });
    };

    // Igual que cmpRow pero con un formateador propio para el valor de las
    // celdas (por ejemplo un decimal, o la unidad "min").
    const cmpRowFmt = (proceso, currentValue, compareRaw, polarity, format) => {
        const compareValue = base(compareRaw);
        const isMonths = range.mode === "meses";
        return buildComparativeRow({
            proceso,
            leftValue: isMonths ? compareValue : currentValue,
            rightValue: isMonths ? currentValue : compareValue,
            variationOf: range.variationOf,
            polarity,
            format,
        });
    };

    const rateRow = (proceso, currentRate, compareRate, polarity) => {
        const isMonths = range.mode === "meses";
        const compareValue = compareReady ? compareRate : null;
        return buildComparativeRow({
            proceso,
            leftValue: isMonths ? compareValue : currentRate,
            rightValue: isMonths ? currentRate : compareValue,
            variationOf: range.variationOf,
            tipo: "tasa",
            polarity,
        });
    };

    const statDiff = (current, compareRaw) => {
        const b = base(compareRaw);
        if (b === null) return null;
        const change = describeChange(current, b, { tipo: "flujo", polarity: "buena" });
        if (change.variacion === "—") return null;
        const otherLabel = range.mode === "meses" ? range.col2Label : range.col3Label;
        return `${change.variacion} vs. ${otherLabel}`;
    };

    // Igual que statDiff, pero además expone el tono real (buena/mala) en
    // vez de que el PDF exportado (ReportPDFDocument.jsx) tenga que
    // adivinarlo por el signo del texto. statDiff() siempre asume
    // polarity "buena", lo que funciona por casualidad para casi todas las
    // tarjetas (más ingresos/pacientes/citas completadas sí es bueno),
    // pero pintaba en VERDE un aumento de "Citas canceladas" en el PDF,
    // como si fuera una mejora. Se usa solo donde la polaridad real no es
    // "buena"; statDiff() se deja intacta para no tocar los demás usos.
    const statDiffWithTone = (current, compareRaw, polarity) => {
        const b = base(compareRaw);
        if (b === null) return { diff: null, tone: null };
        const change = describeChange(current, b, { tipo: "flujo", polarity });
        if (change.variacion === "—") return { diff: null, tone: null };
        const otherLabel = range.mode === "meses" ? range.col2Label : range.col3Label;
        return { diff: `${change.variacion} vs. ${otherLabel}`, tone: change.tone };
    };

    return { compareReady, base, cmpRow, cmpRowFmt, rateRow, statDiff, statDiffWithTone, col2Label: range.col2Label, col3Label: range.col3Label };
};

const reportsController = {};

// Las citas solo tienen 2 valores reales de type (no existe un campo
// de especialidad médica), así que son la agrupación de servicio más
// fiel a los datos.
const TYPE_GENERAL = "Consulta Médica General";
const TYPE_PROCEDURE = "Procedimiento";

// GET /api/reports/appointments?dateFrom=&dateTo=&general=true
reportsController.getAppointmentsReport = async (req, res) => {
    try {
        const range = resolveRange(req.query);
        const { isGeneral, start, end, compareStart, compareEnd } = range;

        // Divisor del promedio: en modo "promedio" es la cantidad de meses
        // del tramo (para pasar de total a promedio por mes); en los demás
        // modos es 1. Los 4 reportes muestran siempre los datos de toda la
        // clínica, sin filtrar por el rol de quien los consulta.
        const divisor = range.mode === "promedio"
            ? averageMonthCount(range, await earliestDate(appointmentsModel, "date"))
            : 1;
        const { base, cmpRow, cmpRowFmt, statDiff, statDiffWithTone, col2Label, col3Label } = buildComparisonHelpers(range, divisor);

        const curFilter = dateFilter("date", start, end);
        const prevFilter = isGeneral ? {} : dateFilter("date", compareStart, compareEnd);
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
            // Conteos solo de completadas por tipo, para el gráfico y
            // la tabla del PDF. La sección en pantalla tipo de
            // atención usa el conteo total porque mide volumen de
            // reservas.
            countCur({ type: TYPE_GENERAL, status: "completed" }), countPrev({ type: TYPE_GENERAL, status: "completed" }),
            countCur({ type: TYPE_PROCEDURE, status: "completed" }), countPrev({ type: TYPE_PROCEDURE, status: "completed" }),
            // Los ingresos solo cuentan citas completadas, una
            // cancelada o no-show no generó ingreso real aunque
            // tenga un total (precio) guardado desde que se agendó.
            sumTotal({ ...curFilter, status: "completed" }), isGeneral ? Promise.resolve(0) : sumTotal({ ...prevFilter, status: "completed" }),
            sumTotal({ ...curFilter, status: "completed", type: TYPE_GENERAL }), isGeneral ? Promise.resolve(0) : sumTotal({ ...prevFilter, status: "completed", type: TYPE_GENERAL }),
            sumTotal({ ...curFilter, status: "completed", type: TYPE_PROCEDURE }), isGeneral ? Promise.resolve(0) : sumTotal({ ...prevFilter, status: "completed", type: TYPE_PROCEDURE }),
            appointmentsModel.distinct("doctor_id", curFilter),
            isGeneral ? Promise.resolve([]) : appointmentsModel.distinct("doctor_id", prevFilter),
            appointmentsModel.aggregate([{ $match: curFilter }, { $group: { _id: null, avg: { $avg: "$duration_minutes" } } }]),
            isGeneral ? Promise.resolve([]) : appointmentsModel.aggregate([{ $match: prevFilter }, { $group: { _id: null, avg: { $avg: "$duration_minutes" } } }]),
            buildMonthlySeries(appointmentsModel, "date", {}),
            buildMonthlySeries(appointmentsModel, "date", { status: "completed" }),
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

        const monthLabelText = isGeneral ? "total histórico" : `en ${col2Label}`;

        const topCards = [
            {
                key: "programadas",
                title: "Citas programadas",
                stat: String(totalCur),
                statLabel: monthLabelText,
                statDiff: statDiff(totalCur, totalPrev),
                chartData: { "Por mes": dailySeries },
            },
            {
                key: "atendidos",
                title: "Citas completadas",
                stat: String(completedCur),
                statLabel: monthLabelText,
                statDiff: statDiff(completedCur, completedPrev),
                chartType: "bar",
                chartData: { "Por mes": completedSeries },
            },
            {
                key: "mas_atendidos",
                title: "Pacientes más atendidos",
                subtitle: isGeneral ? "Basado en las citas completadas en todo el histórico" : `Basado en las citas completadas en ${col2Label}`,
                listItems: mostAttended.length ? mostAttended : ["Sin datos suficientes en este período"],
                linkLabel: "Ver todos los pacientes",
            },
        ];

        // Duración promedio: se compara el valor tal cual contra el mes de
        // comparación, con la unidad "min" pegada a cada celda.
        const avgDurationRow = cmpRowFmt(
            "Duración promedio de las citas",
            avgDuration,
            avgDurationPrev,
            "neutra",
            (v) => `${Math.round(v)} min`
        );

        const section = (key, title, icon, rows) => ({ key, title, icon, rows, col2Label, comparisonLabel: col3Label });

        const sections = [
            section("volumen", "Volumen de citas", "calendar", [
                cmpRow("Total de citas registradas", totalCur, totalPrev, "buena"),
                cmpRow("Citas completadas", completedCur, completedPrev, "buena"),
            ]),
            section("estado", "Estado de citas", "clipboard", [
                cmpRow("Citas completadas", completedCur, completedPrev, "buena", { label: "Completadas", color: "green" }),
                cmpRow("Citas canceladas", cancelledCur, cancelledPrev, "mala", { label: "Canceladas", color: "red" }),
                cmpRow("Citas no atendidas", noShowCur, noShowPrev, "mala", { label: "No se presentó", color: "orange" }),
                cmpRow("Citas pendientes de confirmar", pendingCur, pendingPrev, "neutra"),
            ]),
            section("tipo_atencion", "Tipo de atención", "stethoscope", [
                cmpRow(TYPE_GENERAL, generalCur, generalPrev, "neutra"),
                cmpRow(TYPE_PROCEDURE, procedureCur, procedurePrev, "neutra"),
            ]),
            section("medicos", "Médicos y duración de consultas", "user", [
                cmpRow("Doctores con citas asignadas", doctorsCur.length, doctorsPrev.length, "neutra"),
                avgDurationRow,
            ]),
        ];

        // cur y prev son conteos de citas completadas por tipo, así
        // consultas e ingresos quedan consistentes en la misma fila:
        // ambas reflejan solo lo atendido. La variación conserva solo el
        // texto (sin el detalle entre paréntesis) para que quepa en la
        // columna del PDF.
        const serviceRow = (servicio, cur, prev, revCur, revPrev) => {
            const change = describeChange(cur, base(prev), { tipo: "flujo", polarity: "neutra" });
            return {
                servicio,
                consultas: cur,
                pctConsultas: pctOf(cur, completedCur),
                ingresos: formatCurrency(revCur),
                pctIngresos: pctOf(revCur, revenueCur),
                variacion: change.variacion,
                tone: change.tone,
            };
        };

        const otherLabel = range.mode === "meses" ? col2Label : col3Label;
        const observations = [];
        if (!isGeneral && base(1) !== null) {
            const genGrowth = growthPct(generalCur, base(generalPrev) || 0);
            const procGrowth = growthPct(procedureCur, base(procedurePrev) || 0);
            if (genGrowth !== 0) observations.push(`${genGrowth > 0 ? "Incremento" : "Disminución"} de ${Math.abs(genGrowth).toFixed(1)}% en consultas médicas generales respecto a ${otherLabel}.`);
            if (procGrowth !== 0) observations.push(`${procGrowth > 0 ? "Incremento" : "Disminución"} de ${Math.abs(procGrowth).toFixed(1)}% en procedimientos respecto a ${otherLabel}.`);
            if (cancelledCur > 0) observations.push(`Se registraron ${cancelledCur} citas canceladas en el mes analizado.`);
        } else if (isGeneral) {
            observations.push(`Se registran ${generalCur} consultas médicas generales y ${procedureCur} procedimientos en todo el histórico.`);
        }
        if (observations.length === 0) observations.push("No se registran variaciones significativas.");

        const pdf = {
            reportTitle: "Reporte de Citas",
            periodLabel: formatPeriodLabel(range),
            baselineNote: baselineNote(range),
            isGeneral,
            stats: [
                { label: "Total de citas", value: String(totalCur), diff: statDiff(totalCur, totalPrev) },
                { label: "Citas completadas", value: String(completedCur), diff: statDiff(completedCur, completedPrev) },
                { label: "Citas canceladas", value: String(cancelledCur), ...statDiffWithTone(cancelledCur, cancelledPrev, "mala") },
                { label: "Ingresos totales", value: formatCurrency(revenueCur), diff: statDiff(revenueCur, revenuePrev) },
            ],
            dailySeries,
            dailySeriesLabel: "Citas por mes",
            typeSeries: [
                { label: TYPE_GENERAL, total: generalCompletedCur },
                { label: TYPE_PROCEDURE, total: procedureCompletedCur },
            ],
            typeSeriesLabel: isGeneral ? "Citas completadas por tipo de atención" : `Citas completadas por tipo en ${col2Label}`,
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

// GET /api/reports/patients?dateFrom=&dateTo=&general=true
reportsController.getPatientsReport = async (req, res) => {
    try {
        const range = resolveRange(req.query);
        const { isGeneral, start, end, compareStart, compareEnd } = range;

        const divisor = range.mode === "promedio"
            ? averageMonthCount(range, await earliestDate(appointmentsModel, "date"))
            : 1;
        const { base, cmpRow, rateRow, statDiff, statDiffWithTone, col2Label, col3Label } = buildComparisonHelpers(range, divisor);

        const curFilter = dateFilter("date", start, end);
        const prevFilter = isGeneral ? {} : dateFilter("date", compareStart, compareEnd);
        const createdCurFilter = dateFilter("createdAt", start, end);
        const createdPrevFilter = isGeneral ? {} : dateFilter("createdAt", compareStart, compareEnd);

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

        // Pacientes con 2 o más citas completadas dentro de la ventana
        // dada, para la fila de pacientes recurrentes.
        const recurrentAgg = (filter) =>
            appointmentsModel
                .aggregate([
                    { $match: { ...filter, status: "completed" } },
                    { $group: { _id: "$patient_id", count: { $sum: 1 } } },
                    { $match: { count: { $gte: 2 } } },
                    { $count: "total" },
                ])
                .then((r) => r[0]?.total || 0);

        // Pacientes atendidos dentro del rango elegido, se usa para
        // acotar pathologicalCount (más abajo) al mismo período que
        // el resto del reporte, en vez de a toda la historia.
        const attendedPatientIdsCur = isGeneral ? null : await distinctAttended(curFilter);

        const [
            totalPatientsNow, totalPatientsPrevEnd,
            newPatientsCur, newPatientsPrev,
            completedCur, completedPrev,
            cancelledCur, cancelledPrev,
            noShowCur, noShowPrev,
            genderCur, genderPrev,
            generalAttendedCur, procedureAttendedCur,
            generalAttendedPrev, procedureAttendedPrev,
            revenueCur, revenuePrev,
            recurrentCount, recurrentCountPrev,
            pathologicalCount,
            attendedSeries,
            medsAgg,
        ] = await Promise.all([
            patientsModel.countDocuments(isGeneral ? {} : { createdAt: { $lte: end } }),
            isGeneral ? Promise.resolve(0) : patientsModel.countDocuments({ createdAt: { $lte: compareEnd } }),
            patientsModel.countDocuments(createdCurFilter),
            isGeneral ? Promise.resolve(0) : patientsModel.countDocuments(createdPrevFilter),
            countAppt({ status: "completed" }), countApptPrev({ status: "completed" }),
            countAppt({ status: "cancelled" }), countApptPrev({ status: "cancelled" }),
            countAppt({ status: "no_show" }), countApptPrev({ status: "no_show" }),
            genderBreakdown(curFilter), isGeneral ? Promise.resolve([]) : genderBreakdown(prevFilter),
            distinctAttended(curFilter, TYPE_GENERAL), distinctAttended(curFilter, TYPE_PROCEDURE),
            isGeneral ? Promise.resolve([]) : distinctAttended(prevFilter, TYPE_GENERAL),
            isGeneral ? Promise.resolve([]) : distinctAttended(prevFilter, TYPE_PROCEDURE),
            // Los ingresos solo cuentan citas completadas, una
            // cancelada o no-show no generó ingreso real aunque
            // tenga un total (precio) guardado desde que se agendó.
            appointmentsModel.aggregate([{ $match: { ...curFilter, status: "completed" } }, { $group: { _id: null, total: { $sum: "$total" } } }]).then((r) => r[0]?.total || 0),
            isGeneral ? Promise.resolve(0) : appointmentsModel.aggregate([{ $match: { ...prevFilter, status: "completed" } }, { $group: { _id: null, total: { $sum: "$total" } } }]).then((r) => r[0]?.total || 0),
            // Se acota al período elegido, igual que el resto de las
            // cifras de esta sección.
            recurrentAgg(curFilter),
            isGeneral ? Promise.resolve(0) : recurrentAgg(prevFilter),
            // Mismo problema: no hay fecha propia en cada antecedente patológico, así que se acota
            // a los pacientes efectivamente atendidos dentro del período elegido (en vez de a
            // todos los pacientes que alguna vez tuvieron un antecedente registrado).
            patientsModel.countDocuments({
                ...(isGeneral ? {} : { _id: { $in: attendedPatientIdsCur } }),
                "clinical_history.pathological.0": { $exists: true },
            }),
            buildMonthlySeries(appointmentsModel, "date", { status: "completed" }),
            prescriptionModel.aggregate([
                ...(isGeneral ? [] : [{ $match: { issued_at: { $gte: start, $lte: end } } }]),
                { $unwind: "$medications" },
                { $group: { _id: "$medications.name", count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 5 },
            ]),
        ]);

        const genderCount = (agg, re) => agg.find((g) => re.test(g._id || ""))?.count || 0;
        const maleCur = genderCount(genderCur, /masculino|m/i);
        const femaleCur = genderCount(genderCur, /femenino|f/i);
        const malePrev = genderCount(genderPrev, /masculino|m/i);
        const femalePrev = genderCount(genderPrev, /femenino|f/i);
        const attendedTotal = maleCur + femaleCur;

        const attendanceRate = (c, ca, ns) => (c + ca + ns > 0 ? (c / (c + ca + ns)) * 100 : 0);

        const topCards = [
            {
                key: "atendidos_linea",
                title: "Pacientes atendidos",
                stat: String(completedCur),
                statLabel: isGeneral ? "citas completadas (histórico)" : `citas completadas en ${col2Label}`,
                statDiff: statDiff(completedCur, completedPrev),
                chartData: { "Por mes": attendedSeries },
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
                subtitle: isGeneral ? "Basado en las recetas emitidas en todo el histórico" : `Basado en las recetas emitidas en ${col2Label}`,
                listItems: medsAgg.length ? medsAgg.map((m) => m._id).filter(Boolean) : ["Sin recetas registradas"],
                linkLabel: "Ver inventario",
            },
        ];

        const section = (key, title, icon, rows) => ({ key, title, icon, rows, col2Label, comparisonLabel: col3Label });

        const sections = [
            section("registro", "Registro de pacientes", "users", [
                cmpRow("Total de pacientes registrados", totalPatientsNow, totalPatientsPrevEnd, "buena"),
                cmpRow("Pacientes nuevos", newPatientsCur, newPatientsPrev, "buena", { label: "Nuevos", color: "blue" }),
                cmpRow("Pacientes recurrentes (2+ citas completadas)", recurrentCount, recurrentCountPrev, "buena", { label: "Recurrentes", color: "purple" }),
            ]),
            section("asistencia", "Asistencia y comportamiento", "users", [
                cmpRow("Citas completadas", completedCur, completedPrev, "buena"),
                rateRow(
                    "Tasa de asistencia",
                    attendanceRate(completedCur, cancelledCur, noShowCur),
                    attendanceRate(completedPrev, cancelledPrev, noShowPrev),
                    "buena"
                ),
            ]),
            section("tipo_atencion_pac", "Tipo de atención recibida", "clipboard", [
                cmpRow("Pacientes atendidos en consulta general", generalAttendedCur.length, generalAttendedPrev.length, "neutra"),
                cmpRow("Pacientes atendidos en procedimientos", procedureAttendedCur.length, procedureAttendedPrev.length, "neutra"),
            ]),
            section("demografia", "Distribución demográfica", "chart", [
                cmpRow("Pacientes masculinos atendidos", maleCur, malePrev, "neutra"),
                cmpRow("Pacientes femeninos atendidos", femaleCur, femalePrev, "neutra"),
            ]),
            section("seguimiento", "Seguimiento clínico", "stethoscope", [
                // Los antecedentes patológicos no tienen fecha propia, así que
                // este conteo es una foto del presente, sin comparación posible.
                buildComparativeRow({
                    proceso: "Pacientes con antecedentes patológicos registrados",
                    leftValue: pathologicalCount,
                    rightValue: null,
                    tipo: "al_momento",
                }),
            ]),
        ];

        const serviceRow = (servicio, cur) => ({
            servicio,
            consultas: cur,
            pctConsultas: pctOf(cur, generalAttendedCur.length + procedureAttendedCur.length),
            ingresos: "—",
            pctIngresos: "—",
            variacion: "—",
            tone: "neutra",
        });

        const otherLabel = range.mode === "meses" ? col2Label : col3Label;
        const observations = [];
        if (!isGeneral && base(1) !== null) {
            const growthNew = growthPct(newPatientsCur, base(newPatientsPrev) || 0);
            if (growthNew !== 0) observations.push(`${growthNew > 0 ? "Incremento" : "Disminución"} de ${Math.abs(growthNew).toFixed(1)}% en pacientes nuevos respecto a ${otherLabel}.`);
            observations.push(`Se registraron ${recurrentCount} pacientes recurrentes (2 o más citas completadas) en el mes analizado.`);
        } else if (isGeneral) {
            observations.push(`Se han registrado ${totalPatientsNow} pacientes en total desde la creación del sistema.`);
        }
        if (observations.length === 0) observations.push("No se registran variaciones significativas.");

        const pdf = {
            reportTitle: "Reporte de Pacientes",
            periodLabel: formatPeriodLabel(range),
            baselineNote: baselineNote(range),
            isGeneral,
            stats: [
                { label: "Total de pacientes", value: String(totalPatientsNow), diff: statDiff(totalPatientsNow, totalPatientsPrevEnd) },
                { label: "Consultas realizadas", value: String(completedCur), diff: statDiff(completedCur, completedPrev) },
                { label: "Nuevos pacientes", value: String(newPatientsCur), diff: statDiff(newPatientsCur, newPatientsPrev) },
                { label: "Ingresos totales", value: formatCurrency(revenueCur), diff: statDiff(revenueCur, revenuePrev) },
            ],
            dailySeries: attendedSeries,
            dailySeriesLabel: "Pacientes atendidos por mes",
            typeSeries: [
                { label: TYPE_GENERAL, total: generalAttendedCur.length },
                { label: TYPE_PROCEDURE, total: procedureAttendedCur.length },
            ],
            typeSeriesLabel: isGeneral ? "Pacientes por tipo de atención" : `Pacientes por tipo en ${col2Label}`,
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

// GET /api/reports/doctors?dateFrom=&dateTo=&general=true
reportsController.getDoctorsReport = async (req, res) => {
    try {
        const range = resolveRange(req.query);
        const { isGeneral, start, end, compareStart, compareEnd } = range;

        const divisor = range.mode === "promedio"
            ? averageMonthCount(range, await earliestDate(appointmentsModel, "date"))
            : 1;
        const { base, cmpRow, cmpRowFmt, rateRow, statDiff, col2Label, col3Label } = buildComparisonHelpers(range, divisor);

        const curFilter = dateFilter("date", start, end);
        const prevFilter = isGeneral ? {} : dateFilter("date", compareStart, compareEnd);
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
            buildMonthlySeries(appointmentsModel, "date", { status: "completed" }),
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

        const topCards = [
            {
                key: "citas_atendidas",
                title: "Citas atendidas",
                stat: String(completedCur),
                statLabel: isGeneral ? "total histórico" : `en ${col2Label}`,
                statDiff: statDiff(completedCur, completedPrev),
                chartData: { "Por mes": completedSeries },
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
                subtitle: isGeneral ? "Basado en las citas completadas en todo el histórico" : `Basado en las citas completadas en ${col2Label}`,
                listItems: mostActive.length ? mostActive : ["Sin datos suficientes en este período"],
                linkLabel: "Ver todos los doctores",
            },
        ];

        const avgPerDoctor = doctorsCur.length > 0 ? completedCur / doctorsCur.length : 0;
        const avgPerDoctorPrev = doctorsPrev.length > 0 ? completedPrev / doctorsPrev.length : 0;
        const promedioPorDoctor = avgPerDoctor.toFixed(1);
        const fulfillmentRate = (c, t) => (t > 0 ? (c / t) * 100 : 0);

        const avgPerDoctorRow = cmpRowFmt(
            "Promedio de citas atendidas por doctor",
            avgPerDoctor,
            avgPerDoctorPrev,
            "buena",
            (v) => v.toFixed(1)
        );

        const section = (key, title, icon, rows) => ({ key, title, icon, rows, col2Label, comparisonLabel: col3Label });

        const sections = [
            section("actividad", "Actividad general", "activity", [
                // El total de doctores activos es una foto del presente, sin
                // histórico por fecha.
                buildComparativeRow({ proceso: "Doctores activos en el sistema", leftValue: activeDoctors, rightValue: null, tipo: "al_momento" }),
                cmpRow("Doctores con citas asignadas", doctorsCur.length, doctorsPrev.length, "neutra"),
                cmpRow("Citas atendidas entre todos los doctores", completedCur, completedPrev, "buena"),
                avgPerDoctorRow,
            ]),
            section("rendimiento", "Rendimiento clínico", "chart", [
                cmpRow("Citas canceladas por doctores", cancelledCur, cancelledPrev, "mala"),
                rateRow(
                    "Tasa de cumplimiento de citas",
                    fulfillmentRate(completedCur, totalCur),
                    fulfillmentRate(completedPrev, totalPrev),
                    "buena"
                ),
            ]),
            section("atencion_brindada", "Atención brindada", "stethoscope", [
                cmpRow("Consultas generales atendidas", generalCur, generalPrev, "neutra"),
                cmpRow("Procedimientos realizados", procedureCur, procedurePrev, "neutra"),
            ]),
        ];

        const serviceRow = (servicio, cur, prev) => {
            const change = describeChange(cur, base(prev), { tipo: "flujo", polarity: "neutra" });
            return {
                servicio,
                consultas: cur,
                pctConsultas: pctOf(cur, generalCur + procedureCur),
                ingresos: "—",
                pctIngresos: "—",
                variacion: change.variacion,
                tone: change.tone,
            };
        };

        const otherLabel = range.mode === "meses" ? col2Label : col3Label;
        const observations = [];
        if (!isGeneral && base(1) !== null) {
            const canceledGrowth = growthPct(cancelledCur, base(cancelledPrev) || 0);
            if (canceledGrowth !== 0) observations.push(`${canceledGrowth > 0 ? "Incremento" : "Disminución"} de ${Math.abs(canceledGrowth).toFixed(1)}% en citas canceladas respecto a ${otherLabel}.`);
            observations.push(`Los doctores atendieron en promedio ${promedioPorDoctor} citas cada uno en ${col2Label}.`);
        } else if (isGeneral) {
            observations.push(`Se registran ${activeDoctors} doctores activos en el sistema.`);
        }

        const pdf = {
            reportTitle: "Reporte de Doctores",
            periodLabel: formatPeriodLabel(range),
            baselineNote: baselineNote(range),
            isGeneral,
            stats: [
                { label: "Doctores activos", value: String(activeDoctors), diff: null },
                { label: "Citas atendidas", value: String(completedCur), diff: statDiff(completedCur, completedPrev) },
                { label: "Citas canceladas", value: String(cancelledCur), ...statDiffWithTone(cancelledCur, cancelledPrev, "mala") },
                { label: "Promedio por doctor", value: promedioPorDoctor, diff: null },
            ],
            dailySeries: completedSeries,
            dailySeriesLabel: "Citas atendidas por mes",
            typeSeries: [
                { label: TYPE_GENERAL, total: generalCur },
                { label: TYPE_PROCEDURE, total: procedureCur },
            ],
            typeSeriesLabel: isGeneral ? "Atención por tipo" : `Atención por tipo en ${col2Label}`,
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

// GET /api/reports/inventory?dateFrom=&dateTo=&general=true
const USAGE_TYPES = ["Treatment use", "Manual use"];

reportsController.getInventoryReport = async (req, res) => {
    try {
        const range = resolveRange(req.query);
        const { isGeneral, start, end, compareStart, compareEnd } = range;

        const divisor = range.mode === "promedio"
            ? averageMonthCount(range, await earliestDate(movementsModel, "date"))
            : 1;
        const { base, cmpRow, statDiff, col2Label, col3Label } = buildComparisonHelpers(range, divisor);

        const curFilter = dateFilter("date", start, end);
        const prevFilter = isGeneral ? {} : dateFilter("date", compareStart, compareEnd);
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
            buildMonthlySeries(movementsModel, "date", {}),
            buildMonthlySeries(movementsModel, "date", { type: { $in: USAGE_TYPES } }),
            topUsedAgg(curFilter),
            isGeneral ? Promise.resolve([]) : topUsedAgg(prevFilter),
        ]);

        const valorTotal = valorTotalAgg[0]?.total || 0;
        const prevUsedByName = new Map(topUsedPrev.map((u) => [u._id, u.total]));

        const snapshotRow = (proceso, cur, badge) =>
            buildComparativeRow({ proceso, leftValue: cur, rightValue: null, tipo: "al_momento", badge });

        const monthLabelText = isGeneral ? "total histórico" : `en ${col2Label}`;

        const topCards = [
            {
                key: "movimientos",
                title: "Movimientos de inventario",
                stat: String(totalMovCur),
                statLabel: monthLabelText,
                statDiff: statDiff(totalMovCur, totalMovPrev),
                chartData: { "Por mes": movementsSeries },
            },
            {
                key: "usos",
                title: "Productos usados/consumidos",
                stat: String(usageCur),
                statLabel: monthLabelText,
                statDiff: statDiff(usageCur, usagePrev),
                chartType: "bar",
                chartData: { "Por mes": usageSeries },
            },
            {
                key: "mas_usados",
                title: "Productos más utilizados",
                subtitle: isGeneral ? "Basado en las unidades consumidas en todo el histórico" : `Basado en las unidades consumidas en ${col2Label}`,
                listItems: topUsedCur.length ? topUsedCur.map((u) => u._id).filter(Boolean) : ["Sin movimientos registrados"],
                linkLabel: "Ver el inventario",
            },
        ];

        const section = (key, title, icon, rows) => ({ key, title, icon, rows, col2Label, comparisonLabel: col3Label });

        const sections = [
            // El stock es una foto del presente: no se guarda su valor
            // histórico por fecha, así que no hay período con qué compararlo.
            section("estado_general", "Estado general del inventario", "package", [
                snapshotRow("Total de productos registrados", totalProducts),
                snapshotRow("Productos con stock disponible", availableProducts),
                snapshotRow("Productos con stock bajo", lowStockProducts, { label: "Stock bajo", color: "orange" }),
                snapshotRow("Productos agotados", outOfStockProducts, { label: "Agotado", color: "red" }),
            ]),
            section("categorias", "Categorías de productos", "clipboardCheck",
                categoriesAgg.map((c) => snapshotRow(c._id || "Sin categoría", c.count))),
            section("movimientos_detalle", "Movimientos de inventario", "plusCircle", [
                cmpRow("Entradas de stock", entriesCur, entriesPrev, "buena"),
                cmpRow("Usos/salidas registradas", usageCur, usagePrev, "neutra"),
                cmpRow("Ajustes de inventario", adjustmentsCur, adjustmentsPrev, "mala"),
                cmpRow("Total de movimientos registrados", totalMovCur, totalMovPrev, "neutra"),
            ]),
            section("mas_utilizados", "Productos más utilizados", "user",
                topUsedCur.length
                    ? topUsedCur.map((u) => cmpRow(u._id || "Sin nombre", u.total, prevUsedByName.get(u._id) || 0, "neutra"))
                    : [buildComparativeRow({ proceso: "Sin movimientos de uso registrados", leftValue: 0, rightValue: null, tipo: "al_momento" })]),
        ];

        const totalCategoryCount = categoriesAgg.reduce((sum, c) => sum + c.count, 0);
        const serviceTable = categoriesAgg.map((c) => ({
            servicio: c._id || "Sin categoría",
            consultas: c.count,
            pctConsultas: pctOf(c.count, totalCategoryCount),
            ingresos: "—",
            pctIngresos: "—",
            variacion: "—",
            tone: "neutra",
        }));

        const otherLabel = range.mode === "meses" ? col2Label : col3Label;
        const observations = [];
        if (outOfStockProducts > 0) observations.push(`Hay ${outOfStockProducts} producto(s) agotado(s) que requieren reabastecimiento.`);
        if (lowStockProducts > 0) observations.push(`Hay ${lowStockProducts} producto(s) con stock bajo el mínimo configurado.`);
        if (!isGeneral && base(1) !== null) {
            const usageGrowth = growthPct(usageCur, base(usagePrev) || 0);
            if (usageGrowth !== 0) observations.push(`${usageGrowth > 0 ? "Incremento" : "Disminución"} de ${Math.abs(usageGrowth).toFixed(1)}% en el consumo de productos respecto a ${otherLabel}.`);
        }
        if (observations.length === 0) observations.push("No se registran alertas de inventario.");

        const pdf = {
            reportTitle: "Reporte de Inventario",
            periodLabel: formatPeriodLabel(range),
            baselineNote: baselineNote(range),
            isGeneral,
            stats: [
                { label: "Total de productos", value: String(totalProducts), diff: null },
                { label: "Movimientos registrados", value: String(totalMovCur), diff: statDiff(totalMovCur, totalMovPrev) },
                { label: "Productos con alertas", value: String(lowStockProducts + outOfStockProducts), diff: null },
                { label: "Valor total del inventario", value: formatCurrency(valorTotal), diff: null },
            ],
            dailySeries: movementsSeries,
            dailySeriesLabel: "Movimientos por mes",
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
