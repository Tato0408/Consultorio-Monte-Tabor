import mongoose from "mongoose";
import consultationsModel from "../../models/consultations/consultation.js";
import prescriptionsModel from "../../models/consultations/prescription.js"
import patientsModel from "../../models/patients/patients.js";
import doctorsModel from "../../models/doctors/doctors.js";
import proceduresModel from "../../models/procedures/procedures.js";
const consultationController = {};

// Convierte el triage de la consulta al shape de Patients.clinical_history.vital_signs — null si
// no se capturó ningún signo vital (para no empujar un registro vacío al historial).
// El triage se captura en cm (así lo tipea el doctor, ver TriageCard.jsx); el expediente lo
// muestra en metros, por eso se convierte aquí.
const buildVitalSignsEntry = (triage, consultationDate) => {
  if (!triage) return null;
  const { blood_pressure, glucose, weight, height, temperature, oxygen_saturation } = triage;
  const hasAny = [blood_pressure, glucose, weight, height, temperature, oxygen_saturation]
    .some((v) => v !== undefined && v !== null && v !== "");
  if (!hasAny) return null;

  const weightNum = weight !== undefined && weight !== null && weight !== "" ? Number(weight) : null;
  const heightM = height !== undefined && height !== null && height !== "" ? Number(height) / 100 : null;
  const imc = weightNum && heightM ? Math.round((weightNum / (heightM * heightM)) * 10) / 10 : undefined;

  return {
    blood_pressure: blood_pressure || undefined,
    glucosa_mgdl: glucose !== undefined && glucose !== null && glucose !== "" ? Number(glucose) : undefined,
    weight: weightNum ?? undefined,
    height: heightM ?? undefined,
    imc,
    temperature: temperature !== undefined && temperature !== null && temperature !== "" ? Number(temperature) : undefined,
    spo2: oxygen_saturation !== undefined && oxygen_saturation !== null && oxygen_saturation !== "" ? Number(oxygen_saturation) : undefined,
    last_date_taken: consultationDate || new Date(),
  };
};

// Descarta filas de antecedentes completamente vacías (el doctor dejó la fila sin llenar).
const nonEmptyRows = (rows, keys) =>
  (Array.isArray(rows) ? rows : []).filter((row) => keys.some((k) => String(row?.[k] || "").trim() !== ""));

