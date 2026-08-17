import scheduleModel from "../../models/schedule/schedule.js";
import appointmentsModel from "../../models/appointments/appointments.js";
import doctorModel from "../../models/doctors/doctors.js";
import proceduresModel from "../../models/procedures/procedures.js";

const scheduleController = {};

// Busca un schedule por doctorId exacto. Si no lo encuentra, busca
// por nombre del doctor, para resolver el caso donde hay dos entradas
// del mismo médico con distintos _id.
const findScheduleByDoctorId = async (doctorId) => {
    let schedule = await scheduleModel.findOne({ doctor_id: doctorId });
    if (schedule) return schedule;

    const requestedDoctor = await doctorModel.findById(doctorId).select("name last_name").lean();
    if (!requestedDoctor) return null;

    const sameNameDoctors = await doctorModel
        .find({ name: requestedDoctor.name, last_name: requestedDoctor.last_name })
        .select("_id")
        .lean();

    if (sameNameDoctors.length <= 1) return null;

    const ids = sameNameDoctors.map(d => d._id);
    return scheduleModel.findOne({ doctor_id: { $in: ids } });
};

// Solo doctores (su propio horario) y admin pueden ver o editar un
// horario de doctor. Receptionist y nurse quedan fuera aunque tengan
// calendar.schedule.view y calendar.schedule.update en true, porque
// ese permiso también gobierna endpoints que sí necesitan (por
// ejemplo, consultar slots libres para agendar una cita). Mismo
// patrón que appointmentsController.getNursesForAcceptance.
const isDoctorScheduleManager = (role) => ["doctor", "admin"].includes(role);

// GET /api/schedule/:doctorId, obtiene el horario del médico.
scheduleController.getSchedule = async (req, res) => {
    try {
        if (!isDoctorScheduleManager(req.user.role)) {
            return res.status(403).json({ message: "No tienes permiso para consultar este horario." });
        }
        const schedule = await findScheduleByDoctorId(req.params.doctorId);
        if (!schedule) return res.status(404).json({ message: "Horario no configurado aún" });
        return res.status(200).json(schedule);
    } catch (error) {
        return res.status(500).json({ message: "Error al obtener el horario", error: error.message });
    }
};

// PUT /api/schedule/:doctorId, crea o actualiza el horario (upsert).
scheduleController.saveSchedule = async (req, res) => {
    try {
        if (!isDoctorScheduleManager(req.user.role)) {
            return res.status(403).json({ message: "No tienes permiso para editar este horario." });
        }
        const { doctorId } = req.params;
        const data = req.body;

        const schedule = await scheduleModel.findOneAndUpdate(
            { doctor_id: doctorId },
            { ...data, doctor_id: doctorId },
            { new: true, upsert: true, runValidators: true }
        );

        return res.status(200).json({ message: "Horario guardado correctamente", schedule });
    } catch (error) {
        return res.status(500).json({ message: "Error al guardar el horario", error: error.message });
    }
};

// Convierte una hora en formato HH:mm a minutos desde medianoche.
const toMins = (t) => { const [h, m] = (t || "0:0").split(":").map(Number); return h * 60 + m; };

