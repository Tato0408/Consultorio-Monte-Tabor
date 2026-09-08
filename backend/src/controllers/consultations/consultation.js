import mongoose from "mongoose";
import consultationsModel from "../../models/consultations/consultation.js";
import prescriptionsModel from "../../models/consultations/prescription.js"
import labOrdersModel from "../../models/consultations/labOrder.js";
import patientsModel from "../../models/patients/patients.js";
import doctorsModel from "../../models/doctors/doctors.js";
import proceduresModel from "../../models/procedures/procedures.js";
import inventoryController from "../inventory/inventoryController.js";
import { getVitalSignsError, getRequiredConsultationFieldsError } from "../../utils/validators.js";
import appointmentsModel from "../../models/appointments/appointments.js";
import { assertActiveParties, isPatientInactive } from "../../utils/activeScope.js";
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

// $set para enlazar una orden de laboratorio con su consulta al finalizarla:
// consultation_id (lo que la vuelve oficial), patient_id, fecha, y peso/talla
// del triage (solo si tienen valor, para no meter un cast inválido de "").
const buildLabOrderLink = (consultation, patientId, clinicalData) => {
  const set = {
    consultation_id: consultation._id,
    patient_id: patientId,
    issued_at: consultation.date || new Date(),
  };
  const weight = clinicalData?.triage?.weight;
  const height = clinicalData?.triage?.height;
  if (weight !== undefined && weight !== null && weight !== "") set.weight = Number(weight);
  if (height !== undefined && height !== null && height !== "") set.height = Number(height);
  return set;
};

// Descarta filas de antecedentes completamente vacías (el doctor dejó la fila sin llenar).
const nonEmptyRows = (rows, keys) =>
  (Array.isArray(rows) ? rows : []).filter((row) => keys.some((k) => String(row?.[k] || "").trim() !== ""));

// Descarta materiales sin insumo elegido (el doctor le dio "Agregar material" pero dejó el
// selector en blanco), si no se limpia aquí, Mongoose revienta al intentar castear "" como
// ObjectId al guardar la consulta, y de paso evita que se descuente inventario con cantidad 0.
const sanitizeProcedureRows = (procedure) =>
  (Array.isArray(procedure) ? procedure : []).map((p) => ({
    ...p,
    material_used: (Array.isArray(p?.material_used) ? p.material_used : [])
      .filter((m) => m?.inventory_id && Number(m.quantity) > 0),
  }));

// Arma el update ($set + $push) de Patients.clinical_history a partir de lo que el doctor cargó
// en esta consulta. hereditary/pathological/antecedentes de texto se REEMPLAZAN por completo: el
// formulario de consulta ya precarga lo que el paciente tenía registrado (ver
// useConsultation.js a getPatientAntecedents), así que lo que llega aquí YA es la versión
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

  // Se resuelven los nombres reales (no solo los ids) para poder etiquetar con algo legible el
  // movimiento de inventario que descuenta los materiales usados (ver applyMaterialUsageDelta
  // más abajo), y se devuelven junto con los mapas para que syncProcedureHistory
  // los reutilice sin tener que volver a consultar la colección.
  let procedureNames = [];
  let doctorName = "";
  let procedureNameById = new Map();
  let doctorNameById = new Map();

  const procedureRows = (procedure || []).filter((p) => p?.procedure_id);
  if (procedureRows.length) {
    const procedureIds = [...new Set(procedureRows.map((p) => p.procedure_id))];
    const doctorIds = [...new Set(procedureRows.map((p) => p.doctor_id).filter(Boolean))];
    const [procedureDocs, doctorDocs] = await Promise.all([
      proceduresModel.find({ _id: { $in: procedureIds } }).select("name").lean(),
      doctorsModel.find({ _id: { $in: doctorIds } }).select("name last_name").lean(),
    ]);
    procedureNameById = new Map(procedureDocs.map((p) => [String(p._id), p.name]));
    doctorNameById = new Map(doctorDocs.map((d) => [String(d._id), `${d.name} ${d.last_name}`]));

    procedureNames = procedureRows.map((p) => procedureNameById.get(String(p.procedure_id)) || "Procedimiento");
    doctorName = procedureRows.map((p) => p.doctor_id && doctorNameById.get(String(p.doctor_id))).find(Boolean) || "";
  }

  const update = {};
  if (Object.keys(set).length) update.$set = set;
  if (Object.keys(push).length) update.$push = push;
  return { update: Object.keys(update).length ? update : null, procedureNames, doctorName, procedureRows, procedureNameById, doctorNameById };
};

