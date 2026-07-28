import mongoose from "mongoose";
import consultationsModel from "../../models/consultations/consultation.js";
import prescriptionsModel from "../../models/consultations/prescription.js"
import patientsModel from "../../models/patients/patients.js";
const consultationController = {};

//Select
consultationController.getConsultations = async (req, res) => {
  try {
    const { patient_id } = req.query;
    const filters = {};
    if (patient_id) {
      filters.patient_id = patient_id;
    }

    const consultations = await consultationsModel
      .find(filters)
      .populate("patient_id")
      .populate({
        path: "appointment_id",
        populate: { path: "doctor_id", select: "name last_name" },
      });

    // Adjuntamos la prescripción de cada consulta (misma relación que ya usa
    // getConsultationById), para no obligar al frontend a pedirlas aparte.
    const consultationIds = consultations.map((c) => c._id);
    const prescriptions = await prescriptionsModel.find({
      consultation_id: { $in: consultationIds },
    });
    const prescriptionByConsultationId = new Map(
      prescriptions.map((p) => [String(p.consultation_id), p])
    );

    const responseData = consultations.map((c) => ({
      ...c.toObject(),
      prescription: prescriptionByConsultationId.get(String(c._id)) || null,
    }));

    return res.status(200).json(responseData);
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
      prescription,
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
    if (
      prescription?.medications?.length ||
      prescription?.lab_orders?.length ||
      prescription?.post_operative_instructions
    ) {
      const newPrescription = new prescriptionsModel({
        consultation_id: savedConsultation._id, // Enlazamos con el id que acabamos de crear
        medications: prescription.medications || [],
        lab_orders: prescription.lab_orders || [],
        post_operative_instructions: prescription.post_operative_instructions,
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
      clinical_history,
      prescription,
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
    if (prescription) {
      await prescriptionsModel.findOneAndUpdate(
        { consultation_id: req.params.id },
        {
          consultation_id: req.params.id,
          medications: prescription.medications || [],
          lab_orders: prescription.lab_orders || [],
          post_operative_instructions: prescription.post_operative_instructions,
        },
        { session, upsert: true, new: true, runValidators: true }
      );
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

//Select by id
consultationController.getConsultationById = async (req, res) => {
  try {
    const { id } = req.params;

    const consultation = await consultationsModel.findById(id).populate("patient_id").populate("appointment_id");

    if (!consultation) {
      return res.status(404).json({ message: "Consultation not found" });
    }

    //Buscamos si hay alguna prescripcion asociada a la consulta
    const prescription = await prescriptionsModel.findOne({ consultation_id: id });

    //Juntamos la informacion en una sola respuesta, para eso lo convertimos en un objeto plano de js
    const responseData = {
      //Los ... sirven para copiar toda las propiedades de consultation y pegarlas, para asi poder crear un solo objeto con ambos json
      ...consultation.toObject(),
      prescription: prescription || null
    }

    return res.status(200).json(responseData);
  } catch (error) {

    console.log("error " + error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

//Metodo que me permite mostrar las citas, y poder generar una consulta
consultationController.getConsultationByAppointmentId = async (req, res) => {
  try {
    const { appointmentId } = req.params;

    // Validación previa para asegurar que el parámetro sea un ObjectId válido de Mongo
    if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
      return res.status(400).json({ message: "El ID de la cita provisto no es válido." });
    }

    const consultation = await consultationsModel
      .findOne({ appointment_id: appointmentId })
      .populate("patient_id")
      .populate("appointment_id");

    if (!consultation) {
      return res.status(200).json({ data: null, message: "No hay consulta previa" });
    }

    const prescription = await prescriptionsModel.findOne({ consultation_id: consultation._id });

    const responseData = {
      ...consultation.toObject(),
      prescription: prescription || null,
    };

    return res.status(200).json(responseData);
  } catch (error) {
    console.log("error " + error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


export default consultationController;