// Revalida si un horario puntual (fecha, start_time y end_time) sigue
// libre para un doctor: mismo criterio que getAvailableSlots
// (excepciones, día disponible, descansos, otras citas), pero para
// un slot ya elegido en vez de generar la lista completa. Se usa al
// aceptar una cita, para no confiar en que el horario siga libre
// desde que se creó la cita hasta que se acepta. excludeAppointmentId
// se pasa al aceptar una cita existente, para no chocar contra sí
// misma.
export const isSlotFreeForDoctor = async (doctorId, date, start_time, end_time, excludeAppointmentId) => {
    const schedule = await findScheduleByDoctorId(doctorId);
    if (!schedule) return { free: false, reason: "El doctor no tiene un horario configurado." };

    const [yr, mo, dy] = date.split("-").map(Number);
    const localDate = new Date(yr, mo - 1, dy);
    const dayOfWeek = localDate.getDay();

    const toDateStr = (d) => {
        if (!d) return "";
        if (typeof d === "string") return d.split("T")[0];
        return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
    };
    const exception = schedule.exceptions.find(ex => {
        if (ex.end_date) {
            return date >= toDateStr(ex.date) && date <= toDateStr(ex.end_date);
        }
        return toDateStr(ex.date) === date;
    });
    if (exception && exception.type !== "special_hours") {
        return { free: false, reason: "Ese día no es laborable." };
    }

    const dayConfig = schedule.weekly_availability.find(d => d.day === dayOfWeek);
    if (!dayConfig || !dayConfig.is_available) {
        return { free: false, reason: "El doctor no atiende ese día." };
    }

    const start = toMins(start_time);
    const end = toMins(end_time);

    const inBreak = schedule.breaks.some(br => {
        if (br.day !== dayOfWeek) return false;
        const bStart = toMins(br.start_time);
        const bEnd = toMins(br.end_time);
        return start < bEnd && end > bStart;
    });
    if (inBreak) {
        return { free: false, reason: "Ese horario cae dentro de un descanso del doctor." };
    }

    const dayStart = new Date(`${date}T00:00:00.000Z`);
    const dayEnd = new Date(`${date}T23:59:59.999Z`);
    const existingAppointments = await appointmentsModel.find({
        doctor_id: doctorId,
        date: { $gte: dayStart, $lte: dayEnd },
        status: { $nin: ["cancelled"] },
        ...(excludeAppointmentId ? { _id: { $ne: excludeAppointmentId } } : {}),
    }).select({ start_time: 1, end_time: 1 });

    const isBooked = existingAppointments.some(a => {
        if (!a.start_time || !a.end_time) return false;
        return start < toMins(a.end_time) && end > toMins(a.start_time);
    });
    if (isBooked) {
        return { free: false, reason: "Ya existe otra cita en ese horario." };
    }

    return { free: true };
};

// El portal no decide la duración: se obtiene del catálogo oficial. Así un
// procedimiento de 60 minutos solo produce bloques de 60 min. Se usa tanto
// para armar los horarios agregados como para resolver qué doctores cubren
// un horario puntual ya elegido.
const resolveDurationMinutes = async (procedure_id) => {
    if (!procedure_id || procedure_id === "general") return 30;
    const procedure = await proceduresModel.findOne({ _id: procedure_id, is_active: true })
        .select("estimated_duration");
    if (!procedure) return null;
    return Number(procedure.estimated_duration) || 30;
};

// Suma minutos a una hora en formato HH:mm y devuelve otra hora en el mismo formato.
const addMinutesToTime = (time, minutes) => {
    const total = toMins(time) + minutes;
    const hh = String(Math.floor(total / 60)).padStart(2, "0");
    const mm = String(total % 60).padStart(2, "0");
    return `${hh}:${mm}`;
};

// Horarios que puede solicitar un paciente: se incluyen solo si al menos un
// doctor con horario configurado puede atenderlos. No revela qué doctor es.
scheduleController.getPatientAvailableSlots = async (req, res) => {
    try {
        const { date, procedure_id } = req.query;
        if (!date) return res.status(400).json({ message: "Se requiere el parámetro 'date'" });
        const [requestedYear, requestedMonth, requestedDay] = date.split("-").map(Number);
        const requested = new Date(requestedYear, requestedMonth - 1, requestedDay);
        const today = new Date(); today.setHours(0, 0, 0, 0);
        if (requested < today) {
            return res.status(400).json({ message: "No puedes agendar una cita en una fecha que ya pasó." });
        }

        const minutes = await resolveDurationMinutes(procedure_id);
        if (minutes === null) {
            return res.status(400).json({ message: "El procedimiento seleccionado no está disponible." });
        }

        const schedules = await scheduleModel.find({}).select("doctor_id weekly_availability buffer_time").lean();
        const [year, month, day] = date.split("-").map(Number);
        const dayOfWeek = new Date(year, month - 1, day).getDay();
        const candidateSlots = new Map();
        const isToday = requested.getTime() === today.getTime();
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        for (const schedule of schedules) {
            const dayConfig = schedule.weekly_availability?.find((entry) => entry.day === dayOfWeek && entry.is_available);
            if (!dayConfig) continue;
            for (const block of dayConfig.time_blocks || []) {
                let current = toMins(block.start_time);
                const end = toMins(block.end_time);
                while (current + minutes <= end) {
                    // Una hora que ya comenzó (o ya pasó) no puede reservarse.
                    if (isToday && current <= currentMinutes) {
                        current += minutes + (schedule.buffer_time || 0);
                        continue;
                    }
                    const start_time = `${String(Math.floor(current / 60)).padStart(2, "0")}:${String(current % 60).padStart(2, "0")}`;
                    const slotEnd = current + minutes;
                    const end_time = `${String(Math.floor(slotEnd / 60)).padStart(2, "0")}:${String(slotEnd % 60).padStart(2, "0")}`;
                    const available = await isSlotFreeForDoctor(schedule.doctor_id, date, start_time, end_time);
                    if (available.free) candidateSlots.set(start_time, { start_time, end_time });
                    current += minutes + (schedule.buffer_time || 0);
                }
            }
        }
        return res.json({ slots: [...candidateSlots.values()].sort((a, b) => a.start_time.localeCompare(b.start_time)) });
    } catch (error) {
        return res.status(500).json({ message: "Error al obtener horarios disponibles", error: error.message });
    }
};

