import mongoose from "mongoose";
import prescriptionsModel from "../../models/consultations/prescription.js";
import consultationsModel from "../../models/consultations/consultation.js";

const prescriptionController = {};

// GET /prescriptions?patient_id=... — recetas de un paciente, una por cada
// consulta en la que se emitió (así, un PDF de receta = un documento en el
// expediente). Usado por la pestaña de Documentos. Sin patient_id no
// devuelve nada, mismo criterio que lab-orders y sick-leaves.
prescriptionController.getPrescriptions = async (req, res) => {
  try {
    const { patient_id } = req.query;
    if (!patient_id || !mongoose.Types.ObjectId.isValid(patient_id)) {
      return res.status(200).json([]);
    }

    const consultations = await consultationsModel
      .find({ patient_id })
      .select("date appointment_id")
      .populate({
        path: "appointment_id",
        select: "doctor_id nurse_id",
        populate: [
          { path: "doctor_id", select: "name last_name" },
          { path: "nurse_id", select: "name last_name" },
        ],
      });
    const consultationById = new Map(consultations.map((c) => [String(c._id), c]));

    const prescriptions = await prescriptionsModel
      .find({ consultation_id: { $in: [...consultationById.keys()] } })
      .sort({ issued_at: -1, createdAt: -1 });

    const responseData = prescriptions.map((p) => ({
      ...p.toObject(),
      consultation_id: consultationById.get(String(p.consultation_id)) || null,
    }));

    return res.status(200).json(responseData);
  } catch (error) {
    console.log("error" + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

//Update
// Solo pisa los campos que realmente llegaron en el body, igual criterio que
// sickLeaveController.updateSickLeave: editar una receta desde el expediente
// no debería poder desligarla de su consulta.
prescriptionController.updatePrescription = async (req, res) => {
  try {
    const { medications, post_operative_instructions } = req.body;

    const prescription = await prescriptionsModel.findById(req.params.id);
    if (!prescription) {
      return res.status(404).json({ message: "Receta no encontrada" });
    }

    if (medications !== undefined) prescription.medications = medications;
    if (post_operative_instructions !== undefined) {
      prescription.post_operative_instructions = post_operative_instructions;
    }

    await prescription.save();
    return res.status(200).json({ message: "Receta actualizada", data: prescription });
  } catch (error) {
    console.log("error" + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

//Delete
prescriptionController.deletePrescription = async (req, res) => {
  try {
    const prescriptionDeleted = await prescriptionsModel.findByIdAndDelete(req.params.id);

    if (!prescriptionDeleted) {
      return res.status(404).json({ message: "Receta no encontrada" });
    }
    return res.status(200).json({ message: "Receta eliminada" });
  } catch (error) {
    console.log("error" + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

export default prescriptionController;
