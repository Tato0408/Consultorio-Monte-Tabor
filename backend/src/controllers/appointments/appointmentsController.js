import appointmentsModel from "../../models/appointments/appointments.js";
import patientsModel from "../../models/patients/patients.js";
import doctorsModel from "../../models/doctors/doctors.js";
import notificationModel from "../../models/notifications/notification.js";
import { isSlotFreeForDoctor } from "../schedule/scheduleController.js";
import { isNurseAvailable } from "../schedule/nurseScheduleController.js";
import { notifyAppointmentRecipients } from "../../services/notificationService.js";
import proceduresModel from "../../models/procedures/procedures.js";
import nursesModel from "../../models/nurses/nurses.js";
import { getNonNegativeError } from "../../utils/validators.js";

const appointmentsController = {};
const GENERAL_CONSULTATION_PRICE = 15;

// Resuelve tipo, duración y precio del servicio elegido por el paciente,
// tomando el catálogo del servidor o la consulta general por defecto.
async function resolvePatientService(procedureId) {
    if (!procedureId || procedureId === "general") {
        return {
            procedure_id: null,
            type: "Consulta Médica General",
            duration_minutes: 30,
            total: GENERAL_CONSULTATION_PRICE,
        };
    }

    const procedure = await proceduresModel.findOne({ _id: procedureId, is_active: true })
        .select("name estimated_duration price requires_nurse");
    if (!procedure) return null;

    return {
        procedure_id: procedure._id,
        type: "Procedimiento",
        duration_minutes: Number(procedure.estimated_duration) || 30,
        total: Number(procedure.price) || 0,
        procedure,
    };
}

// Interpreta "YYYY-MM-DD" como año/mes/día locales, evitando el corrimiento
// de un día que provoca leer una fecha UTC con métodos de hora local.
function getDayRange(dateInput) {
    let year, month, day;
    if (dateInput instanceof Date) {
        // Si ya es una fecha real, se toman sus componentes locales.
        year = dateInput.getFullYear();
        month = dateInput.getMonth() + 1;
        day = dateInput.getDate();
    } else {
        const datePart = String(dateInput).trim().split("T")[0];
        [year, month, day] = datePart.split("-").map(Number);
    }
    const start = new Date(year, month - 1, day, 0, 0, 0, 0);
    const end = new Date(year, month - 1, day, 23, 59, 59, 999);
    return { start, end };
}

// Indica si una fecha cae dentro de la semana actual (hoy hasta el domingo).
function isWithinCurrentWeek(dateInput) {
    const requested = getDayRange(dateInput).start;
    const today = getDayRange(new Date()).start;
    const sunday = new Date(today);
    sunday.setDate(today.getDate() + (7 - today.getDay()) % 7);
    return requested >= today && requested <= sunday;
}

// Tiempo máximo que una cita puede esperar sin que ningún doctor la acepte
// antes de vencer sola (independiente de si su fecha ya llegó o no).
const PENDING_EXPIRATION_MS = 48 * 60 * 60 * 1000;

// Marca como "no_show" las "pending" cuya fecha ya pasó, y como "expired"
// las que llevan demasiado tiempo sin que ningún doctor las acepte.
async function expirePendingAppointments() {
    const now = new Date();
    const { start: startOfToday, end: endOfToday } = getDayRange(now);
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    await appointmentsModel.updateMany(
        {
            status: "pending",
            $or: [
                { date: { $lt: startOfToday } },
                { date: { $gte: startOfToday, $lte: endOfToday }, start_time: { $lt: currentTime } },
            ],
        },
        { $set: { status: "no_show" } }
    );

    const staleCutoff = new Date(now.getTime() - PENDING_EXPIRATION_MS);
    const staleAppointments = await appointmentsModel
        .find({ status: "pending", createdAt: { $lt: staleCutoff } })
        .select("_id patient_id");

    if (staleAppointments.length > 0) {
        await appointmentsModel.updateMany(
            { _id: { $in: staleAppointments.map(a => a._id) } },
            { $set: { status: "expired" } }
        );

        await notificationModel.insertMany(staleAppointments.map(a => ({
            recipient_role: "patient",
            recipient_id: a.patient_id,
            message: "Tu solicitud de cita venció porque ningún doctor la aceptó a tiempo. Puedes agendar de nuevo o contactar a la clínica.",
            appointment_id: a._id,
        })));
    }
}

