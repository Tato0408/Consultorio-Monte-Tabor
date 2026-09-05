import sickLeavesModel from "../../models/sickLeaves/sickLeave.js";

const sickLeaveController = {};

//Select (opcionalmente filtrado por paciente)
sickLeaveController.getSickLeaves = async (req, res) => {
  try {
    const { patient_id } = req.query;
    const filters = {};
    if (patient_id) {
      filters.patient_id = patient_id;
    }

    const sickLeaves = await sickLeavesModel
      .find(filters)
      .populate("doctor_id", "name last_name")
      .populate("nurse_id", "name last_name")
      .sort({ start_date: -1 });

    return res.status(200).json(sickLeaves);
  } catch (error) {
    console.log("error" + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

//Insert
sickLeaveController.createSickLeave = async (req, res) => {
  try {
    const {
      patient_id,
      doctor_id,
      nurse_id,
      consultation_id,
      diagnosis,
      start_date,
      end_date,
      status,
    } = req.body;

    const newSickLeave = new sickLeavesModel({
      patient_id,
      doctor_id,
      nurse_id,
      consultation_id,
      diagnosis,
      start_date,
      end_date,
      status,
    });

    const savedSickLeave = await newSickLeave.save();
    return res.status(200).json({ message: "Incapacidad guardada", data: savedSickLeave });
  } catch (error) {
    console.log("error" + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

//Update
// Solo pisa los campos que realmente llegaron en el body (igual que
// updateVitalSign/updateHereditary en patientsController.js): así el
// formulario de edición del expediente (que no manda patient_id,
// consultation_id ni status) nunca borra esos campos sin querer.
sickLeaveController.updateSickLeave = async (req, res) => {
  try {
    const {
      patient_id,
      doctor_id,
      nurse_id,
      consultation_id,
      diagnosis,
      start_date,
      end_date,
      status,
    } = req.body;

    const sickLeave = await sickLeavesModel.findById(req.params.id);
    if (!sickLeave) {
      return res.status(404).json({ message: "Incapacidad no encontrada" });
    }

    if (patient_id !== undefined) sickLeave.patient_id = patient_id;
    if (doctor_id !== undefined) sickLeave.doctor_id = doctor_id;
    if (nurse_id !== undefined) sickLeave.nurse_id = nurse_id;
    if (consultation_id !== undefined) sickLeave.consultation_id = consultation_id;
    if (diagnosis !== undefined) sickLeave.diagnosis = diagnosis;
    if (start_date !== undefined) sickLeave.start_date = start_date;
    if (end_date !== undefined) sickLeave.end_date = end_date;
    if (status !== undefined) sickLeave.status = status;

    await sickLeave.save();
    return res.status(200).json({ message: "Incapacidad actualizada", data: sickLeave });
  } catch (error) {
    console.log("error" + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

//Delete
sickLeaveController.deleteSickLeave = async (req, res) => {
  try {
    const sickLeaveDeleted = await sickLeavesModel.findByIdAndDelete(req.params.id);

    if (!sickLeaveDeleted) {
      return res.status(404).json({ message: "Incapacidad no encontrada" });
    }
    return res.status(200).json({ message: "Incapacidad eliminada" });
  } catch (error) {
    console.log("error" + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

export default sickLeaveController;