// Doctores que pueden atender un horario puntual (fecha, hora de inicio y
// tipo de atención) ya elegido a partir del horario agregado. Se usa después
// de que el paciente eligió un horario en getPatientAvailableSlots, para
// mostrarle qué doctor lo atenderá o, si hay varios, para que elija entre
// ellos.
scheduleController.getPatientDoctorsForSlot = async (req, res) => {
    try {
        const { date, start_time, procedure_id } = req.query;
        if (!date || !start_time) {
            return res.status(400).json({ message: "Se requieren los parámetros 'date' y 'start_time'" });
        }

        const minutes = await resolveDurationMinutes(procedure_id);
        if (minutes === null) {
            return res.status(400).json({ message: "El procedimiento seleccionado no está disponible." });
        }
        const end_time = addMinutesToTime(start_time, minutes);

        const [year, month, day] = date.split("-").map(Number);
        const dayOfWeek = new Date(year, month - 1, day).getDay();
        const schedules = await scheduleModel.find({}).select("doctor_id weekly_availability").lean();

        const matchingDoctorIds = [];
        for (const schedule of schedules) {
            const dayConfig = schedule.weekly_availability?.find((entry) => entry.day === dayOfWeek && entry.is_available);
            if (!dayConfig) continue;
            const cubreElHorario = (dayConfig.time_blocks || []).some(
                (block) => toMins(start_time) >= toMins(block.start_time) && toMins(end_time) <= toMins(block.end_time)
            );
            if (!cubreElHorario) continue;

            const { free } = await isSlotFreeForDoctor(schedule.doctor_id, date, start_time, end_time);
            if (free) matchingDoctorIds.push(schedule.doctor_id);
        }

        const doctors = await doctorModel
            .find({ _id: { $in: matchingDoctorIds }, is_active: true })
            .select("name last_name img_url");

        return res.status(200).json({ doctors });
    } catch (error) {
        return res.status(500).json({ message: "Error al obtener doctores disponibles", error: error.message });
    }
};

