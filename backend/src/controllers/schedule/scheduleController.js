import scheduleModel from "../../models/schedule/schedule.js";
import appointmentsModel from "../../models/appointments/appointments.js";
import doctorModel from "../../models/doctors/doctors.js";

const scheduleController = {};

// Busca un schedule por doctorId exacto; si no lo encuentra, busca por nombre del doctor.
// Esto resuelve el caso donde hay dos entradas del mismo médico con distintos _id.
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

// GET /api/schedule/:doctorId  — obtener horario del médico
scheduleController.getSchedule = async (req, res) => {
    try {
        const schedule = await findScheduleByDoctorId(req.params.doctorId);
        if (!schedule) return res.status(404).json({ message: "Horario no configurado aún" });
        return res.status(200).json(schedule);
    } catch (error) {
        return res.status(500).json({ message: "Error al obtener el horario", error: error.message });
    }
};

// PUT /api/schedule/:doctorId  — crear o actualizar horario (upsert)
scheduleController.saveSchedule = async (req, res) => {
    try {
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

// GET /api/schedule/:doctorId/slots?date=YYYY-MM-DD&duration=30
// Devuelve los slots libres de un médico para una fecha y duración dada
scheduleController.getAvailableSlots = async (req, res) => {
    try {
        const { doctorId } = req.params;
        const { date, duration = 30 } = req.query;

        if (!date) return res.status(400).json({ message: "Se requiere el parámetro 'date'" });

        const schedule = await findScheduleByDoctorId(doctorId);
        if (!schedule) return res.status(404).json({ message: "Horario no configurado" });

        // Parsear la fecha como fecha LOCAL para que getDay() devuelva el día correcto
        const [yr, mo, dy] = date.split("-").map(Number);
        const localDate  = new Date(yr, mo - 1, dy);
        const dayOfWeek  = localDate.getDay(); // 0=Dom, 1=Lun, ...


        // Verificar excepciones (comparar solo la parte de fecha, sin hora)
        // Extraemos la parte YYYY-MM-DD directamente del string para evitar desplazamientos de zona horaria
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

        // Obtener citas ya agendadas para este doctor en esta fecha (excluyendo canceladas)
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

        // Convierte "HH:mm" → minutos para comparar rangos
        const toMins = (t) => { const [h, m] = (t || "0:0").split(":").map(Number); return h * 60 + m; };
        const bookedRanges = existingAppointments
            .filter(a => a.start_time && a.end_time)
            .map(a => ({
                start: toMins(a.start_time),
                end:   toMins(a.end_time),
            }));

        const slots = [];

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

                // Excluir si se solapa con una cita existente
                const isBooked = bookedRanges.some(r => current < r.end && slotEnd > r.start);

                if (!inBreak && !isBooked) {
                    slots.push({ start_time: `${hh}:${mm}`, end_time: `${hhe}:${mme}` });
                }

                current += durationMin + bufferMin;
            }
        }

        return res.status(200).json({ slots });
    } catch (error) {
        return res.status(500).json({ message: "Error al obtener slots", error: error.message });
    }
};

export default scheduleController;
