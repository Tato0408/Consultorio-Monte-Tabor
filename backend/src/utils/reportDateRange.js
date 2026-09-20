// Utilidades compartidas por los endpoints de reportes (citas, pacientes,
// doctores, inventario). El filtro de los reportes trabaja por mes y
// soporta tres modos: "general" (todo el histórico, sin comparación),
// "meses" (dos meses elegidos, se comparan entre sí) y "promedio" (un mes
// contra el promedio por mes de los meses anteriores, posteriores o
// todos).

const MONTH_ABBR = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

// Etiqueta legible de un mes, por ejemplo "mar 2026".
export const monthLabel = (d) => `${MONTH_ABBR[d.getMonth()]} ${d.getFullYear()}`;

const startOfDay = (d) => {
    const copy = new Date(d);
    copy.setHours(0, 0, 0, 0);
    return copy;
};
const endOfDay = (d) => {
    const copy = new Date(d);
    copy.setHours(23, 59, 59, 999);
    return copy;
};

// Primer instante del mes de una fecha.
const monthStartOf = (d) => startOfDay(new Date(d.getFullYear(), d.getMonth(), 1));

// Último instante del mes de una fecha. El día 0 del mes siguiente es el
// último día del mes actual.
const monthEndOf = (d) => endOfDay(new Date(d.getFullYear(), d.getMonth() + 1, 0));

// Devuelve la fecha del primer día del mes desplazado n meses.
const addMonths = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, 1);

// Cantidad de meses (inclusive) entre dos fechas, contando por su mes
// calendario. monthCount(marzo, marzo) es 1.
const monthCount = (a, b) => (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()) + 1;

// Interpreta "YYYY-MM" como año y mes locales y devuelve el primer día de
// ese mes. Devuelve null si el valor no es válido. Mismo cuidado que
// parseDateOnly: construir con el constructor (year, month) evita el
// corrimiento de un día que provoca new Date("YYYY-MM") en zonas detrás
// de UTC.
export const parseMonth = (value) => {
    if (!value) return null;
    const [year, month] = String(value).trim().split("-").map(Number);
    if (!year || !month || month < 1 || month > 12) return null;
    const date = new Date(year, month - 1, 1);
    return isNaN(date.getTime()) ? null : date;
};

// Interpreta "YYYY-MM-DD" como año, mes y día locales. Se conserva para
// buildTimeSeries y otros llamados que aún reciben fechas por día.
export const parseDateOnly = (value) => {
    const datePart = String(value).trim().split("T")[0];
    const [year, month, day] = datePart.split("-").map(Number);
    if (!year || !month || !day) return null;
    const date = new Date(year, month - 1, day);
    return isNaN(date.getTime()) ? null : date;
};

// Fecha centinela para "desde el inicio del histórico". Cubre cualquier
// registro real de la clínica.
const EARLIEST_SENTINEL = new Date(2000, 0, 1);

const AVG_MODES = ["previous", "next", "all"];

const generalRange = () => ({
    mode: "general",
    isGeneral: true,
    start: null, end: null,
    compareStart: null, compareEnd: null,
    avgMode: null,
    variationOf: "right",
    monthA: null, monthB: null,
    col2Label: "Actual",
    col3Label: "Comparación",
});

// A partir de los query params calcula el rango del mes actual y el rango
// con el que se compara. Params: general (true para el histórico), monthA
// y monthB ("YYYY-MM"), avg ("previous" | "next" | "all"). Sin un monthA
// válido, o con general en true, devuelve el modo general (sin
// comparación).
export const resolveRange = ({ general, monthA, monthB, avg }) => {
    const isGeneral = general === "true" || general === true;
    const now = new Date();
    const currentMonth = monthStartOf(now);

    const mA = parseMonth(monthA);
    if (isGeneral || !mA || mA > currentMonth) return generalRange();

    // Modo "mes contra promedio".
    if (avg && AVG_MODES.includes(avg)) {
        let spanStart;
        let spanEnd;
        if (avg === "previous") {
            spanStart = EARLIEST_SENTINEL;
            spanEnd = addMonths(mA, -1);
        } else if (avg === "next") {
            spanStart = addMonths(mA, 1);
            spanEnd = currentMonth;
        } else {
            spanStart = EARLIEST_SENTINEL;
            spanEnd = currentMonth;
        }

        // Sin meses en el tramo (por ejemplo "posteriores" cuando el mes
        // elegido es el mes actual) no hay con qué comparar.
        const hasSpan = monthStartOf(spanStart) <= monthStartOf(spanEnd);
        const avgTextByMode = {
            previous: "meses anteriores",
            next: "meses posteriores",
            all: "todos los meses",
        };

        return {
            mode: "promedio",
            isGeneral: false,
            start: monthStartOf(mA),
            end: endOfDay(mA > currentMonth ? now : monthEndOf(mA)),
            compareStart: hasSpan ? monthStartOf(spanStart) : null,
            compareEnd: hasSpan ? endOfDay(spanEnd > currentMonth ? now : monthEndOf(spanEnd)) : null,
            avgMode: avg,
            variationOf: "left",
            monthA: monthStartOf(mA),
            monthB: null,
            col2Label: monthLabel(mA),
            col3Label: `Promedio (${avgTextByMode[avg]})`,
        };
    }

    // Modo "dos meses".
    const mB = parseMonth(monthB);
    if (!mB || mB > currentMonth || mB.getTime() === mA.getTime()) return generalRange();

    const older = mA < mB ? mA : mB;
    const newer = mA < mB ? mB : mA;

    return {
        mode: "meses",
        isGeneral: false,
        start: monthStartOf(newer),
        end: endOfDay(newer >= currentMonth ? now : monthEndOf(newer)),
        compareStart: monthStartOf(older),
        compareEnd: monthEndOf(older),
        avgMode: null,
        variationOf: "right",
        monthA: monthStartOf(older),
        monthB: monthStartOf(newer),
        col2Label: monthLabel(older),
        col3Label: monthLabel(newer),
    };
};

