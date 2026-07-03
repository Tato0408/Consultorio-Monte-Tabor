import appointmentsModel from "../../models/appointments/appointments.js";
import "../../models/patients/patients.js"; // ensures "Patients" is registered for populate

const appointmentsController = {};

// Marca como "no_show" las citas "pending" cuya fecha/hora ya pasó.
// Solo aplica a "pending": una "scheduled" que ya pasó pudo haberse
// atendido y debe resolverla el personal (completed/cancelled), no el sistema.
async function expirePendingAppointments() {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);
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

//SELECT
appointmentsController.getAppointments = async (req, res) => {
    try {
        await expirePendingAppointments();

        const {
            date,
            dateFrom,
            dateTo,
            status,
            doctor_id,
            page = 1,
            limit = 10,
        } = req.query;

        const filters = {};

        //Filtro por un dia exacto
        if (date) {
            const start = new Date(date);
            start.setHours(0, 0, 0, 0);
            const end = new Date(date);
            end.setHours(23, 59, 59, 999);
            filters.date = { $gte: start, $lte: end };
        }

        //Filtro por rango de fechas, desde / hasta
        if (dateFrom || dateTo) {
            filters.date = filters.date || {};
            if (dateFrom) {
                const start = new Date(dateFrom);
                start.setHours(0, 0, 0, 0);
                filters.date.$gte = start;
            }
            if (dateTo) {
                const end = new Date(dateTo);
                end.setHours(23, 59, 59, 999);
                filters.date.$lte = end;
            }
        }

        //Filtro por estado
        if (status) {
            const statusList = status.split(",").map(s => s.trim());
            filters.status = statusList.length > 1 ? { $in: statusList } : statusList[0];
        }

        if (doctor_id) {
            filters.doctor_id = doctor_id;
        }

        const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
        const limitNumber = Math.max(parseInt(limit, 10) || 10, 1);
        const skip = (pageNumber - 1) * limitNumber;

        const [appointments, total] = await Promise.all([
            appointmentsModel
                .find(filters)
                .populate("doctor_id", "name last_name specialty img_url")
                .populate({ path: "patient_id", model: "Patients", select: "name last_name" })
                .sort({ date: 1, start_time: 1 })
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

//Get para resumen del dia
appointmentsController.getAppointmentsStats = async (req, res) => {
    try {
        const { date } = req.query;
 
        const targetDate = date ? new Date(date) : new Date();
        const start = new Date(targetDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(targetDate);
        end.setHours(23, 59, 59, 999);
 
        const dayFilter = { date: { $gte: start, $lte: end } };
 
        const [scheduled, waiting, completed] = await Promise.all([
            appointmentsModel.countDocuments({ ...dayFilter, status: { $in: ["scheduled", "confirmed", "completed"] } }),
            appointmentsModel.countDocuments({ ...dayFilter, status: "confirmed" }),
            appointmentsModel.countDocuments({ ...dayFilter, status: "completed" }),
        ]);
 
        // 1. Buscar próxima cita confirmada HOY con hora >= ahora
        let nextAppointment = await appointmentsModel
            .findOne({ ...dayFilter, status: "confirmed", start_time: { $gte: currentTimeString() } })
            .sort({ start_time: 1 })
            .populate("doctor_id", "name last_name specialty img_url")
            .populate({ path: "patient_id", model: "Patients", select: "name last_name" });
 
        // 2. Si no quedan citas confirmadas hoy, buscar la siguiente en días futuros
        if (!nextAppointment) {
            nextAppointment = await appointmentsModel
                .findOne({ date: { $gt: end }, status: "confirmed" })
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
 
// Helper: hora actual en formato "HH:mm" para comparar contra start_time (string)
function currentTimeString() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
}

//SELECT BY ID
appointmentsController.getAppointmentById = async (req, res) => {
    try {
        const { id } = req.params;

        await expirePendingAppointments();

        // Buscamos por ID y le aplicamos el populate para tener los datos del paciente completo
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

appointmentsController.getAvailableSlots = async (req, res) => {
    try {
        const { doctor_id, date, duration = 30 } = req.query;

        if (!doctor_id || !date) {
            return res.status(400).json({
                message: "doctor_id y date son obligatorios"
            });
        }

        const appointmentDate = new Date(date);

        // Todas las citas del doctor ese día
        const appointments = await appointmentsModel.find({
            doctor_id,
            date: {
                $gte: new Date(
                    appointmentDate.getFullYear(),
                    appointmentDate.getMonth(),
                    appointmentDate.getDate()
                ),
                $lt: new Date(
                    appointmentDate.getFullYear(),
                    appointmentDate.getMonth(),
                    appointmentDate.getDate() + 1
                )
            },
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

        const toMinutes = (time) => {
            const [clock, period] = time.split(" ");
            let [h, m] = clock.split(":").map(Number);

            if (period === "PM" && h !== 12) h += 12;
            if (period === "AM" && h === 12) h = 0;

            return h * 60 + m;
        };

        const clinicClose = toMinutes("5:00 PM");

        const availableSlots = allSlots.filter(slot => {
            const start = toMinutes(slot);

            // Que termine antes de cerrar
            if (start + Number(duration) > clinicClose)
                return false;

            // Que no esté ocupado
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

//INSERT
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

        //VALIDACIONES
        //Sanitizar
        type = type?.trim();
        description = description?.trim();
        cancellation_reason = cancellation_reason?.trim();

        //campos requeridos
        if (!doctor_id || !patient_id || !type || date == null || !start_time || !end_time || duration_minutes == null || !status || total == null) {
            return res.status(400).json({ message: "Please fill all the required fields." });
        }

        //Longitud de caracteres
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

//UPDATE
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

        //VALIDACIONES
        //Sanitizar
        type = type?.trim();
        description = description?.trim();
        cancellation_reason = cancellation_reason?.trim();

        //campos requeridos
        if (!doctor_id || !patient_id || !type || date == null || !start_time || !end_time || duration_minutes == null || !status || total == null) {
            return res.status(400).json({ message: "Please fill all the required fields." });
        }

        //Longitud de caracteres
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

//DELETE
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

//PATCH de status
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

//Get de historial
appointmentsController.getAppointmentsHistory = async (req, res) => {
    try {
        const { date, limit = 5 } = req.query;
 
        const targetDate = date ? new Date(date) : new Date();
        const start = new Date(targetDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(targetDate);
        end.setHours(23, 59, 59, 999);
 
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
