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
      .sort({ start_date: -1 });

    return res.status(200).json(sickLeaves);
  } catch (error) {
    console.log("error" + error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

//Insert
sickLeaveController.createSickLeave = async (req, res) => {
  try {
    const {
      patient_id,
      doctor_id,
      consultation_id,
      diagnosis,
      start_date,
      end_date,
      status,
    } = req.body;

    const newSickLeave = new sickLeavesModel({
      patient_id,
      doctor_id,
      consultation_id,
      diagnosis,
      start_date,
      end_date,
      status,
    });

    const savedSickLeave = await newSickLeave.save();
    return res.status(200).json({ message: "Sick leave saved", data: savedSickLeave });
  } catch (error) {
    console.log("error" + error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

//Update
sickLeaveController.updateSickLeave = async (req, res) => {
  try {
    const {
      patient_id,
      doctor_id,
      consultation_id,
      diagnosis,
      start_date,
      end_date,
      status,
    } = req.body;

    const sickLeaveUpdated = await sickLeavesModel.findByIdAndUpdate(
      req.params.id,
      { patient_id, doctor_id, consultation_id, diagnosis, start_date, end_date, status },
      { new: true }
    );

    if (!sickLeaveUpdated) {
      return res.status(404).json({ message: "Sick leave not found" });
    }
    return res.status(200).json({ message: "Sick leave updated", data: sickLeaveUpdated });
  } catch (error) {
    console.log("error" + error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

//Delete
sickLeaveController.deleteSickLeave = async (req, res) => {
  try {
    const sickLeaveDeleted = await sickLeavesModel.findByIdAndDelete(req.params.id);

    if (!sickLeaveDeleted) {
      return res.status(404).json({ message: "Sick leave not found" });
    }
    return res.status(200).json({ message: "Sick leave deleted" });
  } catch (error) {
    console.log("error" + error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export default sickLeaveController;
