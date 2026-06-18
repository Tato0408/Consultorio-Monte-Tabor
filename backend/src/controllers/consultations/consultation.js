import mongoose from "mongoose";
import consultationsModel from "../../models/consultations/consultation.js";
import patientsModel from "../../models/patients/patients.js";
const consultationController = {};

//Select
consultationController.getConsultations = async (req, res) => {
  try {
    const consultations = await consultationsModel
      .find()
      .populate("patient_id")
      .populate("appointment_id");
    return res.status(200).json(consultations);
  } catch (error) {
    console.log("error" + error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

//Insert
consultationController.insertConsultation = async (req, res) => {
    const session = await mongoose.startSession()
  try {
    session.startTransaction()

    const {
      appointment_id,
      patient_id,
      clinical_data,
      pysical_exam,
      procedure,
      follow_up_date,
      referral,
      clinical_history,
    } = req.body;

    const newConsultation = new consultationsModel({
      appointment_id,
      patient_id,
      clinical_data,
      pysical_exam,
      procedure,
      follow_up_date,
      referral,
    });

    //Guardar en la base de datos
    await newConsultation.save({ session });

    if (clinical_history) {
      await patientsModel.findByIdAndUpdate(
        patient_id,
        {
          $set: { clinical_history: clinical_history },
        },
        { session, new: true, runValidators: true } // Se ejecuta bajo la misma transacción
      );
    }
    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({ message: "Consultation saved" });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.log("error" + error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

//Delete
consultationController.deleteConsultation = async (req, res) => {
  try {
    const consultationDeleted = await consultationsModel.findByIdAndDelete(
      req.params.id
    );

    if (!consultationDeleted) {
      return res.status(404).json({ message: "Consultation not found" });
    }
    return res.status(200).json({ message: "Consultation deleted" });
  } catch (error) {
    console.log("error" + error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

//Update
consultationController.updateConsultation = async (req, res) => {
  try {
    const {
      appointment_id,
      patient_id,
      clinical_data,
      pysical_exam,
      procedure,
      follow_up_date,
      referral,
    } = req.body;

    const consultationUpdated =  await consultationsModel.findByIdAndUpdate(
      req.params.id,
      {
        appointment_id,
        patient_id,
        clinical_data,
        pysical_exam,
        procedure,
        follow_up_date,
        referral,
      },
      {
        new: true,
      }
    );

    if(!consultationUpdated){
        return res.status(404).json({ message: "Consultation not found" });
    }

    return res.status(200).json({ message: "Provider updated" });
  } catch (error) {
    console.log("error" + error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export default consultationController;
