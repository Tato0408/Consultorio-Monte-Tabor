import nurseScheduleModel from "../../models/schedule/nurseSchedule.js";
import nursesModel from "../../models/nurses/nurses.js";
import appointmentsModel from "../../models/appointments/appointments.js";
import { toMins, minsToStr, tileFreeSlots, resolveDurationMinutes, getSpecialHoursRange, MIN_BOOKING_LEAD_MINUTES } from "./scheduleController.js";
import { OCCUPYING_STATUSES } from "../../utils/appointmentStatus.js";

const nurseScheduleController = {};

// Una enfermera solo puede ver/editar SU PROPIO horario, nunca el de otra — antes solo
// se verificaba el rol, cualquier enfermera autenticada podía sobrescribir el horario de
// otra con solo cambiar el :nurseId de la URL. El admin queda exento.
const ownsSchedule = (req) => req.user.role === "admin" || req.params.nurseId === req.user.id;

// GET /api/nurse-schedule/:nurseId, igual que scheduleController.getSchedule
// pero para enfermeras.
// Solo la propia enfermera o un admin pueden consultarlo o editarlo
// (mismo criterio que appointmentsController.getNursesForAcceptance
// usa para el catálogo de enfermeras).
nurseScheduleController.getSchedule = async (req, res) => {
    try {
        if (!["nurse", "admin"].includes(req.user.role)) {
            return res.status(403).json({ message: "No tienes permiso para consultar este horario." });
        }
        if (!ownsSchedule(req)) {
            return res.status(403).json({ message: "Solo puedes consultar tu propio horario." });
        }
        const schedule = await nurseScheduleModel.findOne({ nurse_id: req.params.nurseId });
        if (!schedule) return res.status(404).json({ message: "Horario no configurado aún" });
        return res.status(200).json(schedule);
    } catch (error) {
        return res.status(500).json({ message: "Error al obtener el horario", error: error.message });
    }
};

// PUT /api/nurse-schedule/:nurseId, crea o actualiza el horario (upsert).
nurseScheduleController.saveSchedule = async (req, res) => {
    try {
        if (!["nurse", "admin"].includes(req.user.role)) {
            return res.status(403).json({ message: "No tienes permiso para editar este horario." });
        }
        if (!ownsSchedule(req)) {
            return res.status(403).json({ message: "Solo puedes editar tu propio horario." });
        }
        const { nurseId } = req.params;
        const data = req.body;

        const schedule = await nurseScheduleModel.findOneAndUpdate(
            { nurse_id: nurseId },
            { ...data, nurse_id: nurseId },
            { new: true, upsert: true, runValidators: true }
        );

        return res.status(200).json({ message: "Horario guardado correctamente", schedule });
    } catch (error) {
        return res.status(500).json({ message: "Error al guardar el horario", error: error.message });
    }
};