// Lista citas con paginación, filtros y búsqueda.
appointmentsController.getAppointments = async (req, res) => {
    try {
        await expirePendingAppointments();

        const {
            date,
            dateFrom,
            dateTo,
            status,
            doctor_id,
            patient_id,
            type,
            appointment_type,
            search,
            sortOrder,
            page = 1,
            limit = 10,
        } = req.query;

        const filters = {};

        // Filtro por un día exacto.
        if (date) {
            const { start, end } = getDayRange(date);
            filters.date = { $gte: start, $lte: end };
        }

        // Filtro por rango de fechas.
        if (dateFrom || dateTo) {
            filters.date = filters.date || {};
            if (dateFrom) {
                filters.date.$gte = getDayRange(dateFrom).start;
            }
            if (dateTo) {
                filters.date.$lte = getDayRange(dateTo).end;
            }
        }

        // Filtro por estado; admite una lista separada por comas.
        if (status) {
            const statusList = status.split(",").map(s => s.trim());
            filters.status = statusList.length > 1 ? { $in: statusList } : statusList[0];
        }

        if (doctor_id) {
            filters.doctor_id = doctor_id;
        }

        if (patient_id) {
            filters.patient_id = patient_id;
        }

        // Filtro por tipo de servicio (Consulta Médica General / Procedimiento).
        if (type) {
            filters.type = type;
        }

        // Filtro por "Tipo de cita" del catálogo global del admin (ver
        // AppointmentTypesSection.jsx) — es un campo aparte de "type": solo
        // categoriza/colorea la cita, no define su precio ni duración.
        if (appointment_type) {
            filters.appointment_type = appointment_type;
        }

        // Búsqueda libre por paciente, doctor, tipo o descripción; primero se
        // resuelven los ids de paciente/doctor que coinciden con el texto.
        if (search) {
            const regex = new RegExp(search, "i");
            const [matchingPatients, matchingDoctors] = await Promise.all([
                patientsModel.find({ $or: [{ name: regex }, { last_name: regex }] }).select("_id"),
                doctorsModel.find({ $or: [{ name: regex }, { last_name: regex }] }).select("_id"),
            ]);

            filters.$or = [
                { type: regex },
                { description: regex },
                { patient_id: { $in: matchingPatients.map(p => p._id) } },
                { doctor_id: { $in: matchingDoctors.map(d => d._id) } },
            ];
        }

        // Alcance forzado por rol: el doctor solo ve las suyas; la
        // recepcionista no ve las que aún no han sido aceptadas.
        if (req.user.role === "doctor") {
            // Ve sus citas y las solicitudes aún sin tomar para poder aceptarlas.
            filters.$and = (filters.$and || []).concat([{
                $or: [{ doctor_id: req.user.id }, { doctor_id: null, status: "pending" }],
            }]);
        } else if (req.user.role === "patient") {
            filters.patient_id = req.user.id;
        } else if (req.user.role === "receptionist") {
            if (filters.status) {
                filters.$and = (filters.$and || []).concat([{ status: filters.status }, { status: { $ne: "pending" } }]);
                delete filters.status;
            } else {
                filters.status = { $ne: "pending" };
            }
        }

        const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
        const limitNumber = Math.max(parseInt(limit, 10) || 10, 1);
        const skip = (pageNumber - 1) * limitNumber;

        // Orden por fecha: ascendente por defecto, descendente si se pide.
        const dateDirection = sortOrder === "asc" ? 1 : -1;

        const [appointments, total] = await Promise.all([
            appointmentsModel
                .find(filters)
                .populate("doctor_id", "name last_name specialty img_url")
                .populate({ path: "patient_id", model: "Patients", select: "name last_name" })
                .populate({ path: "procedure_id", model: "procedure", select: "name requires_nurse" })
                .sort({ date: dateDirection, start_time: dateDirection })
                .skip(skip)
                .limit(limitNumber),
            appointmentsModel.countDocuments(filters),
        ]);

        return res.status(200).json({
            data: appointments,
            pagination: {
                page: pageNumber,
                limit: limitNumber,
                total,
                totalPages: Math.ceil(total / limitNumber) || 1,
            },
        });

    } catch (error) {
        console.log("error" + error);
        return res.status(500).json({ message: "Error interno del servidor" });
    }
};

