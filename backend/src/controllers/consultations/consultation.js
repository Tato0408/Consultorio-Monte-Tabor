import mongoose from "mongoose";
import consultationsModel from "../../models/consultations/consultation.js";
import prescriptionsModel from "../../models/consultations/prescription.js"
import labOrdersModel from "../../models/consultations/labOrder.js";
import patientsModel from "../../models/patients/patients.js";
import doctorsModel from "../../models/doctors/doctors.js";
import proceduresModel from "../../models/procedures/procedures.js";
import inventoryController from "../inventory/inventoryController.js";
import { getVitalSignsError, getRequiredConsultationFieldsError, getClinicalTextError } from "../../utils/validators.js";
import appointmentsModel from "../../models/appointments/appointments.js";
import { assertActiveParties, isPatientInactive } from "../../utils/activeScope.js";
import { getModulePermission } from "../../services/roleCache.js";
import { refreshNurseNotePendingNotification, insert_staff_notifications } from "../../services/notificationService.js";
import { sync_treatment_from_consultation } from "../../services/treatmentSync.js";
import { resolve_actor } from "../../utils/resolveActor.js";
import { cascadeDeleteConsultation, deleteAppointmentCascade } from "../../services/consultationCascade.js";
import { resolveProcedureFlags } from "../../utils/procedureAggregation.js";
const consultationController = {};

// follow_up_date (Procedimientos) y prescription.next_appointment_suggested (Receta)
// alimentan el mismo treatment.next_control_date (ver sync_treatment_from_consultation
// más abajo, en createConsultation y updateConsultation). El frontend ya valida ambos
// campos, pero ninguno se revalidaba en el backend: una fecha pasada se guardaba sin
// aviso y generaba una alerta de "control vencido" incorrecta desde el momento mismo de
// guardarse.
const getNextControlDateError = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "La fecha de próximo control no es válida.";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (parsed < today) return "La fecha de próximo control no puede ser anterior a hoy.";
  return null;
};

// Día (AAAA MM DD en UTC) de una fecha, o null si no es válida. Sirve para
// comparar una fecha enviada por el formulario con la guardada.
const to_day_key = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
};

// Valida la fecha de próximo control al editar una consulta. Recibe la fecha
// enviada y la que ya estaba guardada en ese mismo campo. Si son el mismo día
// se acepta aunque ya haya pasado, porque el control pudo vencer después de
// registrarse. Devuelve el mensaje de error o null.
const get_edited_next_control_error = (value, saved_value) => {
  if (!value) return null;
  if (to_day_key(value) && to_day_key(value) === to_day_key(saved_value)) return null;
  return getNextControlDateError(value);
};

// Indicaciones de la receta. El formulario las manda como indications y tienen
// prioridad, post_operative_instructions se usa si indications no viene.
const get_prescription_instructions = (prescription) =>
  prescription?.indications !== undefined
    ? prescription.indications
    : prescription?.post_operative_instructions;

// Próxima cita sugerida de la receta como Date, o null si viene vacía.
const get_suggested_next_appointment = (prescription) =>
  to_day_key(prescription?.next_appointment_suggested)
    ? new Date(prescription.next_appointment_suggested)
    : null;

// Igual que la tarjeta "Plan de tratamiento" del formulario (oculta sin
// permiso de Ingreso en Tratamientos), el backend tampoco confía solo en lo
// que mande el cliente: sin ese permiso, un intento de abrir un plan nuevo
// se ignora en silencio, como si nunca se hubiera marcado la casilla.
// Registrar la evolución en un tratamiento ya abierto (treatment_plan.link)
// no depende de esto, esa parte sigue con la validación normal.
const sanitizeTreatmentPlanForActor = (treatment_plan, req) => {
  if (!treatment_plan?.create) return treatment_plan;
  const canCreateTreatment = !!getModulePermission(req.user?.role, "inventory.treatments")?.create;
  return canCreateTreatment ? treatment_plan : { ...treatment_plan, create: false };
};