// Helper interno (no es una ruta HTTP): dado un rango horario ya
// definido para una cita (start_time y end_time, calculados a partir
// del doctor y el procedimiento), indica si una enfermera tiene
// horario configurado que cubra ese rango, sin descansos ni otra
// cita ya asignada en ese momento. Lo usa
// appointmentsController.getNursesForAcceptance para filtrar el
// catálogo. excludeAppointmentId se pasa al editar una cita ya
// existente, para que la propia enfermera asignada no choque contra
// la misma cita que se está editando.
export const isNurseAvailable = async (nurseId, date, start_time, end_time, appointmentsModel, excludeAppointmentId) => {
    const schedule = await nurseScheduleModel.findOne({ nurse_id: nurseId }).lean();
    if (!schedule) return false;

    const [yr, mo, dy] = date.split("-").map(Number);
    const dayOfWeek = new Date(yr, mo - 1, dy).getDay();

    // Antes esta función nunca consultaba schedule.exceptions (a diferencia de
    // isSlotFreeForNurse, ver comentario de esa función): una enfermera con vacaciones o
    // un día no laborable registrado para hoy podía igual aparecer como "disponible" en
    // el catálogo de enfermera de apoyo, y anyNurseAvailable podía reportar "sí hay
    // alguna libre" contando a alguien que en realidad no está disponible ese día.
    const toDateStr = (d) => {
        if (!d) return "";
        if (typeof d === "string") return d.split("T")[0];
        return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
    };
    const exception = (schedule.exceptions || []).find((ex) => {
        if (ex.end_date) return date >= toDateStr(ex.date) && date <= toDateStr(ex.end_date);
        return toDateStr(ex.date) === date;
    });
    if (exception && exception.type !== "special_hours") return false;

    const dayConfig = schedule.weekly_availability?.find((d) => d.day === dayOfWeek);
    if (!dayConfig?.is_available) return false;

    const start = toMins(start_time);
    const end = toMins(end_time);

    // Un horario especial con rango propio reemplaza los bloques normales del día.
    const specialRange = getSpecialHoursRange(exception);
    const timeBlocks = specialRange ? [specialRange] : (dayConfig.time_blocks || []);

    const coversRange = timeBlocks.some((b) => toMins(b.start_time) <= start && toMins(b.end_time) >= end);
    if (!coversRange) return false;

    const onBreak = (schedule.breaks || []).some((br) =>
        br.day === dayOfWeek && start < toMins(br.end_time) && end > toMins(br.start_time)
    );
    if (onBreak) return false;

    const dayStart = new Date(`${date}T00:00:00.000Z`);
    const dayEnd = new Date(`${date}T23:59:59.999Z`);
    const sameDayAppointments = await appointmentsModel.find({
        nurse_id: nurseId,
        date: { $gte: dayStart, $lte: dayEnd },
        status: { $in: OCCUPYING_STATUSES },
        ...(excludeAppointmentId ? { _id: { $ne: excludeAppointmentId } } : {}),
    }).select({ start_time: 1, end_time: 1 });

    const isBooked = sameDayAppointments.some((a) =>
        a.start_time && a.end_time && start < toMins(a.end_time) && end > toMins(a.start_time)
    );
    if (isBooked) return false;

    return true;
};

// Indica si HAY alguna enfermera activa libre para un horario puntual (sin importar
// cuál), sin revelar quién. Se usa para permitir aceptar/agendar una cita de un
// procedimiento con doctor + enfermera de apoyo sin asignar enfermera todavía, SOLO
// cuando de verdad no hay ninguna disponible (ver confirm_no_nurse en
// appointmentsController.js): evita que ese "continuar sin enfermera" sirva para
// saltarse la asignación cuando en realidad sí hay alguna libre.
export const anyNurseAvailable = async (date, start_time, end_time, excludeAppointmentId) => {
    const activeNurses = await nursesModel.find({ is_active: true }).select("_id").lean();
    const availability = await Promise.all(
        activeNurses.map((n) => isNurseAvailable(n._id, date, start_time, end_time, appointmentsModel, excludeAppointmentId))
    );
    return availability.some(Boolean);
};