// Resumen de citas del día: contadores y la próxima cita confirmada.
appointmentsController.getAppointmentsStats = async (req, res) => {
    try {
        const { date } = req.query;

        const { start, end } = getDayRange(date || new Date());

        const dayFilter = { date: { $gte: start, $lte: end } };
        // El doctor solo ve estadísticas de sus propias citas.
        if (req.user.role === "doctor") {
            dayFilter.doctor_id = req.user.id;
        }

        const [scheduled, waiting, completed] = await Promise.all([
            appointmentsModel.countDocuments({ ...dayFilter, status: { $in: ["scheduled", "completed"] } }),
            appointmentsModel.countDocuments({ ...dayFilter, status: "scheduled" }),
            appointmentsModel.countDocuments({ ...dayFilter, status: "completed" }),
        ]);

        // Busca la próxima cita "scheduled" de hoy con hora igual o mayor a la actual.
        let nextAppointment = await appointmentsModel
            .findOne({ ...dayFilter, status: "scheduled", start_time: { $gte: currentTimeString() } })
            .sort({ start_time: 1 })
            .populate("doctor_id", "name last_name specialty img_url")
            .populate({ path: "patient_id", model: "Patients", select: "name last_name" });

        // Si no hay ninguna hoy, busca la siguiente en días futuros.
        if (!nextAppointment) {
            nextAppointment = await appointmentsModel
                .findOne({
                    date: { $gt: end },
                    status: "scheduled",
                    ...(req.user.role === "doctor" ? { doctor_id: req.user.id } : {}),
                })
                .sort({ date: 1, start_time: 1 })
                .populate("doctor_id", "name last_name specialty img_url")
                .populate({ path: "patient_id", model: "Patients", select: "name last_name" });
        }

        return res.status(200).json({
            scheduled,
            waiting,
            completed,
            nextAppointment: nextAppointment || null,
        });
    } catch (error) {
        console.log("error" + error);
        return res.status(500).json({ message: "Error interno del servidor" });
    }
};

// Retorna la hora actual en formato "HH:mm" para comparar contra start_time.
function currentTimeString() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
}

// Trae una cita puntual con los datos del paciente, doctor y enfermera.
appointmentsController.getAppointmentById = async (req, res) => {
    try {
        const { id } = req.params;

        await expirePendingAppointments();

        const appointment = await appointmentsModel.findById(id)
            .populate({ path: "patient_id", model: "Patients", select: "name last_name phone gender birth_date dui clinical_history.blood_type email clinical_history.hereditary clinical_history.pathological clinical_history.non_pathological clinical_history.ecologycal_social" })
            .populate("doctor_id", "name last_name")
            .populate("nurse_id", "name last_name");

        if (!appointment) {
            return res.status(404).json({ message: "Cita no encontrada" });
        }

        // El doctor solo puede ver el detalle de sus propias citas.
        if (req.user.role === "doctor" && appointment.doctor_id?._id?.toString() !== req.user.id && appointment.doctor_id?.toString() !== req.user.id) {
            return res.status(403).json({ message: "No tienes acceso a esta cita." });
        }

        return res.status(200).json(appointment);
    } catch (error) {
        console.log("error " + error);
        return res.status(500).json({ message: "Error interno del servidor" });
    }
};