// Convierte una hora "HH:mm" al formato de 12 horas usado en los avisos.
const format_time_12h = (time) => {
  const [hours, minutes] = String(time || "").split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return time || "";
  const suffix = hours >= 12 ? "PM" : "AM";
  return `${hours % 12 || 12}:${String(minutes).padStart(2, "0")} ${suffix}`;
};

// Avisa al proveedor dueño de la cita cuando una enfermera o una
// recepcionista registra la consulta en su nombre. El dueño es el doctor si
// algún procedimiento de la cita requiere doctor, o la enfermera principal si
// no. Recibe la cita (con date, start_time, patient_id, doctor_id, nurse_id y
// procedure_id) y la petición, de donde salen el rol y el nombre de quien
// atendió. Best effort, nunca corta la respuesta.
const notify_owner_if_attended_by_other = async (appointment, req) => {
  try {
    if (!appointment || !["nurse", "receptionist"].includes(req.user?.role)) return;

    const { requiresDoctor } = await resolveProcedureFlags(appointment.procedure_id);
    const owner = requiresDoctor
      ? { role: "doctor", id: appointment.doctor_id }
      : { role: "nurse", id: appointment.nurse_id };
    if (!owner.id || String(owner.id) === String(req.user.id)) return;

    const [actor, patient] = await Promise.all([
      resolve_actor(req),
      patientsModel.findById(appointment.patient_id).select("name last_name").lean(),
    ]);
    const role_label = req.user.role === "nurse" ? "La enfermera" : "La recepcionista";
    const actor_name = String(actor?.name || "").replace(/^Enf\.\s*/, "") || "del personal";
    const patient_name = patient ? `${patient.name} ${patient.last_name || ""}`.trim() : "un paciente";
    const date_text = appointment.date
      ? new Intl.DateTimeFormat("es-SV", { day: "2-digit", month: "long", timeZone: "UTC" }).format(new Date(appointment.date))
      : "";

    await insert_staff_notifications({
      recipient_role: owner.role,
      recipient_id: owner.id,
      title: "Tu cita fue atendida por otra persona",
      type: "general",
      message: `${role_label} ${actor_name} atendió tu cita del ${date_text} a las ${format_time_12h(appointment.start_time)} con el paciente ${patient_name}.`,
      appointment_id: appointment._id,
      action_url: `/calendar/consultations/${appointment._id}`,
    });
  } catch (error) {
    console.log("Error notificando consulta atendida por otra persona:", error);
  }
};

// Refresca la notificación de notas de enfermería pendientes cuando la cita
// de una consulta exige nota: tiene enfermera asignada y su procedimiento
// requiere enfermera. Best effort, nunca corta la respuesta.
const notifyNurseNoteIfNeeded = async (appointment) => {
  try {
    if (!appointment?.nurse_id || !appointment?.procedure_id?.length) return;
    // Alcanza con que UNO de los procedimientos de la cita requiera enfermera.
    const { requiresNurse } = await resolveProcedureFlags(appointment.procedure_id);
    if (requiresNurse) {
      await refreshNurseNotePendingNotification(appointment.nurse_id);
    }
  } catch (error) {
    console.log("error notifyNurseNoteIfNeeded" + error);
  }
};

// Revisa que los antecedentes que la consulta escribe en la historia clínica
// solo tengan letras, números y puntuación de oración (ver
// CLINICAL_TEXT_REGEX). Recibe antecedents tal como llega del formulario y
// devuelve el mensaje del primer campo inválido, o null.
const get_antecedents_text_error = (antecedents) => {
  if (!antecedents) return null;
  const fields = {};
  (antecedents.hereditary || []).forEach((h, i) => {
    fields[`Parentesco del antecedente heredofamiliar ${i + 1}`] = h?.relative ?? h?.relationship;
    fields[`Condición del antecedente heredofamiliar ${i + 1}`] = h?.condition;
    fields[`Tipo del antecedente heredofamiliar ${i + 1}`] = h?.type;
  });
  (antecedents.pathological || []).forEach((p, i) => {
    fields[`Enfermedad del antecedente patológico ${i + 1}`] = p?.disease;
    fields[`Diagnóstico del antecedente patológico ${i + 1}`] = p?.diagnosis;
    fields[`Tipo del antecedente patológico ${i + 1}`] = p?.type;
  });
  (antecedents.non_pathological || []).forEach((r, i) => { fields[`Antecedente no patológico ${i + 1}`] = r?.description; });
  (antecedents.socio_ecological || []).forEach((r, i) => { fields[`Antecedente ecológico-social ${i + 1}`] = r?.description; });
  return getClinicalTextError(fields);
};

