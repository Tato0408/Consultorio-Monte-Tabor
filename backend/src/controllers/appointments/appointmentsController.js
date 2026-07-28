import appointmentsModel from "../../models/appointments/appointments.js";
import patientsModel from "../../models/patients/patients.js";
import doctorsModel from "../../models/doctors/doctors.js";
import "../../models/procedures/procedures.js"; // ensures "procedure" is registered for populate

const appointmentsController = {};

// Interpreta "YYYY-MM-DD" como año/mes/día LOCALES. `new Date("YYYY-MM-DD")` a secas se
// interpreta como medianoche UTC, y leerla luego con setHours()/getMonth() en hora local corre
// la fecha un día hacia atrás en zonas horarias detrás de UTC (como esta, America/El_Salvador).
// Mismo bug ya corregido en backend/src/utils/reportDateRange.js y backend/src/utils/validators.js;
// aquí faltaba aplicarlo. Construir con el constructor (year, month, day, ...) evita el corrimiento.
function getDayRange(dateInput) {
    let year, month, day;
    if (dateInput instanceof Date) {
        // Ya es un instante real (ej. "ahora"): se leen sus componentes locales tal cual.
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

// Marca como "no_show" las citas "pending" cuya fecha/hora ya pasó. No
// aplica a "scheduled", ya que esas las debe resolver el personal manualmente.
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

        // Filtro por tipo (Consulta Médica General / Procedimiento).
        if (type) {
            filters.type = type;
        }

        // Búsqueda libre por paciente, doctor, tipo o descripción. Como
        // patient_id/doctor_id son referencias, primero se buscan los ids que
        // calzan con el texto y luego se filtran las citas por esos ids.
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

        const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
        const limitNumber = Math.max(parseInt(limit, 10) || 10, 1);
        const skip = (pageNumber - 1) * limitNumber;

        // Orden por fecha: ascendente por defecto, descendente si se pide.
        const dateDirection = sortOrder === "desc" ? -1 : 1;

        const [appointments, total] = await Promise.all([
            appointmentsModel
                .find(filters)
                .populate("doctor_id", "name last_name specialty img_url")
                .populate({ path: "patient_id", model: "Patients", select: "name last_name" })
                .populate({ path: "procedure_id", model: "procedure", select: "name" })
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
        return res.status(500).json({ message: "Internal server error" });
    }
};

// Resumen de citas del día: contadores y la próxima cita confirmada.
appointmentsController.getAppointmentsStats = async (req, res) => {
    try {
        const { date } = req.query;

        const { start, end } = getDayRange(date || new Date());

        const dayFilter = { date: { $gte: start, $lte: end } };

        const [scheduled, waiting, completed] = await Promise.all([
            appointmentsModel.countDocuments({ ...dayFilter, status: { $in: ["scheduled", "completed"] } }),
            appointmentsModel.countDocuments({ ...dayFilter, status: "scheduled" }),
            appointmentsModel.countDocuments({ ...dayFilter, status: "completed" }),
        ]);

        // Busca la próxima cita agendada ("scheduled" = en espera) de hoy con hora igual o mayor a la actual.
        let nextAppointment = await appointmentsModel
            .findOne({ ...dayFilter, status: "scheduled", start_time: { $gte: currentTimeString() } })
            .sort({ start_time: 1 })
            .populate("doctor_id", "name last_name specialty img_url")
            .populate({ path: "patient_id", model: "Patients", select: "name last_name" });

        // Si no hay ninguna hoy, busca la siguiente en días futuros.
        if (!nextAppointment) {
            nextAppointment = await appointmentsModel
                .findOne({ date: { $gt: end }, status: "scheduled" })
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
        return res.status(500).json({ message: "Internal server error" });
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
            return res.status(404).json({ message: "Appointment not found" });
        }

        return res.status(200).json(appointment);
    } catch (error) {
        console.log("error " + error);
        return res.status(500).json({ message: "Internal server error" });
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
            message: "Internal Server Error"
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
            return res.status(400).json({ message: "Please fill all the required fields." });
        }

        // Valida la longitud de la descripción si se envió.
        if (description && (description.length < 3 || description.length > 500)) {
            return res
                .status(400)
                .json({ message: "Description must be between 3 and 500 characters." });
        }

        const validStatus = [
            "pending",
            "scheduled",
            "completed",
            "cancelled",
            "no_show"
        ];

        // Valida que el status sea uno de los permitidos.
        if (!validStatus.includes(status)) {
            return res.status(400).json({ message: "Invalid appointment status" });
        }

        const newAppointment = new appointmentsModel({
            doctor_id,
            patient_id,
            nurse_id,
            procedure_id,
            schedule_id,
            type,
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
        return res.status(201).json({ message: "Appointment created successfully" });
    } catch (error) {
        console.log("error" + error);
        return res.status(500).json({ message: "Internal server error" });
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
            return res.status(400).json({ message: "Please fill all the required fields." });
        }

        // Valida la longitud de la descripción si se envió.
        if (description && (description.length < 3 || description.length > 500)) {
            return res
                .status(400)
                .json({ message: "Description must be between 3 and 500 characters." });
        }

        const validStatus = [
            "pending",
            "scheduled",
            "completed",
            "cancelled",
            "no_show"
        ];

        // Valida que el status sea uno de los permitidos.
        if (!validStatus.includes(status)) {
            return res.status(400).json({ message: "Invalid appointment status" });
        }

        const appointmentUpdated = await appointmentsModel.findByIdAndUpdate(
            req.params.id,
            {
                doctor_id,
                patient_id,
                nurse_id,
                procedure_id,
                type,
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
            return res.status(404).json({ message: "Appointment not found" });
        }

        return res.status(200).json({
            message: "Appointment updated successfully"
        });

    } catch (error) {
        console.log("error" + error);
        return res.status(500).json({
            message: "Internal server error"
        });
    }
};

// Elimina una cita.
appointmentsController.deleteAppointment = async (req, res) => {
    try {
        const appointment = await appointmentsModel.findByIdAndDelete(req.params.id);
        if (!appointment) {
            return res.status(404).json({ message: "Appointment not found" });
        }
        return res.status(200).json({ message: "Appointment deleted successfully" });
    } catch (error) {
        console.log("error" + error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// Cambia únicamente el status de una cita (y el motivo si se cancela).
appointmentsController.updateAppointmentStatus = async (req, res) => {
    try {
        const { status, cancellation_reason } = req.body;

        if (!status) {
            return res.status(400).json({ message: "Status is required." });
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
            return res.status(404).json({ message: "Appointment not found" });
        }

        return res.status(200).json({ message: "Status updated successfully", data: appointmentUpdated });
    } catch (error) {
        console.log("error" + error);
        return res.status(500).json({ message: "Internal server error" });
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
        return res.status(500).json({ message: "Internal server error" });
    }
};

/*
const doctors = await doctorsModel.find({
  name: { $regex: search, $options: "i" }
});

const patients = await patientsModel.find({
  name: { $regex: search, $options: "i" }
});

const doctorIds = doctors.map(doc => doc._id);
const patientIds = patients.map(pat => pat._id);

const appointments = await appointmentsModel.find({
  $or: [
    { doctor: { $in: doctorIds } },
    { patient: { $in: patientIds } },
    { appointmentName: { $regex: search, $options: "i" } }
  ]
}).populate("doctor patient");
*/

export default appointmentsController;