// Sincroniza Patients.clinical_history.procedures fila por fila, en vez de simplemente empujar
// lo que traiga la consulta cada vez que se guarda. 
const syncProcedureHistory = async ({ patientId, consultationId, procedureRows, procedureNameById, doctorNameById, consultationDate, diagnosisText, followUpDate, session }) => {
  for (const row of procedureRows) {
    const procedureName = procedureNameById.get(String(row.procedure_id)) || "Procedimiento";
    const doctorNm = row.doctor_id ? doctorNameById.get(String(row.doctor_id)) || "" : "";
    const entryFields = {
      procedure_name: procedureName,
      doctor_id: row.doctor_id || undefined,
      doctor_name: doctorNm,
      date: consultationDate || new Date(),
      diagnosis: diagnosisText,
      follow_up_date: followUpDate || undefined,
    };

    const setResult = await patientsModel.updateOne(
      {
        _id: patientId,
        "clinical_history.procedures": { $elemMatch: { consultation_id: consultationId, procedure_id: row.procedure_id } },
      },
      {
        $set: {
          "clinical_history.procedures.$.procedure_name": entryFields.procedure_name,
          "clinical_history.procedures.$.doctor_id": entryFields.doctor_id,
          "clinical_history.procedures.$.doctor_name": entryFields.doctor_name,
          "clinical_history.procedures.$.date": entryFields.date,
          "clinical_history.procedures.$.diagnosis": entryFields.diagnosis,
          "clinical_history.procedures.$.follow_up_date": entryFields.follow_up_date,
        },
      },
      { session, runValidators: true }
    );

    // matchedCount === 0 significa que esta fila (procedure_id) todavía no existía para esta
    // consulta — o es la primera vez que se guarda, o el doctor la agregó en esta edición.
    if (!setResult.matchedCount) {
      await patientsModel.updateOne(
        { _id: patientId },
        {
          $push: {
            "clinical_history.procedures": {
              procedure_id: row.procedure_id,
              consultation_id: consultationId,
              ...entryFields,
            },
          },
        },
        { session, runValidators: true }
      );
    }
  }
};

