import nurseScheduleModel from "../../models/schedule/nurseSchedule.js";

const nurseScheduleController = {};

const toMins = (t) => { const [h, m] = (t || "0:0").split(":").map(Number); return h * 60 + m; };

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

    const dayConfig = schedule.weekly_availability?.find((d) => d.day === dayOfWeek);
    if (!dayConfig?.is_available) return false;

    const start = toMins(start_time);
    const end = toMins(end_time);

    const coversRange = (dayConfig.time_blocks || []).some((b) => toMins(b.start_time) <= start && toMins(b.end_time) >= end);
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
        status: { $nin: ["cancelled"] },
        ...(excludeAppointmentId ? { _id: { $ne: excludeAppointmentId } } : {}),
    }).select({ start_time: 1, end_time: 1 });

    const isBooked = sameDayAppointments.some((a) =>
        a.start_time && a.end_time && start < toMins(a.end_time) && end > toMins(a.start_time)
    );
    if (isBooked) return false;

    return true;
};

export default nurseScheduleController;
