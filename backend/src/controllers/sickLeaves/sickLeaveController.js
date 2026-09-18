import sickLeavesModel from "../../models/sickLeaves/sickLeave.js";
import { isPatientInactive, getInactivePatientIds, assertActiveParties } from "../../utils/activeScope.js";
import { getMissingRequiredField } from "../../utils/validators.js";

const sickLeaveController = {};

//Select (opcionalmente filtrado por paciente)
sickLeaveController.getSickLeaves = async (req, res) => {
  try {
    const { patient_id } = req.query;
    const filters = {};
    if (patient_id) {
      // Un paciente inactivo no muestra sus incapacidades en el expediente.
      if (await isPatientInactive(patient_id)) {
        return res.status(200).json([]);
      }
      filters.patient_id = patient_id;
    } else {
      // Lista general: se excluyen las incapacidades de pacientes inactivos.
      const inactivePatientIds = await getInactivePatientIds();
      if (inactivePatientIds.length) {
        filters.patient_id = { $nin: inactivePatientIds };
      }
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

    // Antes se guardaba lo que llegara sin exigir nada: un POST incompleto
    // podía crear una incapacidad fantasma (sin paciente, sin diagnóstico ni
    // fechas), visible luego con datos vacíos en el expediente y el portal
    // del paciente — mismo patrón ya corregido para citas y referencias.
    const requiredError = getMissingRequiredField(
      { patient_id, diagnosis, start_date, end_date },
      ["patient_id", "diagnosis", "start_date", "end_date"]
    );
    if (requiredError) {
      return res.status(400).json({ message: requiredError });
    }

    if (new Date(end_date) < new Date(start_date)) {
      return res.status(400).json({ message: "La fecha de fin no puede ser anterior a la fecha de inicio." });
    }

    const inactivePartyError = await assertActiveParties({ patientId: patient_id, doctorId: doctor_id });
    if (inactivePartyError) {
      return res.status(400).json({ message: inactivePartyError });
    }

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

    // Un campo obligatorio que sí llega en el body no puede vaciarse (mismo
    // criterio que la creación); uno que ni siquiera llega se deja tal cual
    // estaba, para no romper una edición parcial.
    if (patient_id !== undefined && !String(patient_id).trim()) {
      return res.status(400).json({ message: "El campo Paciente no puede estar vacío" });
    }
    if (diagnosis !== undefined && !String(diagnosis).trim()) {
      return res.status(400).json({ message: "El campo Diagnóstico no puede estar vacío" });
    }
    if (start_date !== undefined && !start_date) {
      return res.status(400).json({ message: "El campo Fecha de inicio no puede estar vacío" });
    }
    if (end_date !== undefined && !end_date) {
      return res.status(400).json({ message: "El campo Fecha de fin no puede estar vacío" });
    }

    const resolvedStart = start_date !== undefined ? start_date : sickLeave.start_date;
    const resolvedEnd = end_date !== undefined ? end_date : sickLeave.end_date;
    if (resolvedStart && resolvedEnd && new Date(resolvedEnd) < new Date(resolvedStart)) {
      return res.status(400).json({ message: "La fecha de fin no puede ser anterior a la fecha de inicio." });
    }

    const resolvedPatientId = patient_id !== undefined ? patient_id : sickLeave.patient_id;
    const resolvedDoctorId = doctor_id !== undefined ? doctor_id : sickLeave.doctor_id;
    const inactivePartyError = await assertActiveParties({ patientId: resolvedPatientId, doctorId: resolvedDoctorId });
    if (inactivePartyError) {
      return res.status(400).json({ message: inactivePartyError });
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