// Calcula los horarios libres de un doctor para una fecha y duración dadas.
appointmentsController.getAvailableSlots = async (req, res) => {
    try {
        const { doctor_id, date, duration = 30 } = req.query;

        if (!doctor_id || !date) {
            return res.status(400).json({
                message: "doctor_id y date son obligatorios"
            });
        }

        const { start: dayStart, end: dayEnd } = getDayRange(date);

        // Citas del doctor ese día (las canceladas no ocupan horario).
        const appointments = await appointmentsModel.find({
            doctor_id,
            date: { $gte: dayStart, $lte: dayEnd },
            status: { $ne: "cancelled" }
        });

        const occupied = appointments.map(a => a.start_time);

        const allSlots = [
            "9:00 AM",
            "9:30 AM",
            "10:00 AM",
            "10:30 AM",
            "11:00 AM",
            "11:30 AM",
            "1:00 PM",
            "1:30 PM",
            "2:00 PM",
            "2:30 PM",
            "3:00 PM",
            "3:30 PM",
            "4:00 PM",
            "4:30 PM",
        ];

        // Convierte "hh:mm AM/PM" a minutos desde medianoche.
        const toMinutes = (time) => {
            const [clock, period] = time.split(" ");
            let [h, m] = clock.split(":").map(Number);

            if (period === "PM" && h !== 12) h += 12;
            if (period === "AM" && h === 12) h = 0;

            return h * 60 + m;
        };

        const clinicClose = toMinutes("5:00 PM");

        // Descarta los slots que terminarían después del cierre o que ya están ocupados.
        const availableSlots = allSlots.filter(slot => {
            const start = toMinutes(slot);

            if (start + Number(duration) > clinicClose)
                return false;

            return !occupied.includes(slot);
        });

        res.json({
            availableSlots
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            message: "Error interno del servidor"
        });
    }
};

// Crea una cita nueva.
appointmentsController.insertAppointment = async (req, res) => {
    try {
        let {
            doctor_id,
            patient_id,
            nurse_id,
            procedure_id,
            schedule_id,
            type,
            appointment_type,
            date,
            start_time,
            end_time,
            duration_minutes,
            description,
            status,
            total,
            cancellation_reason,
        } = req.body;

        // Sanitiza los campos de texto.
        type = type?.trim();
        description = description?.trim();
        cancellation_reason = cancellation_reason?.trim();

        // La recepcionista no pasa por aceptación del doctor: la cita queda
        // directamente programada (se ignora el status que haya mandado).
        if (req.user.role === "receptionist") {
            status = "scheduled";
        }

        // Un doctor que crea una cita solo puede asignársela a sí mismo, sin
        // importar el payload; admin y recepción sí eligen doctor.
        if (req.user.role === "doctor") {
            doctor_id = req.user.id;
        }
        if (req.user.role === "patient") {
            patient_id = req.user.id;
            doctor_id = null;
            status = "pending";
            if (!isWithinCurrentWeek(date)) {
                return res.status(400).json({ message: "Solo puedes solicitar citas durante la semana actual." });
            }

            // La fecha se persiste como inicio del día local del paciente:
            // guardarla en UTC la corre al día anterior y dispara el no_show.
            date = getDayRange(date).start;

            // El precio, duración y tipo salen del catálogo del servidor; el
            // paciente solo elige el servicio, nunca esos valores.
            const service = await resolvePatientService(procedure_id);
            if (!service) {
                return res.status(400).json({ message: "El procedimiento seleccionado no está disponible." });
            }
            procedure_id = service.procedure_id;
            type = service.type;
            duration_minutes = service.duration_minutes;
            total = service.total;
        }

        // Valida que estén los campos obligatorios.
        if ((!doctor_id && req.user.role !== "patient") || !patient_id || !type || date == null || !start_time || !end_time || duration_minutes == null || !status || total == null) {
            return res.status(400).json({ message: "Completa todos los campos requeridos." });
        }

        // Valida la longitud de la descripción si se envió.
        if (description && (description.length < 3 || description.length > 500)) {
            return res
                .status(400)
                .json({ message: "La descripción debe tener entre 3 y 500 caracteres." });
        }

        const validStatus = [
            "pending",
            "scheduled",
            "completed",
            "cancelled",
            "no_show",
            "expired"
        ];

        // Valida que el status sea uno de los permitidos.
        if (!validStatus.includes(status)) {
            return res.status(400).json({ message: "Estado de la cita inválido" });
        }

        const numberError = getNonNegativeError(total, "El costo total")
            || getNonNegativeError(duration_minutes, "La duración");
        if (numberError) {
            return res.status(400).json({ message: numberError });
        }

        const newAppointment = new appointmentsModel({
            doctor_id,
            patient_id,
            nurse_id,
            procedure_id,
            schedule_id,
            type,
            appointment_type,
            date,
            start_time,
            end_time,
            duration_minutes,
            description,
            status,
            total,
            cancellation_reason,
        });

        await newAppointment.save();

        // Informa al profesional y al paciente sin incluir diagnósticos ni
        // otros datos clínicos en la campana.
        await notifyAppointmentRecipients(newAppointment, {
            doctorMessage: req.user.role === "receptionist"
                ? "Recepción te asignó una nueva cita."
                : "Se te asignó una nueva cita.",
            patientMessage: "La clínica registró una cita para ti.",
            actor: req.user,
        }).catch((error) => console.log("Error notificando nueva cita:", error));

        return res.status(201).json({ message: "Cita creada correctamente" });
    } catch (error) {
        console.log("error" + error);
        return res.status(500).json({ message: "Error interno del servidor" });
    }
};