// Arma el update ($set + $push) de Patients.clinical_history a partir de lo que el doctor cargó
// en esta consulta. hereditary/pathological/antecedentes de texto se REEMPLAZAN por completo: el
// formulario de consulta ya precarga lo que el paciente tenía registrado (ver
// useConsultation.js -> getPatientAntecedents), así que lo que llega aquí YA es la versión
// editada por el doctor, no una lista parcial. Signos vitales y procedimientos en cambio se
// ACUMULAN como historial (cada consulta agrega una toma/entrada nueva, no reemplaza la anterior).
const buildClinicalHistoryUpdate = async ({ clinical_data, antecedents, procedure, consultationId, consultationDate, followUpDate }) => {
  const set = {};
  const push = {};

  if (antecedents) {
    set["clinical_history.hereditary"] = nonEmptyRows(antecedents.hereditary, ["relative", "condition"])
      .map((h) => ({ relationship: h.relative, condition: h.condition }));
    set["clinical_history.pathological"] = nonEmptyRows(antecedents.pathological, ["disease", "type"])
      .map((p) => ({ disease: p.disease, diagnosis: p.type }));
    set["clinical_history.non_pathological"] = nonEmptyRows(antecedents.non_pathological, ["description"])
      .map((r) => r.description).join("\n");
    set["clinical_history.ecologycal_social"] = nonEmptyRows(antecedents.socio_ecological, ["description"])
      .map((r) => r.description).join("\n");
  }

  const vitalSignsEntry = buildVitalSignsEntry(clinical_data?.triage, consultationDate);
  if (vitalSignsEntry) {
    push["clinical_history.vital_signs"] = vitalSignsEntry;
  }

  const procedureRows = (procedure || []).filter((p) => p?.procedure_id);
  if (procedureRows.length) {
    const procedureIds = [...new Set(procedureRows.map((p) => p.procedure_id))];
    const doctorIds = [...new Set(procedureRows.map((p) => p.doctor_id).filter(Boolean))];
    const [procedureDocs, doctorDocs] = await Promise.all([
      proceduresModel.find({ _id: { $in: procedureIds } }).select("name").lean(),
      doctorsModel.find({ _id: { $in: doctorIds } }).select("name last_name").lean(),
    ]);
    const procedureNameById = new Map(procedureDocs.map((p) => [String(p._id), p.name]));
    const doctorNameById = new Map(doctorDocs.map((d) => [String(d._id), `${d.name} ${d.last_name}`]));

    push["clinical_history.procedures"] = {
      $each: procedureRows.map((p) => ({
        procedure_id: p.procedure_id,
        procedure_name: procedureNameById.get(String(p.procedure_id)) || "Procedimiento",
        consultation_id: consultationId,
        doctor_id: p.doctor_id || undefined,
        doctor_name: p.doctor_id ? doctorNameById.get(String(p.doctor_id)) || "" : "",
        date: consultationDate || new Date(),
        diagnosis: clinical_data?.diagnosis_description || clinical_data?.diagnosis || undefined,
        follow_up_date: followUpDate || undefined,
      })),
    };
  }

  const update = {};
  if (Object.keys(set).length) update.$set = set;
  if (Object.keys(push).length) update.$push = push;
  return Object.keys(update).length ? update : null;
};

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
    return res.status(500).json({ message: "Error interno del servidor" });
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
      antecedents,
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

    // Sincroniza el expediente del paciente (signos vitales, antecedentes, procedimientos) con
    // lo que el doctor acaba de registrar en esta consulta — así el Expediente Clínico deja de
    // depender de un flujo aparte que nunca existió.
    const patientUpdate = await buildClinicalHistoryUpdate({
      clinical_data,
      antecedents,
      procedure,
      consultationId: savedConsultation._id,
      consultationDate: savedConsultation.date,
      followUpDate: follow_up_date,
    });
    if (patientUpdate) {
      await patientsModel.findByIdAndUpdate(patient_id, patientUpdate, {
        session,
        new: true,
        runValidators: true,
      });
    }
    //Ahora que todos los cambios temporales son confirmados los guarda en la base de datos
    await session.commitTransaction();
    //Cerramos el canal de la session
    session.endSession();

    return res.status(200).json({ message: "Consulta guardada" });
  } catch (error) {
    //Si algo ocurre mal, no inserta ningun dato
    await session.abortTransaction();
    session.endSession();
    console.log("error" + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

//Delete
consultationController.deleteConsultation = async (req, res) => {
  try {
    const consultationDeleted = await consultationsModel.findByIdAndDelete(
      req.params.id
    );

    if (!consultationDeleted) {
      return res.status(404).json({ message: "Consulta no encontrada" });
    }
    return res.status(200).json({ message: "Consulta eliminada" });
  } catch (error) {
    console.log("error" + error);
    return res.status(500).json({ message: "Error interno del servidor" });
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
      antecedents,
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
      return res.status(404).json({ message: "Consulta no encontrada" });
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
    // Misma sincronización que insertConsultation — al editar una consulta ya existente
    // (ej. completar el registro de una cita en curso) el expediente del paciente también
    // debe quedar al día.
    const patientUpdate = await buildClinicalHistoryUpdate({
      clinical_data,
      antecedents,
      procedure,
      consultationId: consultationUpdated._id,
      consultationDate: consultationUpdated.date,
      followUpDate: follow_up_date,
    });
    if (patientUpdate) {
      await patientsModel.findByIdAndUpdate(patient_id, patientUpdate, {
        session,
        new: true,
        runValidators: true,
      });
    }
    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({ message: "Consulta actualizada" });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();
    console.log("error" + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

//Select by id
consultationController.getConsultationById = async (req, res) => {
  try {
    const { id } = req.params;

    const consultation = await consultationsModel.findById(id).populate("patient_id").populate("appointment_id");

    if (!consultation) {
      return res.status(404).json({ message: "Consulta no encontrada" });
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
    return res.status(500).json({ message: "Error interno del servidor" });
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
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};


export default consultationController;