// Cantidad de meses que abarca el promedio, ya recortada al primer mes
// con registros reales de la clínica (earliestDate). El controller la usa
// como divisor para convertir el total del tramo en un promedio por mes.
// Devuelve 0 cuando el tramo no cubre ningún mes.
export const averageMonthCount = (range, earliestDate) => {
    if (range.mode !== "promedio" || !range.compareStart) return 0;
    let start = range.compareStart;
    if (earliestDate && earliestDate > start) start = earliestDate;
    if (start > range.compareEnd) return 0;
    return Math.max(0, monthCount(monthStartOf(start), monthStartOf(range.compareEnd)));
};

// Construye el filtro Mongo para un campo de fecha dado un rango ya
// resuelto (o {} si no hay rango).
export const dateFilter = (field, start, end) => {
    if (!start || !end) return {};
    return { [field]: { $gte: start, $lte: end } };
};

// Diferencia porcentual entre el valor actual y el anterior, redondeada a
// 1 decimal. Si el anterior es 0, reporta 100% si ahora hay algo o 0% si
// tampoco (evita dividir por cero). Se usa en las observaciones del PDF.
export const growthPct = (current, prev) => {
    if (!prev) return current > 0 ? 100 : 0;
    return Number((((current - prev) / prev) * 100).toFixed(1));
};

// Formatea una variación numérica (%) como "+18.1%", "-26.3%", "0.0%".
export const formatVariation = (pct) => {
    const sign = pct > 0 ? "+" : "";
    return `${sign}${pct.toFixed(1)}%`;
};

// Fecha más antigua registrada en un modelo para un campo dado. La usan
// buildMonthlySeries (para saber desde cuándo graficar) y el controller
// (para acotar el divisor del promedio).
export const earliestDate = async (Model, field, baseMatch = {}) => {
    const doc = await Model.findOne(baseMatch).sort({ [field]: 1 }).select(field).lean();
    return doc ? new Date(doc[field]) : null;
};

// Serie mensual de conteos para los gráficos de las tarjetas: un punto por
// mes desde el registro más antiguo hasta hoy, acotada a los últimos 24
// meses para que el gráfico se mantenga legible.
export const buildMonthlySeries = async (Model, field, baseMatch = {}) => {
    const earliest = await earliestDate(Model, field, baseMatch);
    const end = endOfDay(new Date());
    const start = earliest ? startOfDay(earliest) : end;

    const months = [];
    let cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    const lastMonth = new Date(end.getFullYear(), end.getMonth(), 1);
    while (cursor <= lastMonth) {
        months.push(new Date(cursor));
        cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }
    const capped = months.slice(-24);

    const counts = await Promise.all(
        capped.map((monthStart) => {
            const monthEnd = endOfDay(new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0));
            return Model.countDocuments({ ...baseMatch, [field]: { $gte: monthStart, $lte: monthEnd } });
        })
    );
    return capped.map((monthStart, i) => ({ label: monthLabel(monthStart), total: counts[i] }));
};

// Tono de color de una variación según su dirección y la polaridad de la
// métrica. "buena" si el cambio favorece a la clínica, "mala" si la
// perjudica, "neutra" si no hay un sentido claro o el cambio es cero.
const toneFor = (delta, polarity) => {
    if (polarity === "neutra" || delta === 0) return "neutra";
    const isGood = delta > 0 ? polarity === "buena" : polarity === "mala";
    return isGood ? "buena" : "mala";
};