// Actualiza una cita existente.
appointmentsController.updateAppointment = async (req, res) => {
    try {
        let {
            doctor_id,
            patient_id,
            nurse_id,
            procedure_id,
            type,
            appointment_type,
            date,
            start_time,
            end_time,
            duration_minutes,
            description,
            status,
            total,
            cancellation_reason,
        } = req.body;

        // Sanitiza los campos de texto.
        type = type?.trim();
        description = description?.trim();
        cancellation_reason = cancellation_reason?.trim();

        // Valida que estén los campos obligatorios.
        if (!doctor_id || !patient_id || !type || date == null || !start_time || !end_time || duration_minutes == null || !status || total == null) {
            return res.status(400).json({ message: "Completa todos los campos requeridos." });
        }

        // Valida la longitud de la descripción si se envió.
        if (description && (description.length < 3 || description.length > 500)) {
            return res
                .status(400)
                .json({ message: "La descripción debe tener entre 3 y 500 caracteres." });
        }

        const validStatus = [
            "pending",
            "scheduled",
            "completed",
            "cancelled",
            "no_show",
            "expired"
        ];

        // Valida que el status sea uno de los permitidos.
        if (!validStatus.includes(status)) {
            return res.status(400).json({ message: "Estado de la cita inválido" });
        }

        const numberError = getNonNegativeError(total, "El costo total")
            || getNonNegativeError(duration_minutes, "La duración");
        if (numberError) {
            return res.status(400).json({ message: numberError });
        }

        const appointmentUpdated = await appointmentsModel.findByIdAndUpdate(
            req.params.id,
            {
                doctor_id,
                patient_id,
                nurse_id,
                procedure_id,
                type,
                appointment_type,
                date,
                start_time,
                end_time,
                duration_minutes,
                description,
                status,
                total,
                cancellation_reason,
            },
            { new: true }
        );

        if (!appointmentUpdated) {
            return res.status(404).json({ message: "Cita no encontrada" });
        }

        await notifyAppointmentRecipients(appointmentUpdated, {
            doctorMessage: "Una cita asignada a ti fue actualizada.",
            patientMessage: "La información de tu cita fue actualizada.",
            actor: req.user,
        }).catch((error) => console.log("Error notificando actualización de cita:", error));

        return res.status(200).json({
            message: "Cita actualizada correctamente"
        });

    } catch (error) {
        console.log("error" + error);
        return res.status(500).json({
            message: "Error interno del servidor"
        });
    }
};

// Edición desde el portal: el paciente solo edita una cita propia y nunca
// puede cambiar la fecha, el paciente ni el doctor asignado.
appointmentsController.updatePatientAppointment = async (req, res) => {
    try {
        if (req.user.role !== "patient") {
            return res.status(403).json({ message: "Acceso denegado." });
        }
        const appointment = await appointmentsModel.findOne({ _id: req.params.id, patient_id: req.user.id });
        if (!appointment) return res.status(404).json({ message: "Cita no encontrada." });
        if (["completed", "cancelled", "no_show", "expired"].includes(appointment.status)) {
            return res.status(400).json({ message: "Esta cita ya no puede modificarse." });
        }

        const { procedure_id, description } = req.body;
        if (procedure_id !== undefined) {
            const service = await resolvePatientService(procedure_id);
            if (!service) {
                return res.status(400).json({ message: "El procedimiento seleccionado no está disponible." });
            }
            appointment.procedure_id = service.procedure_id;
            appointment.type = service.type;
            appointment.duration_minutes = service.duration_minutes;
            appointment.total = service.total;
        }
        if (description !== undefined) appointment.description = String(description).trim();
        await appointment.save();

        if (appointment.doctor_id) {
            await notifyAppointmentRecipients(appointment, {
                doctorMessage: "El paciente actualizó los datos de una cita asignada a ti.",
                actor: req.user,
            }).catch((error) => console.log("Error notificando edición del paciente:", error));
        }
        return res.json({ message: "Cita actualizada.", data: appointment });
    } catch (error) {
        return res.status(500).json({ message: "Error al actualizar la cita." });
    }
};