// Revalida si un horario puntual sigue libre para una enfermera: mismo criterio que
// isSlotFreeForDoctor (scheduleController.js), incluyendo excepciones (vacaciones, día no
// laborable) y el buffer_time entre citas — este último es lo único que isNurseAvailable
// (arriba, que ya comparte el chequeo de excepciones con esta función) no evalúa. Se usa
// al aceptar/asignar una cita a una enfermera como proveedora principal (procedimiento sin
// doctor), no para el catálogo de "enfermera de apoyo" que sigue usando isNurseAvailable.
export const isSlotFreeForNurse = async (nurseId, date, start_time, end_time, appointmentsModel, excludeAppointmentId) => {
    const schedule = await nurseScheduleModel.findOne({ nurse_id: nurseId });
    if (!schedule) return { free: false, reason: "La enfermera no tiene un horario configurado." };

    const [yr, mo, dy] = date.split("-").map(Number);
    const dayOfWeek = new Date(yr, mo - 1, dy).getDay();

    const toDateStr = (d) => {
        if (!d) return "";
        if (typeof d === "string") return d.split("T")[0];
        return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
    };
    const exception = (schedule.exceptions || []).find((ex) => {
        if (ex.end_date) return date >= toDateStr(ex.date) && date <= toDateStr(ex.end_date);
        return toDateStr(ex.date) === date;
    });
    if (exception && exception.type !== "special_hours") {
        return { free: false, reason: "Ese día no es laborable para la enfermera." };
    }

    const dayConfig = schedule.weekly_availability?.find((d) => d.day === dayOfWeek);
    if (!dayConfig || !dayConfig.is_available) {
        return { free: false, reason: "La enfermera no atiende ese día." };
    }

    const start = toMins(start_time);
    const end = toMins(end_time);

    // Si ese día tiene declarado un horario especial con rango propio, el
    // horario solicitado debe caer completo dentro de ese rango.
    const specialRange = getSpecialHoursRange(exception);
    if (specialRange) {
        const rangeStart = toMins(specialRange.start_time);
        const rangeEnd = toMins(specialRange.end_time);
        if (start < rangeStart || end > rangeEnd) {
            return {
                free: false,
                reason: `Ese día el horario especial es de ${specialRange.start_time} a ${specialRange.end_time}.`,
            };
        }
    }

    const inBreak = (schedule.breaks || []).some((br) => {
        if (br.day !== dayOfWeek) return false;
        return start < toMins(br.end_time) && end > toMins(br.start_time);
    });
    if (inBreak) {
        return { free: false, reason: "Ese horario cae dentro de un descanso de la enfermera." };
    }

    const dayStart = new Date(`${date}T00:00:00.000Z`);
    const dayEnd = new Date(`${date}T23:59:59.999Z`);
    const existingAppointments = await appointmentsModel.find({
        nurse_id: nurseId,
        date: { $gte: dayStart, $lte: dayEnd },
        status: { $in: OCCUPYING_STATUSES },
        ...(excludeAppointmentId ? { _id: { $ne: excludeAppointmentId } } : {}),
    }).select({ start_time: 1, end_time: 1 });

    const bufferMin = schedule.buffer_time || 0;
    const conflict = existingAppointments.some((a) => {
        if (!a.start_time || !a.end_time) return false;
        const aStart = toMins(a.start_time);
        const aEnd = toMins(a.end_time);
        return !(end + bufferMin <= aStart || aEnd + bufferMin <= start);
    });
    if (conflict) {
        return {
            free: false,
            reason: bufferMin > 0
                ? `Ese horario no deja los ${bufferMin} minutos de espacio requeridos entre citas.`
                : "Ya existe otra cita en ese horario.",
        };
    }

    return { free: true };
};

