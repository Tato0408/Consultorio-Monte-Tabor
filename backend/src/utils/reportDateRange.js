// Utilidades compartidas por los endpoints de reportes (citas,
// pacientes, doctores, inventario). Todas soportan dos modos: rango de
// fechas (dateFrom y dateTo) o "general" (todo el histórico).

const MONTH_ABBR = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export const dayLabel = (d) => `${String(d.getDate()).padStart(2, "0")} ${MONTH_ABBR[d.getMonth()]}`;
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

// Interpreta "YYYY-MM-DD" como año, mes y día locales. new
// Date("YYYY-MM-DD") a secas se interpreta como medianoche UTC, y luego
// setHours() y getMonth() la leen en hora local. En zonas horarias
// detrás de UTC (como esta) eso corre la fecha un día hacia atrás.
// Construir la fecha con el constructor (year, month, day) evita ese
// corrimiento (mismo ajuste aplicado en backend/src/utils/validators.js
// para las fechas de nacimiento).
const parseDateOnly = (value) => {
    const datePart = String(value).trim().split("T")[0];
    const [year, month, day] = datePart.split("-").map(Number);
    if (!year || !month || !day) return null;
    const date = new Date(year, month - 1, day);
    return isNaN(date.getTime()) ? null : date;
};

// Fecha centinela para "sin límite inferior" cuando el usuario deja
// dateFrom vacío pero sí puso dateTo. Coincide con el mínimo permitido
// en los inputs de fecha del frontend (ReportHeader.jsx, MIN_DATE_STR),
// así que en la práctica cubre cualquier registro real.
const EARLIEST_SENTINEL = new Date(2000, 0, 1);

// A partir de los query params (dateFrom, dateTo, general) calcula el
// rango actual y el período anterior equivalente (misma duración,
// inmediatamente antes) para las comparaciones de variación. Si general
// viene en true, no hay filtro de fecha ni período anterior.
//
// dateFrom y dateTo son cada uno independientemente opcionales, no hace
// falta mandar los dos. Si solo viene dateFrom, el rango va desde ahí
// hasta hoy. Si solo viene dateTo, el rango va desde el inicio
// (EARLIEST_SENTINEL) hasta ahí. Si no viene ninguno de los dos y
// general no es true, el rango también va desde el inicio hasta hoy,
// equivalente en la práctica al modo general pero con período anterior
// calculado, que queda vacío y sin datos porque cae antes de
// EARLIEST_SENTINEL.
export const resolveRange = ({ dateFrom, dateTo, general }) => {
    const isGeneral = general === "true" || general === true;

    if (isGeneral) {
        return { isGeneral: true, start: null, end: null, prevStart: null, prevEnd: null };
    }

    // No tiene sentido pedir datos de una fecha que todavía no ha
    // pasado. El frontend ya lo bloquea (ReportHeader.jsx, max={hoy}),
    // pero se vuelve a exigir aquí por si la petición no vino de ahí.
    // Una fecha futura, o inválida, se trata igual que si no se hubiera
    // mandado.
    const now = new Date();
    const parsedFrom = dateFrom ? parseDateOnly(dateFrom) : null;
    const parsedTo = dateTo ? parseDateOnly(dateTo) : null;

    const end = endOfDay(parsedTo && parsedTo <= now ? parsedTo : now);
    const start = startOfDay(parsedFrom && parsedFrom <= now ? parsedFrom : EARLIEST_SENTINEL);

    const rangeMs = end.getTime() - start.getTime();
    const prevEnd = endOfDay(new Date(start.getTime() - 1));
    const prevStart = startOfDay(new Date(prevEnd.getTime() - rangeMs));

    return { isGeneral: false, start, end, prevStart, prevEnd };
};

// Construye el filtro Mongo para un campo de fecha dado un rango ya
// resuelto (o {} si es general).
export const dateFilter = (field, start, end) => {
    if (!start || !end) return {};
    return { [field]: { $gte: start, $lte: end } };
};

// Diferencia porcentual entre el valor actual y el anterior, redondeada
// a 1 decimal. Si no había datos en el período anterior, se reporta
// 100% de crecimiento si ahora sí hay, o 0% si tampoco hay ahora (evita
// división por cero).
export const growthPct = (current, prev) => {
    if (!prev) return current > 0 ? 100 : 0;
    return Number((((current - prev) / prev) * 100).toFixed(1));
};