// El paciente cancela una cita propia con motivo obligatorio; no aplica si
// ya está completada, cancelada, marcada como no_show o vencida.
appointmentsController.cancelPatientAppointment = async (req, res) => {
    try {
        if (req.user.role !== "patient") {
            return res.status(403).json({ message: "Acceso denegado." });
        }

        const reason = String(req.body.cancellation_reason || "").trim();
        if (!reason) {
            return res.status(400).json({ message: "Debes indicar el motivo de la cancelación." });
        }
        if (reason.length < 3 || reason.length > 500) {
            return res.status(400).json({ message: "El motivo debe tener entre 3 y 500 caracteres." });
        }

        const appointment = await appointmentsModel.findOne({ _id: req.params.id, patient_id: req.user.id });
        if (!appointment) {
            return res.status(404).json({ message: "Cita no encontrada." });
        }
        if (["completed", "cancelled", "no_show", "expired"].includes(appointment.status)) {
            return res.status(400).json({ message: "Esta cita ya no puede cancelarse." });
        }

        appointment.status = "cancelled";
        appointment.cancellation_reason = reason;
        await appointment.save();

        if (appointment.doctor_id) {
            await notifyAppointmentRecipients(appointment, {
                doctorMessage: "El paciente canceló una cita asignada a ti.",
                actor: req.user,
            }).catch((error) => console.log("Error notificando cancelación del paciente:", error));
        }

        return res.json({ message: "Cita cancelada.", data: appointment });
    } catch (error) {
        return res.status(500).json({ message: "Error al cancelar la cita." });
    }
};

// Elimina una cita.
appointmentsController.deleteAppointment = async (req, res) => {
    try {
        const appointment = await appointmentsModel.findByIdAndDelete(req.params.id);
        if (!appointment) {
            return res.status(404).json({ message: "Cita no encontrada" });
        }
        await notifyAppointmentRecipients(appointment, {
            doctorMessage: "Una cita asignada a ti fue eliminada.",
            patientMessage: "Una cita registrada para ti fue eliminada.",
            actor: req.user,
        }).catch((error) => console.log("Error notificando eliminación de cita:", error));
        return res.status(200).json({ message: "Cita eliminada correctamente" });
    } catch (error) {
        console.log("error" + error);
        return res.status(500).json({ message: "Error interno del servidor" });
    }
};

// Cambia únicamente el status de una cita (y el motivo si se cancela).
appointmentsController.updateAppointmentStatus = async (req, res) => {
    try {
        const { status, cancellation_reason } = req.body;

        if (!status) {
            return res.status(400).json({ message: "El estado es requerido." });
        }

        const update = { status };
        if (status === "cancelled" && cancellation_reason) {
            update.cancellation_reason = cancellation_reason.trim();
        }

        const appointmentUpdated = await appointmentsModel.findByIdAndUpdate(
            req.params.id,
            update,
            { new: true }
        );

        if (!appointmentUpdated) {
            return res.status(404).json({ message: "Cita no encontrada" });
        }

        await notifyAppointmentRecipients(appointmentUpdated, {
            doctorMessage: `El estado de una cita asignada a ti cambió a: ${status}.`,
            patientMessage: `El estado de tu cita cambió a: ${status}.`,
            actor: req.user,
        }).catch((error) => console.log("Error notificando cambio de estado:", error));

        return res.status(200).json({ message: "Estado actualizado correctamente", data: appointmentUpdated });
    } catch (error) {
        console.log("error" + error);
        return res.status(500).json({ message: "Error interno del servidor" });
    }
};

