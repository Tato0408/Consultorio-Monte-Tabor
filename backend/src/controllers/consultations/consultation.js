import mongoose from "mongoose";
import consultationsModel from "../../models/consultations/consultation.js";
import prescriptionsModel from "../../models/consultations/prescription.js"
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
  //La session nos deja hacer varias operaciones de una vez (como insertar en 2 colecciones en nuestro caso)
  const session = await mongoose.startSession()
  try {
    //A partir de aqui si no se confirma la session no se insertara nada
    session.startTransaction()

    const {
      appointment_id,
      patient_id,
      clinical_data,
      physical_exam,
      procedure,
      follow_up_date,
      referral,
      clinical_history,
      medications,
      lab_orders,
      post_operative_instructions
    } = req.body;

    const newConsultation = new consultationsModel({
      appointment_id,
      patient_id,
      clinical_data,
      physical_exam,
      procedure,
      follow_up_date,
      referral,
    });

    //Guardamos de manera temporal la consulta en el session
    const savedConsultation = await newConsultation.save({ session });

    //Si viene datos de medicamentos, ordenes de laboratorio o instrucciones de operacion
    if (medications || lab_orders || post_operative_instructions) {
      const newPrescription = new prescriptionsModel({
        consultation_id: savedConsultation._id, // Enlazamos con el id que acabamos de crear
        medications: medications || [],
        lab_orders: lab_orders || [],
        post_operative_instructions
      });
      //Guardamos de manera temporal la presciption en la session
      await newPrescription.save({ session });
    }


    if (clinical_history) {
      //Si viene con datos de la coleccion del paciente actualiza la informacion
      await patientsModel.findByIdAndUpdate(
        patient_id,
        {
          $set: { clinical_history: clinical_history },
        },
        //Actualiza al mismo tiempo que hace la insercion
        { session, new: true, runValidators: true } // Verifica que concuerde con el esquema de pacientes
      );
    }
    //Ahora que todos los cambios temporales son confirmados los guarda en la base de datos
    await session.commitTransaction();
    //Cerramos el canal de la session
    session.endSession();

    return res.status(200).json({ message: "Consultation saved" });
  } catch (error) {
    //Si algo ocurre mal, no inserta ningun dato
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

  const session = await mongoose.startSession();
  try {

    session.startTransaction();

    const {
      appointment_id,
      patient_id,
      clinical_data,
      physical_exam,
      procedure,
      follow_up_date,
      referral,
      clinical_history
    } = req.body;

    const consultationUpdated = await consultationsModel.findByIdAndUpdate(
      req.params.id,
      {
        appointment_id,
        patient_id,
        clinical_data,
        physical_exam,
        procedure,
        follow_up_date,
        referral,
      },
      {
        new: true,
        session
      }
    );

    if (!consultationUpdated) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Consultation not found" });
    }
    if (clinical_history) {
      await patientsModel.findByIdAndUpdate(
        patient_id,
        {
          $set: { clinical_history: clinical_history },
        },
        { session, new: true, runValidators: true }
      );
    }
    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({ message: "Consultation updated" });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();
    console.log("error" + error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export default consultationController;
