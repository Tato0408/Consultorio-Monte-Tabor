// Utilidades compartidas por la pantalla de disponibilidad: conversion entre
// el modelo guardado (weekly_availability con time_blocks y breaks en formato
// "HH:mm") y la cuadricula semanal que se puede pintar, mas el calculo de los
// horarios que vera el paciente y el resumen del estado para el encabezado.

// La cuadricula pinta en pasos de 30 minutos. Es la duracion de referencia de
// una Consulta Medica General; un procedimiento define su propia duracion al
// agendar (ver scheduleController.getAvailableSlots y SchedulePreview previo).
export const ROW_MINUTES = 30;

// Ventana horaria por defecto de la cuadricula: de 06:00 a 21:00.
const DEFAULT_START_MIN = 6 * 60;
const DEFAULT_ROW_COUNT = 30;

// Convierte "HH:mm" a minutos desde medianoche. Devuelve null si no es una
// hora valida.
export const timeToMin = (hhmm) => {
    if (typeof hhmm !== "string") return null;
    const parts = hhmm.split(":");
    if (parts.length !== 2) return null;
    const h = Number(parts[0]);
    const m = Number(parts[1]);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
    return h * 60 + m;
};

// Convierte minutos desde medianoche a "HH:mm".
export const minToTime = (min) => {
    const clamped = Math.max(0, Math.min(24 * 60, Math.round(min)));
    const h = Math.floor(clamped / 60);
    const m = clamped % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

// Indica si dos rangos en minutos se solapan.
const overlaps = (aStart, aEnd, bStart, bEnd) => aStart < bEnd && aEnd > bStart;

// Calcula la ventana de la cuadricula: por defecto 06:00 a 21:00, pero se
// expande en pasos de una hora si algun bloque o pausa cae fuera, para que
// nada quede oculto al abrir el modo Calendario.
export const computeGridWindow = (weeklyAvailability = [], breaks = []) => {
    let minStart = DEFAULT_START_MIN;
    let maxEnd = DEFAULT_START_MIN + DEFAULT_ROW_COUNT * ROW_MINUTES;

    const consider = (startStr, endStr) => {
        const s = timeToMin(startStr);
        const e = timeToMin(endStr);
        if (s == null || e == null || e <= s) return;
        if (s < minStart) minStart = Math.floor(s / 60) * 60;
        if (e > maxEnd) maxEnd = Math.ceil(e / 60) * 60;
    };

    for (const day of weeklyAvailability) {
        for (const block of day?.time_blocks || []) consider(block.start_time, block.end_time);
    }
    for (const brk of breaks) consider(brk.start_time, brk.end_time);

    const startMin = Math.max(0, minStart);
    const rowCount = Math.max(DEFAULT_ROW_COUNT, Math.ceil((maxEnd - startMin) / ROW_MINUTES));
    return { startMin, rowCount };
};

// Devuelve, por fila de la cuadricula de un dia, el tipo de celda:
// null (libre), "avail" (dentro de un bloque de atencion) o "break" (dentro
// de una pausa). La pausa se pinta encima de la disponibilidad.
export const dayCellKinds = (dayAvailability, dayBreaks = [], startMin, rowCount) => {
    const kinds = new Array(rowCount).fill(null);
    if (!dayAvailability?.is_available) return kinds;

    const blocks = (dayAvailability.time_blocks || [])
        .map((b) => [timeToMin(b.start_time), timeToMin(b.end_time)])
        .filter(([s, e]) => s != null && e != null && e > s);
    const pauses = dayBreaks
        .map((b) => [timeToMin(b.start_time), timeToMin(b.end_time)])
        .filter(([s, e]) => s != null && e != null && e > s);

    for (let r = 0; r < rowCount; r++) {
        const cellStart = startMin + r * ROW_MINUTES;
        const cellEnd = cellStart + ROW_MINUTES;
        const inBlock = blocks.some(([s, e]) => overlaps(cellStart, cellEnd, s, e));
        if (!inBlock) continue;
        const inPause = pauses.some(([s, e]) => overlaps(cellStart, cellEnd, s, e));
        kinds[r] = inPause ? "break" : "avail";
    }
    return kinds;
};

// Reconstruye los datos de un dia a partir de sus celdas pintadas. Cada tramo
// contiguo pintado (avail o break) es un time_block; los tramos contiguos de
// tipo "break" pasan a la lista de pausas. Todo queda alineado al paso de la
// cuadricula. breaks se devuelve sin el campo day, lo agrega quien llama.
export const cellsToDay = (kinds, startMin) => {
    const timeBlocks = [];
    const dayBreaks = [];
    const rowTime = (r) => minToTime(startMin + r * ROW_MINUTES);

    let r = 0;
    while (r < kinds.length) {
        if (kinds[r] == null) { r++; continue; }
        const runStart = r;
        while (r < kinds.length && kinds[r] != null) r++;
        timeBlocks.push({ start_time: rowTime(runStart), end_time: rowTime(r) });
    }

    let b = 0;
    while (b < kinds.length) {
        if (kinds[b] !== "break") { b++; continue; }
        const runStart = b;
        while (b < kinds.length && kinds[b] === "break") b++;
        dayBreaks.push({ start_time: rowTime(runStart), end_time: rowTime(b) });
    }

    return {
        is_available: timeBlocks.length > 0,
        time_blocks: timeBlocks,
        breaks: dayBreaks,
    };
};

// Alterna una celda de la cuadricula segun el modo de pintado y devuelve el
// arreglo de tipos actualizado. En modo "avail": pinta o borra disponibilidad.
// En modo "break": una celda con disponibilidad pasa a pausa y viceversa. Una
// celda libre no hace nada (una pausa solo existe dentro del horario).
export const toggleCell = (kinds, row, paintMode) => {
    const next = kinds.slice();
    const cur = next[row];
    if (paintMode === "avail") {
        next[row] = cur === "avail" ? null : "avail";
    } else {
        if (cur === "break") next[row] = "avail";
        else if (cur === "avail") next[row] = "break";
    }
    return next;
};

// Genera los horarios que puede solicitar el paciente para un dia, con la
// misma logica que scheduleController.getAvailableSlots del backend: duracion
// fija mas el espacio de buffer entre bloques, saltando los descansos.
// Movida sin cambios desde SchedulePreview.jsx.
export const generateDaySlots = (dayConfig, breaks, bufferTime, duration = 30) => {
    if (!dayConfig?.is_available) return [];
    const slots = [];
    for (const block of dayConfig.time_blocks || []) {
        const start = timeToMin(block.start_time);
        const end = timeToMin(block.end_time);
        if (start == null || end == null) continue;
        let cur = start;
        while (cur + duration <= end) {
            const slotEnd = cur + duration;
            const inBreak = (breaks || []).some((br) => {
                if (br.day !== dayConfig.day) return false;
                const bs = timeToMin(br.start_time);
                const be = timeToMin(br.end_time);
                if (bs == null || be == null) return false;
                return cur < be && slotEnd > bs;
            });
            if (!inBreak) slots.push({ start: cur, end: slotEnd });
            cur += duration + (bufferTime || 0);
        }
    }
    return slots;
};

// Da formato de 12 horas ("08:00 AM") a un valor en minutos.
export const formatSlot12 = (mins) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    const ampm = h >= 12 ? "PM" : "AM";
    return `${String(h % 12 || 12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`;
};

const DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

// Une dias consecutivos en un rango legible ("Lunes a Viernes"), y deja el
// resto como lista separada por comas.
const joinDayLabels = (indexes) => {
    if (indexes.length === 0) return "";
    const sorted = [...indexes].sort((a, b) => a - b);
    if (sorted.length === 1) return DAY_NAMES[sorted[0]];
    const consecutive = sorted.every((v, i) => i === 0 || v === sorted[i - 1] + 1);
    if (consecutive) return `${DAY_NAMES[sorted[0]]} a ${DAY_NAMES[sorted[sorted.length - 1]]}`;
    return sorted.map((i) => DAY_NAMES[i]).join(", ");
};

// El horario mas frecuente entre los dias disponibles, para el resumen del
// encabezado ("de 08:00 a 17:00").
const commonHoursLabel = (weeklyAvailability) => {
    const spans = weeklyAvailability
        .filter((d) => d.is_available && (d.time_blocks || []).length)
        .map((d) => {
            const starts = d.time_blocks.map((b) => timeToMin(b.start_time)).filter((v) => v != null);
            const ends = d.time_blocks.map((b) => timeToMin(b.end_time)).filter((v) => v != null);
            if (!starts.length || !ends.length) return null;
            return `${minToTime(Math.min(...starts))} a ${minToTime(Math.max(...ends))}`;
        })
        .filter(Boolean);
    if (!spans.length) return "";
    const counts = {};
    for (const s of spans) counts[s] = (counts[s] || 0) + 1;
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
};

// Devuelve la excepcion futura mas cercana, ya con una etiqueta lista para
// mostrar.
const nextExceptionLabel = (exceptions = []) => {
    const todayStr = (() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    })();
    const toDateStr = (v) => (typeof v === "string" ? v.split("T")[0] : "");
    const typeLabels = {
        non_working: "Día no laborable",
        special_hours: "Horario especial",
        vacation: "Vacaciones",
        other: "Día especial",
    };
    const upcoming = exceptions
        .map((ex) => ({ ...ex, startStr: toDateStr(ex.date), endStr: toDateStr(ex.end_date) }))
        .filter((ex) => ex.startStr && (ex.endStr || ex.startStr) >= todayStr)
        .sort((a, b) => a.startStr.localeCompare(b.startStr))[0];
    if (!upcoming) return "";
    const fmt = (s) => {
        const [y, m, d] = s.split("-");
        return `${d}/${m}/${y}`;
    };
    const label = upcoming.type === "other" ? (upcoming.custom_type || typeLabels.other) : typeLabels[upcoming.type];
    const range = upcoming.endStr ? `${fmt(upcoming.startStr)} al ${fmt(upcoming.endStr)}` : fmt(upcoming.startStr);
    return `${label}: ${range}`;
};

// Resumen del estado del horario para el encabezado de la pantalla.
export const summarizeSchedule = (weeklyAvailability = [], breaks = [], exceptions = []) => {
    const activeDays = weeklyAvailability
        .filter((d) => d.is_available && (d.time_blocks || []).length)
        .map((d) => d.day);
    const anyDay = activeDays.length > 0;
    const pauseLabel = breaks.length
        ? `pausa de ${breaks[0].start_time} a ${breaks[0].end_time}`
        : "";
    return {
        anyDay,
        daysLabel: joinDayLabels(activeDays),
        hoursLabel: commonHoursLabel(weeklyAvailability),
        pauseLabel,
        nextException: nextExceptionLabel(exceptions),
    };
};

export const DAY_NAMES_FULL = DAY_NAMES;
export const DAY_NAMES_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
