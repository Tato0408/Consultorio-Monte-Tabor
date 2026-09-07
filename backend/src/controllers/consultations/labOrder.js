import mongoose from "mongoose";
import labOrdersModel from "../../models/consultations/labOrder.js";
import { isPatientInactive } from "../../utils/activeScope.js";

const labOrderController = {};

// Normaliza el cuerpo que llega del formulario a los campos que guarda el
// modelo. Los números vienen como texto desde el input, se castean acá.
const buildLabOrderData = (body) => {
    const toNumber = (value) =>
        value === undefined || value === null || value === "" ? undefined : Number(value);

    return {
        patient_id: body.patient_id || undefined,
        tests: Array.isArray(body.tests) ? body.tests.filter((t) => typeof t === "string" && t) : [],
        pregnancy: body.pregnancy || "",
        antibiotic_treatment: body.antibiotic_treatment || "",
        other_tests: body.other_tests || "",
        weight: toNumber(body.weight),
        height: toNumber(body.height),
    };
};

// Una orden vacía (sin ningún examen marcado y sin nada escrito en "Otros")
// no tiene sentido: no hay nada que el laboratorio pueda procesar. Se valida
// acá (no solo en el frontend) para que ninguna orden vacía pueda guardarse
// sin importar desde dónde se mande la petición.
const hasAtLeastOneTest = (data) =>
    (Array.isArray(data.tests) && data.tests.length > 0) || Boolean(data.other_tests?.trim());

// GET /lab-orders/by-appointment/:appointmentId — orden de esa cita, o null.
labOrderController.getByAppointment = async (req, res) => {
    try {
        const { appointmentId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
            return res.status(400).json({ message: "El ID de la cita provisto no es válido." });
        }

        const labOrder = await labOrdersModel.findOne({ appointment_id: appointmentId });
        return res.status(200).json(labOrder || null);
    } catch (error) {
        console.log("error " + error);
        return res.status(500).json({ message: "Error interno del servidor" });
    }
};

// GET /lab-orders?patient_id=... — órdenes ya finalizadas de un paciente,
// usado por el expediente clínico. Sin patient_id no devuelve nada, para no
// exponer todas las órdenes del sistema por accidente.
labOrderController.list = async (req, res) => {
    try {
        const { patient_id } = req.query;
        if (!patient_id || !mongoose.Types.ObjectId.isValid(patient_id)) {
            return res.status(200).json([]);
        }

        // Un paciente inactivo no muestra sus ordenes de laboratorio.
        if (await isPatientInactive(patient_id)) {
            return res.status(200).json([]);
        }

        const labOrders = await labOrdersModel
            .find({ patient_id, consultation_id: { $ne: null } })
            .populate("patient_id", "name last_name dui birth_date gender")
            .populate({
                path: "consultation_id",
                select: "date appointment_id",
                populate: {
                    path: "appointment_id",
                    select: "doctor_id nurse_id",
                    populate: [
                        { path: "doctor_id", select: "name last_name" },
                        { path: "nurse_id", select: "name last_name" },
                    ],
                },
            })
            .sort({ issued_at: -1, createdAt: -1 });

        return res.status(200).json(labOrders);
    } catch (error) {
        console.log("error " + error);
        return res.status(500).json({ message: "Error interno del servidor" });
    }
};

// POST /lab-orders — crea o actualiza (upsert por appointment_id) la orden de
// una cita. NO toca consultation_id: ese enlace lo hace consultation.js al
// finalizar la consulta.
labOrderController.upsert = async (req, res) => {
    try {
        const { appointment_id } = req.body;

        if (!mongoose.Types.ObjectId.isValid(appointment_id)) {
            return res.status(400).json({ message: "El ID de la cita provisto no es válido." });
        }

        const data = buildLabOrderData(req.body);

        if (!hasAtLeastOneTest(data)) {
            return res.status(400).json({ message: "Marca al menos un examen (o escribe algo en \"Otros\") antes de guardar la orden de laboratorio." });
        }

        const labOrder = await labOrdersModel.findOneAndUpdate(
            { appointment_id },
            {
                $set: data,
                // issued_at solo se fija al crear la orden por primera vez; al
                // finalizar la consulta se vuelve a fijar con la fecha real de
                // la consulta (ver consultation.js). appointment_id lo fija Mongo
                // solo desde el filtro, no se repite acá para no chocar.
                $setOnInsert: { issued_at: new Date() },
            },
            { upsert: true, new: true, runValidators: true }
        );

        return res.status(200).json(labOrder);
    } catch (error) {
        console.log("error " + error);
        return res.status(500).json({ message: "Error interno del servidor" });
    }
};

// PUT /lab-orders/:id — edita una orden ya finalizada desde la pestaña de
// Documentos del expediente (a diferencia de upsert, que trabaja por
// appointment_id mientras la consulta sigue en curso).
labOrderController.updateById = async (req, res) => {
    try {
        const labOrder = await labOrdersModel.findById(req.params.id);
        if (!labOrder) {
            return res.status(404).json({ message: "Orden de laboratorio no encontrada" });
        }

        const data = buildLabOrderData(req.body);
        // patient_id no viene del formulario de edición (buildLabOrderData lo
        // deja undefined si no llega): no se debe pisar el dueño real de la orden.
        delete data.patient_id;

        if (!hasAtLeastOneTest(data)) {
            return res.status(400).json({ message: "Marca al menos un examen (o escribe algo en \"Otros\") antes de guardar la orden de laboratorio." });
        }

        Object.assign(labOrder, data);
        await labOrder.save();
        return res.status(200).json(labOrder);
    } catch (error) {
        console.log("error " + error);
        return res.status(500).json({ message: "Error interno del servidor" });
    }
};

// DELETE /lab-orders/:id — elimina una orden puntual desde el expediente.
labOrderController.removeById = async (req, res) => {
    try {
        const labOrderDeleted = await labOrdersModel.findByIdAndDelete(req.params.id);
        if (!labOrderDeleted) {
            return res.status(404).json({ message: "Orden de laboratorio no encontrada" });
        }
        return res.status(200).json({ message: "Orden de laboratorio eliminada" });
    } catch (error) {
        console.log("error " + error);
        return res.status(500).json({ message: "Error interno del servidor" });
    }
};

// DELETE /lab-orders/by-appointment/:appointmentId — limpieza puntual.
labOrderController.removeByAppointment = async (req, res) => {
    try {
        const { appointmentId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
            return res.status(400).json({ message: "El ID de la cita provisto no es válido." });
        }

        await labOrdersModel.deleteOne({ appointment_id: appointmentId });
        return res.status(200).json({ message: "Orden de laboratorio eliminada" });
    } catch (error) {
        console.log("error " + error);
        return res.status(500).json({ message: "Error interno del servidor" });
    }
};

export default labOrderController;