// Formatea una variación numérica (%) al formato usado en las tablas de
// la UI: "+18.1%", "-26.3%", "0.0%".
export const formatVariation = (pct) => {
    const sign = pct > 0 ? "+" : "";
    return `${sign}${pct.toFixed(1)}%`;
};

// Encuentra la fecha más antigua de un modelo (para acotar el rango del
// modo "general").
const earliestDate = async (Model, field, baseMatch = {}) => {
    const doc = await Model.findOne(baseMatch).sort({ [field]: 1 }).select(field).lean();
    return doc ? new Date(doc[field]) : null;
};

// Construye una serie temporal (para gráficos de línea o de barra)
// contando documentos de Model, agrupados por día si el rango es de 31
// días o menos, o por mes si es mayor, o si está en modo general. En
// modo general el rango va desde el registro más antiguo hasta hoy.
export const buildTimeSeries = async (Model, field, baseMatch, range) => {
    let { start, end } = range;

    if (range.isGeneral) {
        const earliest = await earliestDate(Model, field, baseMatch);
        end = endOfDay(new Date());
        start = earliest ? startOfDay(earliest) : end;
    }

    const spanDays = Math.max(1, Math.round((end - start) / 86400000));

    if (spanDays <= 31) {
        const buckets = [];
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            buckets.push(new Date(d));
        }
        const counts = await Promise.all(
            buckets.map((day) =>
                Model.countDocuments({ ...baseMatch, [field]: { $gte: startOfDay(day), $lte: endOfDay(day) } })
            )
        );
        return buckets.map((day, i) => ({ label: dayLabel(day), total: counts[i] }));
    }

    // Bucketing mensual, acotado a los últimos 24 meses para que el
    // gráfico se mantenga legible.
    const months = [];
    let cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    const lastMonth = new Date(end.getFullYear(), end.getMonth(), 1);
    while (cursor <= lastMonth) {
        months.push(new Date(cursor));
        cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }
    const cappedMonths = months.slice(-24);

    const counts = await Promise.all(
        cappedMonths.map((monthStart) => {
            const monthEnd = endOfDay(new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0));
            return Model.countDocuments({ ...baseMatch, [field]: { $gte: monthStart, $lte: monthEnd } });
        })
    );
    return cappedMonths.map((monthStart, i) => ({ label: monthLabel(monthStart), total: counts[i] }));
};

// Fila estándar de las tablas: columnas "Proceso a comparar", "Actual",
// "Período Anterior" y "Variación". En modo general no hay período
// anterior, así que se muestra "—" en vez de inventar un dato.
export const buildRow = (proceso, actual, anterior, isGeneral, badge) => ({
    proceso,
    ...(badge ? { badge } : {}),
    actual: String(actual),
    anterior: isGeneral ? "—" : String(anterior),
    variacion: isGeneral ? "—" : formatVariation(growthPct(actual, anterior)),
});

// Porcentaje que representa part sobre whole, como string (por ejemplo
// "12.3%"). Devuelve "0.0%" si whole es 0.
export const pctOf = (part, whole) => (whole > 0 ? `${((part / whole) * 100).toFixed(1)}%` : "0.0%");

// Formato de moneda usado en toda la app para reportes: "$1,234.56"
export const formatCurrency = (n) =>
    `$${(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Formatea una fecha como "YYYY-MM-DD" usando sus componentes locales
// (no toISOString, que convierte a UTC primero y puede correr la fecha
// un día en zonas horarias detrás de UTC).
const toDateOnlyString = (d) => {
    if (!d) return null;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
};

// Resumen del rango resuelto en formato simple (YYYY-MM-DD), para que
// el frontend pueda sincronizar sus inputs de fecha con el rango que
// realmente se usó (por ejemplo cuando no se mandaron dateFrom ni
// dateTo y el backend aplicó el valor por defecto de mes actual).
export const rangeMeta = (range) => ({
    isGeneral: range.isGeneral,
    dateFrom: toDateOnlyString(range.start),
    dateTo: toDateOnlyString(range.end),
});

// Etiqueta legible del período actual, usada en el encabezado del PDF
// ("Período: ...").
export const formatPeriodLabel = (range) => {
    if (range.isGeneral) return "Histórico general (todos los registros)";
    const fmt = (d) => `${String(d.getDate()).padStart(2, "0")} de ${monthLabel(d)}`;
    return `${fmt(range.start)} - ${fmt(range.end)}`;
};
