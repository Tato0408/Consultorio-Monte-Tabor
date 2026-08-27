import scheduleModel from "../../models/schedule/schedule.js";
import appointmentsModel from "../../models/appointments/appointments.js";
import doctorModel from "../../models/doctors/doctors.js";
import proceduresModel from "../../models/procedures/procedures.js";
// Import circular con nurseScheduleController.js (que a su vez importa toMins/minsToStr/
// tileFreeSlots de este archivo): seguro porque ambos lados solo usan el import dentro del
// cuerpo de una función async, nunca en tiempo de evaluación del módulo.
import { getAggregateNurseSlots } from "./nurseScheduleController.js";

const scheduleController = {};

// Busca un schedule por doctorId exacto. Si no lo encuentra, busca
// por nombre del doctor, para resolver el caso donde hay dos entradas
// del mismo médico con distintos _id.
export const findScheduleByDoctorId = async (doctorId) => {
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

// Un doctor solo puede ver/editar SU PROPIO horario, nunca el de un colega — antes solo
// se verificaba el rol, así que cualquier doctor autenticado podía sobrescribir el
// horario de otro con solo cambiar el :doctorId de la URL. El admin queda exento (sigue
// pudiendo administrar el horario de cualquier doctor, es su función).
const ownsSchedule = (req) => req.user.role === "admin" || req.params.doctorId === req.user.id;

// GET /api/schedule/:doctorId, obtiene el horario del médico.
scheduleController.getSchedule = async (req, res) => {
    try {
        if (!isDoctorScheduleManager(req.user.role)) {
            return res.status(403).json({ message: "No tienes permiso para consultar este horario." });
        }
        if (!ownsSchedule(req)) {
            return res.status(403).json({ message: "Solo puedes consultar tu propio horario." });
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
        if (!ownsSchedule(req)) {
            return res.status(403).json({ message: "Solo puedes editar tu propio horario." });
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

// Convierte una hora en formato HH:mm a minutos desde medianoche. Exportada (junto con
// minsToStr y tileFreeSlots más abajo) para que nurseScheduleController.js pueda armar el
// mismo cálculo de horarios libres para enfermeras sin duplicar el algoritmo de tileo: el
// horario de enfermera usa exactamente la misma forma (weekly_availability, breaks,
// exceptions, buffer_time) que el de doctor, ver models/schedule/nurseSchedule.js.
export const toMins = (t) => { const [h, m] = (t || "0:0").split(":").map(Number); return h * 60 + m; };

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

    // El tiempo entre citas (buffer_time) debe respetarse sin importar cuál
    // de las dos citas va antes: no basta con que los rangos no se toquen,
    // tiene que quedar al menos buffer_time minutos de separación con
    // cualquier otra cita ya agendada. Antes esto solo comparaba solape
    // estricto, así que el buffer configurado nunca se hacía cumplir de
    // verdad al confirmar una cita, solo al sugerir horarios.
    const bufferMin = schedule.buffer_time || 0;
    const conflict = existingAppointments.some(a => {
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

// El portal no decide la duración: se obtiene del catálogo oficial. Así un
// procedimiento de 60 minutos solo produce bloques de 60 min. Se usa tanto
// para armar los horarios agregados como para resolver qué doctores cubren
// un horario puntual ya elegido.
export const resolveDurationMinutes = async (procedure_id) => {
    if (!procedure_id) return null;
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

// Convierte minutos desde medianoche de vuelta a "HH:mm".
export const minsToStr = (mins) => `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;

// Arma los horarios libres de duración durationMin dentro de una lista de
// bloques de trabajo, saltando por encima de cualquier obstáculo (descansos
// y citas ya agendadas) en vez de generar una grilla fija desde el inicio
// de cada bloque. Antes, un bloque se recorría en pasos fijos de
// duration+buffer desde su propio inicio sin importar qué hubiera agendado
// dentro: si una cita de 45 min no calzaba con esos pasos, el horario justo
// después de que terminaba (ej. 11:45) nunca aparecía como candidato,
// aunque estuviera realmente libre. Ahora, al toparse con un obstáculo, el
// cursor salta directo a donde ese obstáculo termina (más su propio
// espacio de separación, si aplica) y sigue tileando desde ahí — así el
// siguiente horario disponible siempre se acopla a lo que el doctor ya
// tiene agendado ese día, sea cual sea la duración de esa cita.
// obstacles: [{ start, end, gapAfter }] en minutos desde medianoche.
// gapAfter es el tiempo que debe dejarse libre después de ESE obstáculo en
// particular (buffer_time para citas reales, 0 para descansos).
export const tileFreeSlots = (timeBlocks, obstacles, durationMin, bufferMin) => {
    const results = [];
    for (const block of timeBlocks || []) {
        const blockStart = toMins(block.start_time);
        const blockEnd = toMins(block.end_time);
        const blockObstacles = obstacles.filter(o => o.start < blockEnd && o.end > blockStart);

        let current = blockStart;
        while (current + durationMin <= blockEnd) {
            const slotEnd = current + durationMin;
            // Si el candidato choca con más de un obstáculo (ej. dos citas
            // seguidas), salta hasta después del que termine más tarde.
            let jumpTo = null;
            for (const o of blockObstacles) {
                if (current < o.end && slotEnd > o.start) {
                    const past = o.end + (o.gapAfter || 0);
                    if (jumpTo === null || past > jumpTo) jumpTo = past;
                }
            }
            if (jumpTo !== null) {
                current = jumpTo;
                continue;
            }
            results.push({ start: current, end: slotEnd });
            current += durationMin + (bufferMin || 0);
        }
    }
    return results;
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

        // Un procedimiento sin doctor (requires_doctor false) se agenda con una enfermera
        // como proveedora principal: los horarios agregados salen de sus horarios, no de
        // los de los doctores. Cualquier otro procedimiento sigue el camino normal
        // (doctor) más abajo.
        const procedure = await proceduresModel.findOne({ _id: procedure_id, is_active: true }).select("requires_doctor");
        if (procedure && procedure.requires_doctor === false) {
            const slots = await getAggregateNurseSlots(date, minutes);
            return res.json({ slots });
        }

        // Solo doctores activos: un horario cuyo único doctor cubridor está
        // dado de baja no debe ofrecerse como "disponible" (antes se incluía
        // igual, y el paciente se topaba con un callejón sin salida al elegir
        // ese horario, en getPatientDoctorsForSlot).
        const activeDoctors = await doctorModel.find({ is_active: true }).select("_id").lean();
        const activeDoctorIds = activeDoctors.map((d) => d._id);

        const schedules = await scheduleModel
            .find({ doctor_id: { $in: activeDoctorIds } })
            .select("doctor_id weekly_availability breaks exceptions buffer_time")
            .lean();

        const [year, month, day] = date.split("-").map(Number);
        const dayOfWeek = new Date(year, month - 1, day).getDay();
        const isToday = requested.getTime() === today.getTime();
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        const toDateStr = (d) => {
            if (!d) return "";
            if (typeof d === "string") return d.split("T")[0];
            return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
        };

        const relevantSchedules = schedules.filter((s) =>
            s.weekly_availability?.some((entry) => entry.day === dayOfWeek && entry.is_available)
        );

        // Una sola consulta para las citas de TODOS los doctores relevantes ese
        // día, en vez de reconsultar la base de datos por cada horario
        // candidato de cada doctor (antes esto era un patrón N+1: docenas de
        // consultas por una sola petición de horarios agregados).
        const dayStart = new Date(`${date}T00:00:00.000Z`);
        const dayEnd = new Date(`${date}T23:59:59.999Z`);
        const allAppointments = await appointmentsModel.find({
            doctor_id: { $in: relevantSchedules.map((s) => s.doctor_id) },
            date: { $gte: dayStart, $lte: dayEnd },
            status: { $nin: ["cancelled"] },
        }).select({ doctor_id: 1, start_time: 1, end_time: 1 }).lean();

        const appointmentsByDoctor = new Map();
        for (const a of allAppointments) {
            if (!a.start_time || !a.end_time) continue;
            const key = String(a.doctor_id);
            if (!appointmentsByDoctor.has(key)) appointmentsByDoctor.set(key, []);
            appointmentsByDoctor.get(key).push({ start: toMins(a.start_time), end: toMins(a.end_time) });
        }

        const candidateSlots = new Map();

        for (const schedule of relevantSchedules) {
            // Una excepción (vacaciones, día no laborable) puntual de este
            // doctor lo saca por completo del cálculo de ese día.
            const exception = (schedule.exceptions || []).find((ex) => {
                if (ex.end_date) return date >= toDateStr(ex.date) && date <= toDateStr(ex.end_date);
                return toDateStr(ex.date) === date;
            });
            if (exception && exception.type !== "special_hours") continue;

            const dayConfig = schedule.weekly_availability.find((entry) => entry.day === dayOfWeek && entry.is_available);
            const bufferMin = schedule.buffer_time || 0;
            const doctorKey = String(schedule.doctor_id);

            const obstacles = [
                ...(schedule.breaks || [])
                    .filter((br) => br.day === dayOfWeek)
                    .map((br) => ({ start: toMins(br.start_time), end: toMins(br.end_time), gapAfter: 0 })),
                ...(appointmentsByDoctor.get(doctorKey) || [])
                    .map((r) => ({ start: r.start, end: r.end, gapAfter: bufferMin })),
            ];

            for (const free of tileFreeSlots(dayConfig.time_blocks, obstacles, minutes, bufferMin)) {
                // Una hora que ya comenzó (o ya pasó) no puede reservarse.
                if (isToday && free.start <= currentMinutes) continue;
                const start_time = minsToStr(free.start);
                if (!candidateSlots.has(start_time)) {
                    candidateSlots.set(start_time, { start_time, end_time: minsToStr(free.end) });
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

// GET /api/schedule/:doctorId/slots?date=YYYY-MM-DD&duration=30&includeBooked=true
// Devuelve los slots de un médico para una fecha y duración dadas. Por
// defecto (sin includeBooked) solo devuelve los libres, mismo comportamiento
// de siempre para el personal (AppointmentsFormCalendar.jsx del panel
// privado, que espera que todo lo que llegue en "slots" sea seleccionable).
// Con includeBooked=true (portal público, tanto web como móvil, al elegir
// doctor primero) también incluye los horarios ya ocupados por otra cita,
// marcados con available:false, para que el paciente los vea bloqueados en
// vez de que simplemente desaparezcan de la lista sin explicación.
scheduleController.getAvailableSlots = async (req, res) => {
    try {
        const { doctorId } = req.params;
        const { date, duration = 30, includeBooked } = req.query;
        const mostrarOcupados = includeBooked === "true";

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

        const bookedRanges = existingAppointments
            .filter(a => a.start_time && a.end_time)
            .map(a => ({ start: toMins(a.start_time), end: toMins(a.end_time) }));

        // Map en vez de array: si dos bloques se solapan (ej. el médico los definió por error
        // encimados), el mismo start_time no debe aparecer dos veces en la respuesta.
        const slotsByStart = new Map();

        // Con includeBooked, cada cita real ocupada se muestra tal cual (su propio
        // horario exacto), en vez de derivarla de la grilla de horarios libres —
        // más preciso que antes, que podía mostrar varias celdas "ocupado"
        // parciales para una misma cita si su duración no calzaba con la grilla.
        if (mostrarOcupados) {
            for (const r of bookedRanges) {
                const startStr = minsToStr(r.start);
                slotsByStart.set(startStr, { start_time: startStr, end_time: minsToStr(r.end), available: false });
            }
        }

        // Un descanso del doctor nunca fue un horario elegible para nadie (a
        // diferencia de uno ocupado, no es "esta hora ya la tomaron", es "esta
        // hora no se atiende"), así que ni siquiera con includeBooked se incluye:
        // no lleva gapAfter porque no compite por el buffer entre citas, solo
        // bloquea directamente el tramo que cubre.
        const dayBreaks = (schedule.breaks || [])
            .filter(br => br.day === dayOfWeek)
            .map(br => ({ start: toMins(br.start_time), end: toMins(br.end_time), gapAfter: 0 }));
        const obstacles = [
            ...dayBreaks,
            ...bookedRanges.map(r => ({ start: r.start, end: r.end, gapAfter: bufferMin })),
        ];

        for (const free of tileFreeSlots(dayConfig.time_blocks, obstacles, durationMin, bufferMin)) {
            const startStr = minsToStr(free.start);
            slotsByStart.set(startStr, {
                start_time: startStr,
                end_time: minsToStr(free.end),
                ...(mostrarOcupados ? { available: true } : {}),
            });
        }

        // Orden cronológico: al iterar bloque por bloque, un bloque que empieza más tarde en el
        // día (ej. uno mal configurado desde medianoche) podía terminar antes en el arreglo.
        const slots = [...slotsByStart.values()].sort((a, b) => a.start_time.localeCompare(b.start_time));

        return res.status(200).json({ slots });
    } catch (error) {
        return res.status(500).json({ message: "Error al obtener slots", error: error.message });
    }
};

// GET /api/patient-portal/schedule/:doctorId/working-days — qué días de la semana
// atiende un doctor puntual y sus excepciones de fecha (vacaciones, días no
// laborables, horario especial), para que el paciente pueda ver bloqueados de
// entrada los días que no trabaja al elegir doctor primero, sin tener que consultar
// slot por slot cada fecha. No expone horas ni bloques de tiempo, solo lo necesario
// para pintar el selector de fecha: eso lo sigue resolviendo getAvailableSlots una
// vez que el paciente ya eligió un día concreto.
scheduleController.getDoctorWorkingDays = async (req, res) => {
    try {
        const { doctorId } = req.params;
        const schedule = await findScheduleByDoctorId(doctorId);
        if (!schedule) return res.status(404).json({ message: "Horario no configurado" });

        const workingDays = schedule.weekly_availability
            .filter((d) => d.is_available && (d.time_blocks || []).length > 0)
            .map((d) => d.day);

        const exceptions = schedule.exceptions.map((ex) => ({
            date: ex.date,
            end_date: ex.end_date || null,
            type: ex.type,
        }));

        return res.status(200).json({ workingDays, exceptions });
    } catch (error) {
        return res.status(500).json({ message: "Error al obtener los días laborables", error: error.message });
    }
};

export default scheduleController;