// GET /api/nurse-schedule/:nurseId/slots?date=YYYY-MM-DD&duration=30&includeBooked=true
// Igual que scheduleController.getAvailableSlots, pero para una enfermera puntual. Se usa
// cuando un procedimiento no requiere doctor (requires_doctor false): la enfermera pasa a
// ser la proveedora principal de la cita, con el mismo flujo de horarios que un doctor.
nurseScheduleController.getAvailableSlotsForNurse = async (req, res) => {
    try {
        const { nurseId } = req.params;
        const { date, duration = 30, includeBooked } = req.query;
        const mostrarOcupados = includeBooked === "true";

        if (!date) return res.status(400).json({ message: "Se requiere el parámetro 'date'" });

        const schedule = await nurseScheduleModel.findOne({ nurse_id: nurseId });
        if (!schedule) return res.status(404).json({ message: "Horario no configurado" });

        const [yr, mo, dy] = date.split("-").map(Number);
        const dayOfWeek = new Date(yr, mo - 1, dy).getDay();

        const toDateStr = (d) => {
            if (!d) return "";
            if (typeof d === "string") return d.split("T")[0];
            return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
        };
        const exception = (schedule.exceptions || []).find((ex) => {
            if (ex.end_date) return date >= toDateStr(ex.date) && date <= toDateStr(ex.end_date);
            return toDateStr(ex.date) === date;
        });
        if (exception && exception.type !== "special_hours") {
            return res.status(200).json({ slots: [], message: "Día no laborable" });
        }

        const dayConfig = schedule.weekly_availability?.find((d) => d.day === dayOfWeek);
        if (!dayConfig || !dayConfig.is_available) {
            return res.status(200).json({ slots: [], message: "Día no disponible" });
        }

        // Con un horario especial de rango propio, ese rango reemplaza los
        // bloques normales del día en vez de ofrecer el día completo.
        const specialRange = getSpecialHoursRange(exception);
        const timeBlocksForDay = specialRange ? [specialRange] : dayConfig.time_blocks;

        const durationMin = Number(duration);
        const bufferMin = schedule.buffer_time || 0;

        // Mismo endpoint para personal y paciente (portal público/móvil, "elegir
        // enfermera primero"): el mínimo de 1 h de anticipación solo aplica al paciente,
        // ver MIN_BOOKING_LEAD_MINUTES.
        const esPaciente = req.user?.role === "patient";
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const isToday = new Date(yr, mo - 1, dy).getTime() === today.getTime();
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        const dayStart = new Date(`${date}T00:00:00.000Z`);
        const dayEnd = new Date(`${date}T23:59:59.999Z`);
        const existingAppointments = await appointmentsModel.find({
            nurse_id: nurseId,
            date: { $gte: dayStart, $lte: dayEnd },
            status: { $in: OCCUPYING_STATUSES },
        }).select({ start_time: 1, end_time: 1 });

        const bookedRanges = existingAppointments
            .filter((a) => a.start_time && a.end_time)
            .map((a) => ({ start: toMins(a.start_time), end: toMins(a.end_time) }));

        const slotsByStart = new Map();

        if (mostrarOcupados) {
            for (const r of bookedRanges) {
                const startStr = minsToStr(r.start);
                slotsByStart.set(startStr, { start_time: startStr, end_time: minsToStr(r.end), available: false });
            }
        }

        const dayBreaks = (schedule.breaks || [])
            .filter((br) => br.day === dayOfWeek)
            .map((br) => ({ start: toMins(br.start_time), end: toMins(br.end_time), gapAfter: 0 }));
        const obstacles = [
            ...dayBreaks,
            ...bookedRanges.map((r) => ({ start: r.start, end: r.end, gapAfter: bufferMin })),
        ];

        for (const free of tileFreeSlots(timeBlocksForDay, obstacles, durationMin, bufferMin)) {
            if (esPaciente && isToday && free.start < currentMinutes + MIN_BOOKING_LEAD_MINUTES) continue;
            const startStr = minsToStr(free.start);
            slotsByStart.set(startStr, {
                start_time: startStr,
                end_time: minsToStr(free.end),
                ...(mostrarOcupados ? { available: true } : {}),
            });
        }

        const slots = [...slotsByStart.values()].sort((a, b) => a.start_time.localeCompare(b.start_time));
        return res.status(200).json({ slots });
    } catch (error) {
        return res.status(500).json({ message: "Error al obtener slots", error: error.message });
    }
};

// GET /api/nurse-schedule/:nurseId/working-days — mismo propósito que
// scheduleController.getDoctorWorkingDays, pero para pintar bloqueados los días que una
// enfermera no atiende al elegirla como proveedora principal.
nurseScheduleController.getNurseWorkingDays = async (req, res) => {
    try {
        const { nurseId } = req.params;
        const schedule = await nurseScheduleModel.findOne({ nurse_id: nurseId });
        if (!schedule) return res.status(404).json({ message: "Horario no configurado" });

        const workingDays = (schedule.weekly_availability || [])
            .filter((d) => d.is_available && (d.time_blocks || []).length > 0)
            .map((d) => d.day);

        const exceptions = (schedule.exceptions || []).map((ex) => ({
            date: ex.date,
            end_date: ex.end_date || null,
            type: ex.type,
        }));

        return res.status(200).json({ workingDays, exceptions });
    } catch (error) {
        return res.status(500).json({ message: "Error al obtener los días laborables", error: error.message });
    }
};