// Convierte el triage de la consulta al formato de
// Patients.clinical_history.vital_signs. Devuelve null si no se capturó
// ningún signo vital, para no agregar un registro vacío al historial. La
// talla llega en cm (ver TriageCard.jsx) y se guarda en metros, que es como
// la muestra el expediente.
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

// La receta y la orden de laboratorio siempre guardan su propia fecha de
// emisión sin depender de que el doctor la escriba (issued_at: new Date(),
// ver insertConsultation/buildLabOrderLink). La referencia en cambio expone
// "Fecha de referencia" como un input de fecha suelto, opcional, dentro de
// una tarjeta ya marcada "opcional": el doctor puede llenar el motivo y
// olvidar la fecha, y la referencia se guarda sin ninguna (lo que el
// paciente ve luego en su portal). Si hay motivo (o sea, la referencia
// realmente se está usando) pero no fecha, se completa sola con la fecha
// de la consulta, igual que los otros tres tipos de documento.
const normalizeReferral = (referral, consultationDate) => {
  if (!referral?.reason || referral.referred_date) return referral;
  return { ...referral, referred_date: consultationDate };
};

// Arma el update ($set + $push) de Patients.clinical_history a partir de lo que el doctor cargó
// en esta consulta. hereditary/pathological/antecedentes de texto se REEMPLAZAN por completo: el
// formulario de consulta ya precarga lo que el paciente tenía registrado (ver
// useConsultation.js a getPatientAntecedents), así que lo que llega aquí YA es la versión
// editada por el doctor, no una lista parcial. Signos vitales y procedimientos en cambio se
// ACUMULAN como historial (cada consulta agrega una toma/entrada nueva, no reemplaza la anterior).
const buildClinicalHistoryUpdate = async ({ clinical_data, antecedents, procedure, consultationId, consultationDate, followUpDate, patientId, replaceVitalSigns = false }) => {
  const set = {};
  const push = {};

  const currentPatient = await patientsModel.findById(patientId).select("clinical_history.blood_type").lean();
  const currentBloodType = currentPatient?.clinical_history?.blood_type || null;

  // Mismo formato que escriben el expediente, el portal y la app móvil:
  // hereditary { relationship, condition, type } y pathological
  // { disease, diagnosis, type }. El formulario de consulta edita parentesco
  // (relative), condición, enfermedad y tipo; type de los hereditarios y
  // diagnosis de los patológicos llegan ocultos en la fila y se conservan.
  if (antecedents) {
    set["clinical_history.hereditary"] = nonEmptyRows(antecedents.hereditary, ["relative", "condition", "type"])
      .map((h) => ({ relationship: h.relative ?? h.relationship, condition: h.condition, type: h.type || undefined }));
    set["clinical_history.pathological"] = nonEmptyRows(antecedents.pathological, ["disease", "diagnosis", "type"])
      .map((p) => ({ disease: p.disease, diagnosis: p.diagnosis || undefined, type: p.type || undefined }));
    set["clinical_history.non_pathological"] = nonEmptyRows(antecedents.non_pathological, ["description"])
      .map((r) => r.description).join("\n");
    set["clinical_history.ecologycal_social"] = nonEmptyRows(antecedents.socio_ecological, ["description"])
      .map((r) => r.description).join("\n");
  }

  // La toma queda marcada con la consulta de la que sale. Al crear la
  // consulta se agrega con $push; al editarla (replaceVitalSigns) la
  // reemplaza sync_consultation_vital_signs, para no repetirla en cada
  // guardado.
  const vitalSignsEntry = buildVitalSignsEntry(clinical_data?.triage, consultationDate);
  if (vitalSignsEntry) vitalSignsEntry.consultation_id = consultationId;
  if (vitalSignsEntry && !replaceVitalSigns) {
    push["clinical_history.vital_signs"] = vitalSignsEntry;
  }

  // El tipo de sangre que el paciente registra desde el portal o el móvil
  // queda como autoreportado (blood_type_verified: false) hasta que el
  // personal clínico lo confirma. Al guardar una consulta se marca como
  // confirmado, solo si el paciente ya tiene uno registrado.
  if (currentBloodType) {
    set["clinical_history.blood_type_verified"] = true;
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
  return { update: Object.keys(update).length ? update : null, procedureNames, doctorName, procedureRows, procedureNameById, doctorNameById, vitalSignsEntry };
};

/*
 * Reemplaza en el expediente la toma de signos vitales de una consulta que
 * se está editando. Quita la toma marcada con esa consulta y, para tomas
 * antiguas guardadas antes de existir la marca, la que tiene la misma fecha
 * que la consulta (margen de 5 segundos). Después agrega la toma nueva con
 * la fecha original de la consulta. Recibe el paciente, la consulta
 * guardada, la toma nueva (o null si el triage quedó vacío) y la sesión.
 */
const sync_consultation_vital_signs = async ({ patientId, consultation, entry, session }) => {
  const reference = new Date(consultation.date || consultation.createdAt || Date.now());
  await patientsModel.updateOne(
    { _id: patientId },
    { $pull: { "clinical_history.vital_signs": { consultation_id: consultation._id } } },
    { session }
  );
  await patientsModel.updateOne(
    { _id: patientId },
    {
      $pull: {
        "clinical_history.vital_signs": {
          consultation_id: null,
          last_date_taken: { $gte: new Date(reference.getTime() - 5000), $lte: new Date(reference.getTime() + 5000) },
        },
      },
    },
    { session }
  );
  if (entry) {
    await patientsModel.updateOne(
      { _id: patientId },
      { $push: { "clinical_history.vital_signs": { ...entry, last_date_taken: reference } } },
      { session }
    );
  }
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

    // matchedCount en 0 significa que la fila (procedure_id) todavía no
    // existía para esta consulta: es el primer guardado, o el doctor la
    // agregó en esta edición.
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
      treatment_plan,
    } = req.body;

    // Síntomas, triage básico y diagnóstico completo son los datos mínimos para registrar una
    // consulta (ver ConsultationForm.jsx). El resto del formulario queda opcional.
    const requiredFieldsError = getRequiredConsultationFieldsError(clinical_data);
    if (requiredFieldsError) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: requiredFieldsError });
    }

    const nextControlError = getNextControlDateError(prescription?.next_appointment_suggested || follow_up_date);
    if (nextControlError) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: nextControlError });
    }

    // No se registra una consulta de un paciente inactivo ni de una cita
    // asignada a un doctor inactivo: esa consulta no seria visible despues.
    const consultationAppointment = appointment_id
      ? await appointmentsModel.findById(appointment_id).select("doctor_id nurse_id procedure_id status date start_time patient_id").lean()
      : null;

    // Una cita tiene una sola consulta. Si ya existe, se responde 409 con su
    // id para que el formulario la actualice con PUT en lugar de crear un
    // duplicado (cada duplicado repetía procedimientos, signos vitales y
    // descuentos de inventario en el expediente).
    if (appointment_id) {
      const existing = await consultationsModel.findOne({ appointment_id }).select("_id").lean();
      if (existing) {
        await session.abortTransaction();
        session.endSession();
        return res.status(409).json({
          message: "Esta cita ya tiene una consulta registrada.",
          code: "CONSULTATION_EXISTS",
          consultation_id: existing._id,
        });
      }
    }

    // Una cita cancelada (por el paciente o desde el panel) o marcada como no
    // presentada ya no admite una consulta nueva, aunque el formulario se haya
    // abierto antes de que cambiara su estado.
    if (consultationAppointment && ["cancelled", "no_show"].includes(consultationAppointment.status)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        message: consultationAppointment.status === "cancelled"
          ? "Esta cita fue cancelada, ya no se puede registrar la consulta."
          : "Esta cita quedó como no presentada, ya no se puede registrar la consulta.",
      });
    }

    const inactivePartyError = await assertActiveParties({
      patientId: patient_id,
      doctorId: consultationAppointment?.doctor_id,
    });
    if (inactivePartyError) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: inactivePartyError });
    }

    // Valida los signos vitales con las mismas reglas del expediente
    // clínico, sin depender de las máscaras del formulario (por ejemplo,
    // ante una llamada directa a la API).
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

    // Un insumo vencido, agotado o sin stock suficiente no puede usarse.
    const materialError = await inventoryController.getMaterialUsageError({
      previousProcedureRows: [],
      procedureRows: sanitizedProcedure,
    });
    if (materialError) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: materialError });
    }

    const antecedentsTextError = get_antecedents_text_error(antecedents);
    if (antecedentsTextError) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: antecedentsTextError });
    }

    // Fecha real de la consulta, fijada al momento de guardarla. También es
    // la fecha de referencia que usa normalizeReferral más abajo.
    const consultationDate = new Date();

    const newConsultation = new consultationsModel({
      appointment_id,
      patient_id,
      clinical_data,
      physical_exam,
      procedure: sanitizedProcedure,
      follow_up_date,
      referral: normalizeReferral(referral, consultationDate),
      date: consultationDate,
    });

    //Guardamos de manera temporal la consulta en el session
    const savedConsultation = await newConsultation.save({ session });

    const postOperativeInstructions = get_prescription_instructions(prescription);
    const suggestedNextAppointment = get_suggested_next_appointment(prescription);

    // La receta se crea si trae medicamentos, indicaciones o próxima cita.
    if (prescription?.medications?.length || postOperativeInstructions || suggestedNextAppointment) {
      const newPrescription = new prescriptionsModel({
        consultation_id: savedConsultation._id,
        medications: prescription.medications || [],
        post_operative_instructions: postOperativeInstructions,
        next_appointment_suggested: suggestedNextAppointment,
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
      patientId: patient_id,
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

    // Sincroniza el plan de tratamiento del paciente: crea uno nuevo si el
    // médico marcó "inicia un plan de tratamiento", o agrega la evolución
    // de esta consulta al tratamiento que ya tenga abierto.
    await sync_treatment_from_consultation({
      consultation_id: savedConsultation._id,
      patient_id,
      clinical_data,
      treatment_plan: sanitizeTreatmentPlanForActor(treatment_plan, req),
      next_control: prescription?.next_appointment_suggested || follow_up_date || null,
      actor: await resolve_actor(req),
      session,
    });

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

    // El doctor puede finalizar sin la nota de enfermería: si el
    // procedimiento la exige, la enfermera asignada recibe el aviso.
    await notifyNurseNoteIfNeeded(consultationAppointment);
    await notify_owner_if_attended_by_other(consultationAppointment, req);

    // Se devuelve el id para que el formulario actualice esta misma consulta
    // en los siguientes guardados en lugar de crear otra.
    return res.status(200).json({ message: "Consulta guardada", _id: savedConsultation._id });
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

    await cascadeDeleteConsultation(consultationDeleted);

    return res.status(200).json({ message: "Consulta eliminada" });
  } catch (error) {
    console.log("error" + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

// DELETE /consultations/by-appointment/:appointmentId, usado por la tabla
// de Consultas (AppointmentTable.jsx), que solo conoce el id de la cita, no
// el de la consulta. deleteAppointmentCascade resuelve los dos casos: si la
// cita ya tiene una consulta registrada, la borra con toda su cascada
// (incluida la cita); si no la tiene (una cita "completed" cuyo registro
// clínico nunca se guardó, o una cancelada/no presentada que nunca llegó a
// tener una), borra la cita directamente para que no quede fantasma en la
// tabla.
consultationController.deleteConsultationByAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
      return res.status(400).json({ message: "El ID de la cita provisto no es válido." });
    }

    const appointment = await deleteAppointmentCascade(appointmentId);
    if (!appointment) {
      return res.status(404).json({ message: "Cita no encontrada" });
    }

    return res.status(200).json({ message: "Consulta eliminada" });
  } catch (error) {
    console.log("error " + error);
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
      treatment_plan,
    } = req.body;

    const requiredFieldsError = getRequiredConsultationFieldsError(clinical_data);
    if (requiredFieldsError) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: requiredFieldsError });
    }

    // Datos guardados antes de esta edición: procedimientos y fecha para
    // descontar solo la diferencia de material_used (applyMaterialUsageDelta),
    // y fechas de control para aceptar las que no cambiaron aunque ya pasaron.
    const previousConsultation = await consultationsModel
      .findById(req.params.id)
      .select("procedure date follow_up_date")
      .session(session)
      .lean();
    const previousPrescription = await prescriptionsModel
      .findOne({ consultation_id: req.params.id })
      .select("next_appointment_suggested")
      .session(session)
      .lean();

    const nextControlError =
      get_edited_next_control_error(prescription?.next_appointment_suggested, previousPrescription?.next_appointment_suggested)
      || get_edited_next_control_error(follow_up_date, previousConsultation?.follow_up_date);
    if (nextControlError) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: nextControlError });
    }

    // No se edita una consulta de un paciente inactivo ni de una cita
    // asignada a un doctor inactivo.
    const consultationAppointment = appointment_id
      ? await appointmentsModel.findById(appointment_id).select("doctor_id nurse_id procedure_id").lean()
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

    const sanitizedProcedure = sanitizeProcedureRows(procedure);

    // Solo se valida lo que se agrega de más respecto de la consulta
    // guardada: un insumo que ya estaba registrado puede quedarse aunque
    // después se haya vencido.
    const materialError = await inventoryController.getMaterialUsageError({
      previousProcedureRows: previousConsultation?.procedure || [],
      procedureRows: sanitizedProcedure,
    });
    if (materialError) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: materialError });
    }

    const antecedentsTextError = get_antecedents_text_error(antecedents);
    if (antecedentsTextError) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: antecedentsTextError });
    }

    const consultationUpdated = await consultationsModel.findByIdAndUpdate(
      req.params.id,
      {
        appointment_id,
        patient_id,
        clinical_data,
        physical_exam,
        procedure: sanitizedProcedure,
        follow_up_date,
        referral: normalizeReferral(referral, previousConsultation?.date || new Date()),
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
          $set: {
            consultation_id: req.params.id,
            medications: prescription.medications || [],
            post_operative_instructions: get_prescription_instructions(prescription),
            next_appointment_suggested: get_suggested_next_appointment(prescription),
          },
          // La fecha de emisión se fija solo cuando se crea la receta, así
          // editar la consulta no cambia la fecha original.
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
    const { update: patientUpdate, procedureNames, doctorName, procedureRows, procedureNameById, doctorNameById, vitalSignsEntry } = await buildClinicalHistoryUpdate({
      clinical_data,
      antecedents,
      procedure: sanitizedProcedure,
      consultationId: consultationUpdated._id,
      consultationDate: consultationUpdated.date,
      followUpDate: follow_up_date,
      patientId: patient_id,
      replaceVitalSigns: true,
    });
    if (patientUpdate) {
      await patientsModel.findByIdAndUpdate(patient_id, patientUpdate, {
        session,
        new: true,
        runValidators: true,
      });
    }
    await sync_consultation_vital_signs({
      patientId: patient_id,
      consultation: consultationUpdated,
      entry: vitalSignsEntry,
      session,
    });
    // syncProcedureHistory actualiza la entrada existente de cada
    // procedimiento en lugar de agregar otra, porque la consulta ya pudo
    // guardarse antes.
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

    // Mantiene al día el plan de tratamiento del paciente al editar la
    // consulta: actualiza la entrada de evolución de esta consulta en el
    // tratamiento abierto o en el que originó, sin duplicarla.
    await sync_treatment_from_consultation({
      consultation_id: consultationUpdated._id,
      patient_id,
      clinical_data,
      treatment_plan: sanitizeTreatmentPlanForActor(treatment_plan, req),
      next_control: prescription?.next_appointment_suggested || follow_up_date || null,
      actor: await resolve_actor(req),
      session,
    });

    // Mueve solo la diferencia de material_used entre lo guardado y lo
    // enviado. Si no hay diferencia, no se genera ningún movimiento.
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

    // Si el procedimiento exige nota de enfermería, se recalcula el aviso de
    // la enfermera asignada (la consulta puede haber quedado sin nota).
    await notifyNurseNoteIfNeeded(consultationAppointment);

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


// PUT /consultations/:id/referral, edita la referencia de una consulta ya
// guardada desde la pestaña de Documentos del expediente. La referencia no
// es una colección propia (vive embebida en la consulta, ver referral en
// consultation.js), así que se edita como un campo puntual en vez de exigir
// el cuerpo completo de la consulta.
consultationController.updateReferral = async (req, res) => {
  try {
    const {
      reason,
      referred_to,
      referred_date,
      status,
      referred_doctor_address,
      referred_doctor_phone,
      heart_rate,
      respiratory_rate,
    } = req.body;

    // Mismo respaldo que insertConsultation/updateConsultation: con motivo
    // pero sin fecha (el modal de edición también la deja opcional), se
    // completa sola en vez de guardar la referencia sin fecha.
    const resolvedReferredDate = !referred_date && reason ? new Date() : referred_date;

    const consultation = await consultationsModel.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          "referral.reason": reason,
          "referral.referred_to": referred_to,
          "referral.referred_date": resolvedReferredDate,
          "referral.status": status,
          "referral.referred_doctor_address": referred_doctor_address,
          "referral.referred_doctor_phone": referred_doctor_phone,
          "referral.heart_rate": heart_rate,
          "referral.respiratory_rate": respiratory_rate,
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

// DELETE /consultations/:id/referral, quita la referencia de la consulta
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

// PATCH /consultations/:id/nurse-note. La enfermera asignada a la cita
// registra o corrige su nota de enfermería. Es el único punto por el que se
// escribe nurse_note: el formulario del doctor nunca lo toca. Solo lo puede
// llamar una enfermera, y solo si es la enfermera de esa cita y el
// procedimiento exige enfermera.
consultationController.setNurseNote = async (req, res) => {
  try {
    if (req.user.role !== "nurse") {
      return res.status(403).json({ message: "Solo una enfermera puede registrar la nota de enfermería" });
    }

    const consultation = await consultationsModel.findById(req.params.id).select("appointment_id");
    if (!consultation) {
      return res.status(404).json({ message: "Consulta no encontrada" });
    }

    const appointment = consultation.appointment_id
      ? await appointmentsModel.findById(consultation.appointment_id).select("nurse_id procedure_id").lean()
      : null;
    const assignedNurseId = appointment?.nurse_id ? String(appointment.nurse_id) : null;
    if (!assignedNurseId || assignedNurseId !== String(req.user.id)) {
      return res.status(403).json({ message: "No eres la enfermera asignada a esta consulta" });
    }

    // Alcanza con que UNO de los procedimientos de la cita requiera enfermera.
    const { requiresNurse } = await resolveProcedureFlags(appointment.procedure_id);
    if (!requiresNurse) {
      return res.status(403).json({ message: "Esta consulta no requiere nota de enfermería" });
    }

    const text = String(req.body?.text || "").trim();
    const update = text
      ? { nurse_note: text, nurse_note_by: req.user.id, nurse_note_at: new Date() }
      : { nurse_note: null, nurse_note_by: null, nurse_note_at: null };

    const updated = await consultationsModel.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true }
    );

    // Con la nota agregada (o quitada) se recalcula el aviso consolidado.
    await refreshNurseNotePendingNotification(req.user.id);

    return res.status(200).json({
      message: "Nota de enfermería guardada",
      data: {
        nurse_note: updated.nurse_note,
        nurse_note_at: updated.nurse_note_at,
        nurse_note_by: updated.nurse_note_by,
      },
    });
  } catch (error) {
    console.log("error " + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

export default consultationController;
