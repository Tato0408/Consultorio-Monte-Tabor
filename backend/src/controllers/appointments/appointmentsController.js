import appointmentsModel from "../../models/appointments/appointments.js";

const appointmentsController = {};

//SELECT
appointmentsController.getAppointments = async (req, res) => {
    try {
        const appointments = await appointmentsModel.find()
            .populate("patient_id", "name last_name")
            .populate("doctor_id", "name last_name")
            .populate("nurse_id", "name last_name");

        return res.status(200).json(appointments);
    } catch (error) {
        console.log("error" + error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

//SELECT BY ID
appointmentsController.getAppointmentById = async (req, res) => {
    try {
        const { id } = req.params;

        // Buscamos por ID y le aplicamos el populate para tener los datos del paciente completo
        const appointment = await appointmentsModel.findById(id)
            .populate("patient_id", "name last_name")
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

//INSERT
appointmentsController.insertAppointment = async (req, res) => {
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
            "cancelled"
        ];

        if (!validStatus.includes(status)) {
            return res.status(400).json({ message: "Invalid appointment status" });
        }

        const newAppointment = new appointmentsModel({
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
            "cancelled"
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