//Select
consultationController.getConsultations = async (req, res) => {
  try {
    const { patient_id } = req.query;
    const filters = {};
    if (patient_id) {
      filters.patient_id = patient_id;
    }

    // Un paciente inactivo no tiene consultas visibles en la interfaz de
    // consultas ni en su expediente.
    if (patient_id && (await isPatientInactive(patient_id))) {
      return res.status(200).json([]);
    }

    const consultations = await consultationsModel
      .find(filters)
      .populate("patient_id")
      .populate({
        path: "appointment_id",
        populate: [
          { path: "doctor_id", select: "name last_name is_active" },
          { path: "nurse_id", select: "name last_name" },
        ],
      });

    // Se ocultan las consultas cuyo paciente esta inactivo (caso lista
    // general, sin patient_id) o cuya cita quedo asignada a un doctor
    // inactivo.
    const visibleConsultations = consultations.filter(
      (c) => c.patient_id?.is_active !== false && c.appointment_id?.doctor_id?.is_active !== false
    );

    // Adjuntamos la prescripción de cada consulta (misma relación que ya usa
    // getConsultationById), para no obligar al frontend a pedirlas aparte.
    const consultationIds = visibleConsultations.map((c) => c._id);
    const prescriptions = await prescriptionsModel.find({
      consultation_id: { $in: consultationIds },
    });
    const prescriptionByConsultationId = new Map(
      prescriptions.map((p) => [String(p.consultation_id), p])
    );

    const responseData = visibleConsultations.map((c) => ({
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

    // Síntomas, triage básico y diagnóstico completo son los datos mínimos para registrar una
    // consulta (ver ConsultationForm.jsx) — el resto del formulario queda opcional.
    const requiredFieldsError = getRequiredConsultationFieldsError(clinical_data);
    if (requiredFieldsError) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: requiredFieldsError });
    }

    // No se registra una consulta de un paciente inactivo ni de una cita
    // asignada a un doctor inactivo: esa consulta no seria visible despues.
    const consultationAppointment = appointment_id
      ? await appointmentsModel.findById(appointment_id).select("doctor_id").lean()
      : null;
    const inactivePartyError = await assertActiveParties({
      patientId: patient_id,
      doctorId: consultationAppointment?.doctor_id,
    });
    if (inactivePartyError) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: inactivePartyError });
    }

    // El frontend (TriageCard.jsx) ya bloquea el signo "-" al escribir, pero el backend nunca
    // debe confiar solo en eso (ej. una llamada directa por Swagger) mismas reglas que ya
    // exige el expediente clínico para signos vitales (buildVitalSignsEntry hace la misma
    // conversión cm→m que usa Patients.clinical_history.vital_signs).
    const vitalSignsCheck = buildVitalSignsEntry(clinical_data?.triage, null);
    if (vitalSignsCheck) {
      const vitalsError = getVitalSignsError(vitalSignsCheck);
      if (vitalsError) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ message: vitalsError });
      }
    }

    const sanitizedProcedure = sanitizeProcedureRows(procedure);

    const newConsultation = new consultationsModel({
      appointment_id,
      patient_id,
      clinical_data,
      physical_exam,
      procedure: sanitizedProcedure,
      follow_up_date,
      referral,
    });

    //Guardamos de manera temporal la consulta en el session
    const savedConsultation = await newConsultation.save({ session });

    // El formulario de consulta (PrescriptionCard.jsx) manda este campo como
    // prescription.indications ("Indicaciones de seguimiento"), no
    // post_operative_instructions: se acepta cualquiera de los dos nombres
    // para no perder lo que el doctor escribió (post_operative_instructions
    // sigue soportado por si algún día llega por ahí, ej. una integración
    // futura).
    const postOperativeInstructions =
      prescription?.post_operative_instructions || prescription?.indications;

    //Si viene datos de medicamentos o instrucciones de operacion
    if (prescription?.medications?.length || postOperativeInstructions) {
      const newPrescription = new prescriptionsModel({
        consultation_id: savedConsultation._id, // Enlazamos con el id que acabamos de crear
        medications: prescription.medications || [],
        post_operative_instructions: postOperativeInstructions,
        // Momento en que se emite la receta, usado por el portal del paciente para
        // calcular qué medicamentos siguen activos hoy (ver fetchTodayMedications).
        issued_at: new Date(),
      });
      //Guardamos de manera temporal la presciption en la session
      await newPrescription.save({ session });
    }

    // La orden de laboratorio (opcional) se arma en una pantalla aparte y se
    // guarda por su cuenta con appointment_id. Acá, al finalizar la consulta,
    // se le enlaza el consultation_id: eso es lo que la vuelve oficial y
    // visible para el paciente (ver labOrderController.list / getMyLabOrders).
    // De paso se refresca peso/talla del triage por si cambiaron.
    await labOrdersModel.updateOne(
      { appointment_id },
      { $set: buildLabOrderLink(savedConsultation, patient_id, clinical_data) },
      { session }
    );

    // Sincroniza el expediente del paciente (signos vitales, antecedentes, procedimientos) con
    // lo que el doctor acaba de registrar en esta consulta así el Expediente Clínico deja de
    // depender de un flujo aparte que nunca existió.
    const { update: patientUpdate, procedureNames, doctorName, procedureRows, procedureNameById, doctorNameById } = await buildClinicalHistoryUpdate({
      clinical_data,
      antecedents,
      procedure: sanitizedProcedure,
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
    if (procedureRows.length) {
      await syncProcedureHistory({
        patientId: patient_id,
        consultationId: savedConsultation._id,
        procedureRows,
        procedureNameById,
        doctorNameById,
        consultationDate: savedConsultation.date,
        diagnosisText: clinical_data?.diagnosis_description || clinical_data?.diagnosis || undefined,
        followUpDate: follow_up_date,
        session,
      });
    }

    // Descuenta del inventario real los materiales que el doctor marcó como usados en cada
    // procedimiento de esta consulta (antes se guardaban en material_used pero nunca tocaban
    // el stock). Como es una consulta nueva, "lo anterior" está vacío: se descuenta todo.
    const patientForMovement = await patientsModel.findById(patient_id).select("name last_name").session(session).lean();
    await inventoryController.applyMaterialUsageDelta({
      previousProcedureRows: [],
      procedureRows: sanitizedProcedure,
      patientName: patientForMovement ? `${patientForMovement.name} ${patientForMovement.last_name}`.trim() : undefined,
      responsible: doctorName || undefined,
      procedureType: procedureNames.join(", ") || undefined,
      session,
    });

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

    // Si esta consulta había empujado algún procedimiento al expediente del paciente (ver
    // syncProcedureHistory), se limpia también si no, queda un "tratamiento fantasma" en
    // Tratamientos (/inventory/treatments) apuntando a una consulta que ya no existe.
    if (consultationDeleted.patient_id) {
      await patientsModel.updateOne(
        { _id: consultationDeleted.patient_id },
        { $pull: { "clinical_history.procedures": { consultation_id: consultationDeleted._id } } }
      );
    }

    // La orden de laboratorio pertenece a esta consulta: si la consulta se
    // borra, la orden también (si no, queda una orden huérfana visible en el
    // expediente y el portal).
    const labOrderOr = [{ consultation_id: consultationDeleted._id }];
    if (consultationDeleted.appointment_id) {
      labOrderOr.push({ appointment_id: consultationDeleted.appointment_id });
    }
    await labOrdersModel.deleteOne({ $or: labOrderOr });

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

    const requiredFieldsError = getRequiredConsultationFieldsError(clinical_data);
    if (requiredFieldsError) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: requiredFieldsError });
    }

    // No se edita una consulta de un paciente inactivo ni de una cita
    // asignada a un doctor inactivo.
    const consultationAppointment = appointment_id
      ? await appointmentsModel.findById(appointment_id).select("doctor_id").lean()
      : null;
    const inactivePartyError = await assertActiveParties({
      patientId: patient_id,
      doctorId: consultationAppointment?.doctor_id,
    });
    if (inactivePartyError) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: inactivePartyError });
    }

    const vitalSignsCheck = buildVitalSignsEntry(clinical_data?.triage, null);
    if (vitalSignsCheck) {
      const vitalsError = getVitalSignsError(vitalSignsCheck);
      if (vitalsError) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ message: vitalsError });
      }
    }

    // Se guarda "lo anterior" ANTES de sobreescribir, para poder descontar solo la diferencia
    // de material_used (ver applyMaterialUsageDelta) y no el total de nuevo en cada edición.
    const previousConsultation = await consultationsModel
      .findById(req.params.id)
      .select("procedure")
      .session(session)
      .lean();

    const sanitizedProcedure = sanitizeProcedureRows(procedure);

    const consultationUpdated = await consultationsModel.findByIdAndUpdate(
      req.params.id,
      {
        appointment_id,
        patient_id,
        clinical_data,
        physical_exam,
        procedure: sanitizedProcedure,
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
      // Mismo criterio que insertConsultation: el formulario manda
      // prescription.indications, no post_operative_instructions.
      const postOperativeInstructions =
        prescription.post_operative_instructions || prescription.indications;
      await prescriptionsModel.findOneAndUpdate(
        { consultation_id: req.params.id },
        {
          $set: {
            consultation_id: req.params.id,
            medications: prescription.medications || [],
            post_operative_instructions: postOperativeInstructions,
          },
          // Solo se fija la primera vez que se crea la receta (al completar una
          // consulta que todavía no tenía una), para no correr la fecha de emisión
          // original cada vez que el doctor edita la consulta después.
          $setOnInsert: { issued_at: new Date() },
        },
        { session, upsert: true, new: true, runValidators: true }
      );
    }

    // Enlaza la orden de laboratorio (si existe) con esta consulta, igual que
    // en insertConsultation.
    await labOrdersModel.updateOne(
      { appointment_id },
      { $set: buildLabOrderLink(consultationUpdated, patient_id, clinical_data) },
      { session }
    );
    // Misma sincronización que insertConsultation al editar una consulta ya existente
    // (ej. completar el registro de una cita en curso) el expediente del paciente también
    // debe quedar al día.
    const { update: patientUpdate, procedureNames, doctorName, procedureRows, procedureNameById, doctorNameById } = await buildClinicalHistoryUpdate({
      clinical_data,
      antecedents,
      procedure: sanitizedProcedure,
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
    // syncProcedureHistory (no un $push directo): esta consulta puede que ya se haya guardado
    // antes, así que hay que actualizar en su lugar la entrada existente en vez de duplicarla
    // ver el comentario junto a la función para el detalle del bug que esto evita.
    if (procedureRows.length) {
      await syncProcedureHistory({
        patientId: patient_id,
        consultationId: consultationUpdated._id,
        procedureRows,
        procedureNameById,
        doctorNameById,
        consultationDate: consultationUpdated.date,
        diagnosisText: clinical_data?.diagnosis_description || clinical_data?.diagnosis || undefined,
        followUpDate: follow_up_date,
        session,
      });
    }

    // Solo mueve la DIFERENCIA entre lo que la consulta usaba antes de esta edición y lo que
    // usa ahora si no cambió nada en material_used, no se genera ningún movimiento.
    const patientForMovement = await patientsModel.findById(patient_id).select("name last_name").session(session).lean();
    await inventoryController.applyMaterialUsageDelta({
      previousProcedureRows: previousConsultation?.procedure || [],
      procedureRows: sanitizedProcedure,
      patientName: patientForMovement ? `${patientForMovement.name} ${patientForMovement.last_name}`.trim() : undefined,
      responsible: doctorName || undefined,
      procedureType: procedureNames.join(", ") || undefined,
      session,
    });

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

    // Una consulta de un paciente o doctor inactivo se trata como inexistente.
    if (
      consultation.patient_id?.is_active === false ||
      (await assertActiveParties({ doctorId: consultation.appointment_id?.doctor_id }))
    ) {
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

    // Un paciente o doctor inactivo oculta la consulta: se responde como si la
    // cita todavia no tuviera una registrada.
    if (
      consultation.patient_id?.is_active === false ||
      (await assertActiveParties({ doctorId: consultation.appointment_id?.doctor_id }))
    ) {
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


// PUT /consultations/:id/referral — edita la referencia de una consulta ya
// guardada desde la pestaña de Documentos del expediente. La referencia no
// es una colección propia (vive embebida en la consulta, ver referral en
// consultation.js), así que se edita como un campo puntual en vez de exigir
// el cuerpo completo de la consulta.
consultationController.updateReferral = async (req, res) => {
  try {
    const { reason, referred_to, referred_date, status } = req.body;

    const consultation = await consultationsModel.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          "referral.reason": reason,
          "referral.referred_to": referred_to,
          "referral.referred_date": referred_date,
          "referral.status": status,
        },
      },
      { new: true, runValidators: true }
    );

    if (!consultation) {
      return res.status(404).json({ message: "Consulta no encontrada" });
    }
    return res.status(200).json({ message: "Referencia actualizada", data: consultation.referral });
  } catch (error) {
    console.log("error " + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

// DELETE /consultations/:id/referral — quita la referencia de la consulta
// (la consulta en sí no se borra, solo deja de tener una referencia asociada).
consultationController.deleteReferral = async (req, res) => {
  try {
    const consultation = await consultationsModel.findByIdAndUpdate(
      req.params.id,
      { $unset: { referral: "" } },
      { new: true }
    );

    if (!consultation) {
      return res.status(404).json({ message: "Consulta no encontrada" });
    }
    return res.status(200).json({ message: "Referencia eliminada" });
  } catch (error) {
    console.log("error " + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

export default consultationController;