// Traduce una comparación a los textos que ve el usuario:
// { anterior, variacion, tone }. tipo decide el formato:
//   "flujo"      conteos, la variación va como "+12 (+8%)" o "≈ igual"
//   "tasa"       porcentajes, la variación va en puntos: "+2.7 pp"
//   "al_momento" foto del presente sin comparación: "dato al momento" / "—"
// polarity ("buena" | "mala" | "neutra") decide el color.
export const describeChange = (current, baseline, { tipo = "flujo", polarity = "buena" } = {}) => {
    if (tipo === "al_momento") {
        return { anterior: "dato al momento", variacion: "—", tone: "neutra" };
    }
    if (current === null || current === undefined || baseline === null || baseline === undefined) {
        return { anterior: "—", variacion: "—", tone: "neutra" };
    }

    if (tipo === "tasa") {
        const diff = Number((current - baseline).toFixed(1));
        if (Math.abs(diff) < 0.1) {
            return { anterior: `${baseline.toFixed(1)}%`, variacion: "≈ igual", tone: "neutra" };
        }
        return {
            anterior: `${baseline.toFixed(1)}%`,
            variacion: `${diff > 0 ? "+" : "-"}${Math.abs(diff).toFixed(1)} pp`,
            tone: toneFor(diff, polarity),
        };
    }

    const base = Math.round(baseline);
    const value = Math.round(current);
    const delta = value - base;

    if (base === 0) {
        return value > 0
            ? { anterior: "0", variacion: `+${value} (nuevo)`, tone: toneFor(1, polarity) }
            : { anterior: "0", variacion: "≈ igual", tone: "neutra" };
    }

    const pct = Number(((delta / base) * 100).toFixed(1));
    if (Math.abs(pct) < 5) {
        return { anterior: String(base), variacion: "≈ igual", tone: "neutra" };
    }
    return {
        anterior: String(base),
        variacion: `${delta > 0 ? "+" : "-"}${Math.abs(delta)} (${delta > 0 ? "+" : "-"}${Math.abs(pct)}%)`,
        tone: toneFor(delta, polarity),
    };
};

// Fila de las tablas comparativas. leftValue va en la columna izquierda
// (col2, el mes más antiguo o el mes elegido) y rightValue en la del
// medio (col3, el mes más reciente o el promedio). variationOf indica de
// qué lado se reporta la variación: "right" (mes más reciente vs el más
// antiguo) o "left" (mes elegido vs promedio). rightValue null deja la
// comparación en "—" (modo general).
export const buildComparativeRow = ({
    proceso,
    badge,
    leftValue,
    rightValue,
    variationOf = "right",
    tipo = "flujo",
    polarity = "buena",
    format,
}) => {
    const fmt = (v) => {
        if (v === null || v === undefined) return "—";
        if (format) return format(v);
        return tipo === "tasa" ? `${Number(v).toFixed(1)}%` : String(Math.round(v));
    };

    const current = variationOf === "right" ? rightValue : leftValue;
    const other = variationOf === "right" ? leftValue : rightValue;
    const change = describeChange(current, other, { tipo, polarity });

    return {
        proceso,
        ...(badge ? { badge } : {}),
        actual: fmt(leftValue),
        anterior: tipo === "al_momento" ? "dato al momento" : fmt(rightValue),
        variacion: change.variacion,
        tone: change.tone,
    };
};

// Porcentaje que representa part sobre whole, como string ("12.3%").
// Devuelve "0.0%" si whole es 0.
export const pctOf = (part, whole) => (whole > 0 ? `${((part / whole) * 100).toFixed(1)}%` : "0.0%");

// Formato de moneda usado en los reportes: "$1,234.56".
export const formatCurrency = (n) =>
    `$${(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Formatea una fecha como "YYYY-MM" con sus componentes locales.
const toMonthString = (d) => {
    if (!d) return null;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

// Etiqueta de la columna de comparación de las tablas (col3).
export const comparisonLabel = (range) => range.col3Label;

// Frase que explica la comparación, para el encabezado del PDF y la
// pantalla. En modo general no aplica.
export const baselineNote = (range) => {
    if (range.mode === "meses") {
        return `Compara ${monthLabel(range.monthA)} con ${monthLabel(range.monthB)}.`;
    }
    if (range.mode === "promedio") {
        const texto = {
            previous: "los meses anteriores",
            next: "los meses posteriores",
            all: "todos los meses",
        }[range.avgMode];
        return `Compara ${monthLabel(range.monthA)} con el promedio por mes de ${texto}.`;
    }
    return null;
};

// Resumen del rango resuelto para que el frontend sincronice sus
// selectores de mes con lo que el backend realmente usó.
export const rangeMeta = (range) => ({
    mode: range.mode,
    isGeneral: range.isGeneral,
    monthA: toMonthString(range.monthA),
    monthB: toMonthString(range.monthB),
    avgMode: range.avgMode,
    col2Label: range.col2Label,
    col3Label: range.col3Label,
    comparisonLabel: range.col3Label,
    baselineNote: baselineNote(range),
});

// Etiqueta legible del período, usada en el encabezado del PDF.
export const formatPeriodLabel = (range) => {
    if (range.mode === "meses") {
        return `${monthLabel(range.monthA)} comparado con ${monthLabel(range.monthB)}`;
    }
    if (range.mode === "promedio") {
        const texto = {
            previous: "los meses anteriores",
            next: "los meses posteriores",
            all: "todos los meses",
        }[range.avgMode];
        return `${monthLabel(range.monthA)} comparado con el promedio de ${texto}`;
    }
    return "Histórico general (todos los registros)";
};