// Horarios agregados "al menos una enfermera libre", mismo criterio que
// scheduleController.getPatientAvailableSlots pero sobre horarios de enfermería: se usa
// cuando el procedimiento elegido no requiere doctor (requires_doctor false), en el paso
// "horario primero" del portal público/móvil, sin revelar qué enfermera en particular. No
// es una ruta HTTP: scheduleController.getPatientAvailableSlots la invoca directamente
// según lo que necesite el procedimiento elegido.
export const getAggregateNurseSlots = async (date, minutes) => {
    const activeNurses = await nursesModel.find({ is_active: true }).select("_id").lean();
    const activeNurseIds = activeNurses.map((n) => n._id);

    const schedules = await nurseScheduleModel
        .find({ nurse_id: { $in: activeNurseIds } })
        .select("nurse_id weekly_availability breaks exceptions buffer_time")
        .lean();

    const [year, month, day] = date.split("-").map(Number);
    const dayOfWeek = new Date(year, month - 1, day).getDay();

    const toDateStr = (d) => {
        if (!d) return "";
        if (typeof d === "string") return d.split("T")[0];
        return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
    };

    const relevantSchedules = schedules.filter((s) =>
        s.weekly_availability?.some((entry) => entry.day === dayOfWeek && entry.is_available)
    );

    const dayStart = new Date(`${date}T00:00:00.000Z`);
    const dayEnd = new Date(`${date}T23:59:59.999Z`);
    const allAppointments = await appointmentsModel.find({
        nurse_id: { $in: relevantSchedules.map((s) => s.nurse_id) },
        date: { $gte: dayStart, $lte: dayEnd },
        status: { $in: OCCUPYING_STATUSES },
    }).select({ nurse_id: 1, start_time: 1, end_time: 1 }).lean();

    const appointmentsByNurse = new Map();
    for (const a of allAppointments) {
        if (!a.start_time || !a.end_time) continue;
        const key = String(a.nurse_id);
        if (!appointmentsByNurse.has(key)) appointmentsByNurse.set(key, []);
        appointmentsByNurse.get(key).push({ start: toMins(a.start_time), end: toMins(a.end_time) });
    }

    const now = new Date();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const requested = new Date(year, month - 1, day);
    const isToday = requested.getTime() === today.getTime();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const candidateSlots = new Map();

    for (const schedule of relevantSchedules) {
        const exception = (schedule.exceptions || []).find((ex) => {
            if (ex.end_date) return date >= toDateStr(ex.date) && date <= toDateStr(ex.end_date);
            return toDateStr(ex.date) === date;
        });
        if (exception && exception.type !== "special_hours") continue;

        const dayConfig = schedule.weekly_availability.find((entry) => entry.day === dayOfWeek && entry.is_available);
        const bufferMin = schedule.buffer_time || 0;
        const nurseKey = String(schedule.nurse_id);

        // Con un horario especial de rango propio, ese rango reemplaza los
        // bloques normales del día en vez de sumarse a ellos.
        const specialRange = getSpecialHoursRange(exception);
        const timeBlocks = specialRange ? [specialRange] : dayConfig.time_blocks;

        const obstacles = [
            ...(schedule.breaks || [])
                .filter((br) => br.day === dayOfWeek)
                .map((br) => ({ start: toMins(br.start_time), end: toMins(br.end_time), gapAfter: 0 })),
            ...(appointmentsByNurse.get(nurseKey) || [])
                .map((r) => ({ start: r.start, end: r.end, gapAfter: bufferMin })),
        ];

        for (const free of tileFreeSlots(timeBlocks, obstacles, minutes, bufferMin)) {
            // Mismo mínimo de 1 h de anticipación que getPatientAvailableSlots (ver
            // MIN_BOOKING_LEAD_MINUTES): esta función es exclusiva del paciente (nunca la
            // usa el personal), así que aplica siempre, sin revisar el rol.
            if (isToday && free.start < currentMinutes + MIN_BOOKING_LEAD_MINUTES) continue;
            const start_time = minsToStr(free.start);
            if (!candidateSlots.has(start_time)) {
                candidateSlots.set(start_time, { start_time, end_time: minsToStr(free.end) });
            }
        }
    }

    return [...candidateSlots.values()].sort((a, b) => a.start_time.localeCompare(b.start_time));
};