// El doctor acepta una cita "pending" propia, revalidando antes que el
// horario siga libre desde que se creó la cita.
appointmentsController.acceptAppointment = async (req, res) => {
    try {
        if (req.user.role !== "doctor") {
            return res.status(403).json({ message: "Solo un doctor puede aceptar una cita." });
        }

        const { nurse_id } = req.body;
        const appointment = await appointmentsModel.findById(req.params.id);
        if (!appointment) {
            return res.status(404).json({ message: "Appointment not found" });
        }

        if (appointment.doctor_id && appointment.doctor_id.toString() !== req.user.id) {
            return res.status(403).json({ message: "No puedes aceptar una cita asignada a otro doctor." });
        }

        if (appointment.status !== "pending") {
            return res.status(400).json({ message: "Esta cita ya no está pendiente de aceptación." });
        }

        const d = appointment.date;
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

        const { free, reason } = await isSlotFreeForDoctor(
            req.user.id,
            dateStr,
            appointment.start_time,
            appointment.end_time,
            appointment._id
        );

        if (!free) {
            return res.status(409).json({ message: reason || "Ese horario ya no está disponible." });
        }

        let assignedNurse = null;
        if (appointment.procedure_id) {
            const procedure = await proceduresModel.findById(appointment.procedure_id)
                .select("requires_nurse");
            if (procedure?.requires_nurse && !nurse_id) {
                return res.status(400).json({ message: "Este procedimiento requiere seleccionar una enfermera." });
            }
        }
        if (nurse_id) {
            assignedNurse = await nursesModel.findById(nurse_id).select("_id");
            if (!assignedNurse) {
                return res.status(400).json({ message: "La enfermera seleccionada no existe." });
            }
        }

        // La condición exige que siga sin asignar (o asignada a este mismo
        // doctor en citas anteriores), para que dos doctores no puedan tomarla.
        const accepted = await appointmentsModel.findOneAndUpdate(
            {
                _id: appointment._id,
                status: "pending",
                doctor_id: appointment.doctor_id ? req.user.id : null,
            },
            { $set: { doctor_id: req.user.id, nurse_id: assignedNurse?._id || null, status: "scheduled" } },
            { new: true }
        );
        if (!accepted) {
            return res.status(409).json({ message: "Esta cita ya fue tomada por otro doctor." });
        }

        await notifyAppointmentRecipients(accepted, {
            patientMessage: "Tu cita fue aceptada por el doctor.",
            actor: req.user,
        }).catch((error) => console.log("Error notificando aceptación de cita:", error));

        return res.status(200).json({ message: "Cita aceptada correctamente", data: accepted });
    } catch (error) {
        console.log("error" + error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// El admin asigna un doctor a una cita "pending", dejándola programada de
// una vez, con la misma revalidación de horario y enfermera que aceptar.
appointmentsController.assignDoctor = async (req, res) => {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({ message: "Solo un administrador puede asignar una cita a un doctor." });
        }

        const { doctor_id, nurse_id } = req.body;
        if (!doctor_id) {
            return res.status(400).json({ message: "Debes seleccionar un doctor." });
        }

        const appointment = await appointmentsModel.findById(req.params.id);
        if (!appointment) {
            return res.status(404).json({ message: "Appointment not found" });
        }

        if (appointment.status !== "pending") {
            return res.status(400).json({ message: "Esta cita ya no está pendiente de asignación." });
        }

        const doctor = await doctorsModel.findById(doctor_id).select("_id");
        if (!doctor) {
            return res.status(400).json({ message: "El doctor seleccionado no existe." });
        }

        const d = appointment.date;
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

        const { free, reason } = await isSlotFreeForDoctor(
            doctor_id,
            dateStr,
            appointment.start_time,
            appointment.end_time,
            appointment._id
        );

        if (!free) {
            return res.status(409).json({ message: reason || "Ese horario ya no está disponible para el doctor seleccionado." });
        }

        let assignedNurse = null;
        if (appointment.procedure_id) {
            const procedure = await proceduresModel.findById(appointment.procedure_id)
                .select("requires_nurse");
            if (procedure?.requires_nurse && !nurse_id) {
                return res.status(400).json({ message: "Este procedimiento requiere seleccionar una enfermera." });
            }
        }
        if (nurse_id) {
            assignedNurse = await nursesModel.findById(nurse_id).select("_id");
            if (!assignedNurse) {
                return res.status(400).json({ message: "La enfermera seleccionada no existe." });
            }
        }

        const assigned = await appointmentsModel.findOneAndUpdate(
            { _id: appointment._id, status: "pending" },
            { $set: { doctor_id, nurse_id: assignedNurse?._id || null, status: "scheduled" } },
            { new: true }
        );
        if (!assigned) {
            return res.status(409).json({ message: "Esta cita ya fue tomada por un doctor." });
        }

        await notifyAppointmentRecipients(assigned, {
            doctorMessage: "Se te asignó una nueva cita.",
            patientMessage: "Tu cita fue asignada a un doctor.",
            actor: req.user,
        }).catch((error) => console.log("Error notificando asignación de cita:", error));

        return res.status(200).json({ message: "Cita asignada correctamente", data: assigned });
    } catch (error) {
        console.log("error" + error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// Catálogo seguro del portal: solo procedimientos activos y los campos que
// el paciente necesita para elegir y conocer su precio/duración.
appointmentsController.getPatientProcedures = async (req, res) => {
    try {
        if (req.user.role !== "patient") {
            return res.status(403).json({ message: "Acceso denegado." });
        }
        const procedures = await proceduresModel.find({ is_active: true })
            .select("name description estimated_duration price")
            .sort({ name: 1 })
            .lean();
        return res.json({ data: procedures });
    } catch (error) {
        return res.status(500).json({ message: "No se pudieron cargar los procedimientos." });
    }
};

// Catálogo mínimo para asignar una enfermera al crear/editar/aceptar una cita — usado tanto por
// AppointmentsForm.jsx (crear/editar) como por AppointmentsGrid.jsx (aceptar/asignar). Se monta
// con authorize("calendar.appointments","view") en las rutas, así que cualquier rol que pueda
// gestionar citas (admin, doctor, recepción, enfermería) llega aquí, sin depender del permiso
// de administración de enfermeras (users.nurses), que es un tema aparte.
// Si se envían date/start_time/end_time (los de la cita a crear/editar/aceptar), el catálogo se
// filtra a solo las enfermeras que tienen ese horario configurado como disponible — igual
// que un doctor solo puede recibir citas dentro de su propio horario. appointment_id se envía
// al editar una cita existente, para no filtrar a la enfermera ya asignada por "chocar" con
// la misma cita que se está editando.
appointmentsController.getNursesForAcceptance = async (req, res) => {
    try {
        const { date, start_time, end_time, appointment_id } = req.query;
        const nurses = await nursesModel.find({ is_active: true }).select("name last_name").sort({ name: 1 }).lean();

        if (!date || !start_time || !end_time) {
            return res.json({ data: nurses });
        }

        const availability = await Promise.all(
            nurses.map((n) => isNurseAvailable(n._id, date, start_time, end_time, appointmentsModel, appointment_id))
        );
        const availableNurses = nurses.filter((_, i) => availability[i]);
        return res.json({ data: availableNurses });
    } catch (error) {
        return res.status(500).json({ message: "No se pudieron cargar las enfermeras." });
    }
};

// Catálogo del filtro "Doctor" del listado de citas — solo doctores que efectivamente tienen al
// menos una cita registrada (no el catálogo completo de doctores), para que el filtro no ofrezca
// opciones que de todos modos no devolverían ningún resultado.
appointmentsController.getDoctorsWithAppointments = async (req, res) => {
    try {
        const doctorIds = await appointmentsModel.distinct("doctor_id", { doctor_id: { $ne: null } });
        const doctors = await doctorsModel
            .find({ _id: { $in: doctorIds } })
            .select("name last_name")
            .sort({ name: 1, last_name: 1 });
        return res.status(200).json(doctors);
    } catch (error) {
        console.log("error" + error);
        return res.status(500).json({ message: "Error interno del servidor" });
    }
};

// Trae las citas completadas del día, para el historial.
appointmentsController.getAppointmentsHistory = async (req, res) => {
    try {
        const { date, limit = 5 } = req.query;

        const { start, end } = getDayRange(date || new Date());

        const history = await appointmentsModel
            .find({ date: { $gte: start, $lte: end }, status: "completed" })
            .sort({ updatedAt: -1 })
            .limit(Math.max(parseInt(limit, 10) || 5, 1))
            .populate({ path: "patient_id", model: "Patients", select: "name last_name" });

        return res.status(200).json(history);
    } catch (error) {
        console.log("error" + error);
        return res.status(500).json({ message: "Error interno del servidor" });
    }
};

export default appointmentsController;