// GET /api/schedule/:doctorId/slots?date=YYYY-MM-DD&duration=30
// Devuelve los slots libres de un médico para una fecha y duración dada
scheduleController.getAvailableSlots = async (req, res) => {
    try {
        const { doctorId } = req.params;
        const { date, duration = 30 } = req.query;

        if (!date) return res.status(400).json({ message: "Se requiere el parámetro 'date'" });

        const schedule = await findScheduleByDoctorId(doctorId);
        if (!schedule) return res.status(404).json({ message: "Horario no configurado" });

        // Parsea la fecha como fecha local para que getDay() devuelva
        // el día correcto (0 es domingo, 1 es lunes, y así sucesivamente).
        const [yr, mo, dy] = date.split("-").map(Number);
        const localDate  = new Date(yr, mo - 1, dy);
        const dayOfWeek  = localDate.getDay();


        // Verifica excepciones (compara solo la parte de fecha, sin
        // hora). Toma la parte YYYY-MM-DD directamente del string
        // para evitar desplazamientos de zona horaria.
        const toDateStr = (d) => {
            if (!d) return "";
            if (typeof d === "string") return d.split("T")[0];
            return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,"0")}-${String(d.getUTCDate()).padStart(2,"0")}`;
        };
        const exception = schedule.exceptions.find(ex => {
            if (ex.end_date) {
                return date >= toDateStr(ex.date) && date <= toDateStr(ex.end_date);
            }
            return toDateStr(ex.date) === date;
        });

        if (exception && exception.type !== "special_hours") {
            return res.status(200).json({ slots: [], message: "Día no laborable" });
        }

        const dayConfig = schedule.weekly_availability.find(d => d.day === dayOfWeek);
        if (!dayConfig || !dayConfig.is_available) {
            return res.status(200).json({ slots: [], message: "Día no disponible" });
        }

        const durationMin = Number(duration);
        const bufferMin   = schedule.buffer_time || 0;

        // Obtiene las citas ya agendadas para este doctor en esta
        // fecha (excluyendo canceladas).
        const dayStart = new Date(`${date}T00:00:00.000Z`);
        const dayEnd   = new Date(`${date}T23:59:59.999Z`);
        const existingAppointments = await appointmentsModel.find({
            doctor_id: doctorId,
            date: { $gte: dayStart, $lte: dayEnd },
            status: { $nin: ["cancelled"] },
        }).select({ start_time: 1, end_time: 1 });

        console.log(`[slots] doctor=${doctorId} date=${date} dayStart=${dayStart.toISOString()} dayEnd=${dayEnd.toISOString()} appointments found=${existingAppointments.length}`);
        if (existingAppointments.length > 0) {
            console.log("[slots] booked times:", existingAppointments.map(a => `${a.start_time}-${a.end_time}`));
        }

        // Convierte una hora en formato HH:mm a minutos, para poder
        // comparar rangos.
        const toMins = (t) => { const [h, m] = (t || "0:0").split(":").map(Number); return h * 60 + m; };
        const bookedRanges = existingAppointments
            .filter(a => a.start_time && a.end_time)
            .map(a => ({
                start: toMins(a.start_time),
                end:   toMins(a.end_time),
            }));

        // Map en vez de array: si dos bloques se solapan (ej. el médico los definió por error
        // encimados), el mismo start_time no debe aparecer dos veces en la respuesta.
        const slotsByStart = new Map();

        for (const block of dayConfig.time_blocks) {
            const [startH, startM] = block.start_time.split(":").map(Number);
            const [endH,   endM]   = block.end_time.split(":").map(Number);
            let current = startH * 60 + startM;
            const end   = endH   * 60 + endM;

            while (current + durationMin <= end) {
                const hh  = String(Math.floor(current / 60)).padStart(2, "0");
                const mm  = String(current % 60).padStart(2, "0");
                const slotEnd = current + durationMin;
                const hhe = String(Math.floor(slotEnd / 60)).padStart(2, "0");
                const mme = String(slotEnd % 60).padStart(2, "0");

                const inBreak = schedule.breaks.some(br => {
                    if (br.day !== dayOfWeek) return false;
                    const [bh, bm] = br.start_time.split(":").map(Number);
                    const [eh, em] = br.end_time.split(":").map(Number);
                    const bStart = bh * 60 + bm;
                    const bEnd   = eh * 60 + em;
                    return current < bEnd && slotEnd > bStart;
                });

                // Excluye el slot si se solapa con una cita existente.
                const isBooked = bookedRanges.some(r => current < r.end && slotEnd > r.start);

                if (!inBreak && !isBooked) {
                    const startStr = `${hh}:${mm}`;
                    slotsByStart.set(startStr, { start_time: startStr, end_time: `${hhe}:${mme}` });
                }

                current += durationMin + bufferMin;
            }
        }

        // Orden cronológico: al iterar bloque por bloque, un bloque que empieza más tarde en el
        // día (ej. uno mal configurado desde medianoche) podía terminar antes en el arreglo.
        const slots = [...slotsByStart.values()].sort((a, b) => a.start_time.localeCompare(b.start_time));

        return res.status(200).json({ slots });
    } catch (error) {
        return res.status(500).json({ message: "Error al obtener slots", error: error.message });
    }
};

export default scheduleController;