// GET /api/nurse-schedule/patient-nurses-for-slot?date=YYYY-MM-DD&start_time=HH:mm&procedure_id=...
// Análogo a scheduleController.getPatientDoctorsForSlot, pero para enfermeras como
// proveedoras principales (procedimiento sin doctor, requires_doctor false): dado un
// horario ya elegido del agregado (getAggregateNurseSlots), devuelve qué enfermeras
// pueden atenderlo. Usa isSlotFreeForNurse (exceptions + buffer_time incluidos), no
// isNurseAvailable, que es el criterio más simple reservado para la enfermera de apoyo.
export const getPatientNursesForSlot = async (req, res) => {
    try {
        const { date, start_time, procedure_id } = req.query;
        if (!date || !start_time) {
            return res.status(400).json({ message: "Se requieren los parámetros 'date' y 'start_time'" });
        }

        const minutes = await resolveDurationMinutes(procedure_id);
        if (minutes === null) {
            return res.status(400).json({ message: "El procedimiento seleccionado no está disponible." });
        }
        const end_time = minsToStr(toMins(start_time) + minutes);

        const [year, month, day] = date.split("-").map(Number);
        const dayOfWeek = new Date(year, month - 1, day).getDay();
        const schedules = await nurseScheduleModel.find({}).select("nurse_id weekly_availability exceptions").lean();

        const toDateStr = (d) => {
            if (!d) return "";
            if (typeof d === "string") return d.split("T")[0];
            return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
        };

        const matchingNurseIds = [];
        for (const schedule of schedules) {
            const dayConfig = schedule.weekly_availability?.find((entry) => entry.day === dayOfWeek && entry.is_available);
            if (!dayConfig) continue;

            // Mismo fix que getPatientDoctorsForSlot (scheduleController.js): antes este
            // filtro previo solo miraba el horario normal semanal, ignorando un
            // "Horario especial" de ese día, así que rechazaba a la enfermera antes de
            // llegar a isSlotFreeForNurse (que sí maneja excepciones).
            const exception = (schedule.exceptions || []).find((ex) => {
                if (ex.end_date) return date >= toDateStr(ex.date) && date <= toDateStr(ex.end_date);
                return toDateStr(ex.date) === date;
            });
            if (exception && exception.type !== "special_hours") continue;

            const specialRange = getSpecialHoursRange(exception);
            const timeBlocks = specialRange ? [specialRange] : dayConfig.time_blocks;

            const cubreElHorario = (timeBlocks || []).some(
                (block) => toMins(start_time) >= toMins(block.start_time) && toMins(end_time) <= toMins(block.end_time)
            );
            if (!cubreElHorario) continue;

            const { free } = await isSlotFreeForNurse(schedule.nurse_id, date, start_time, end_time, appointmentsModel);
            if (free) matchingNurseIds.push(schedule.nurse_id);
        }

        // El DUI identifica a la enfermera en los selectores del panel. La ruta
        // admite cualquier sesión, así que a un paciente nunca se le entrega.
        const nurses = await nursesModel
            .find({ _id: { $in: matchingNurseIds }, is_active: true })
            .select(req.user?.role === "patient" ? "name last_name img_url" : "name last_name img_url dui");

        return res.status(200).json({ nurses });
    } catch (error) {
        return res.status(500).json({ message: "Error al obtener enfermeras disponibles", error: error.message });
    }
};

export default nurseScheduleController;
