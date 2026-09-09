import treatmentModel from "../models/treatments/treatment.js";

// Busca el tratamiento activo o en pausa más reciente de un paciente
// dentro de la transacción en curso. Devuelve el documento de Mongoose
// (no lean) para poder modificarlo y guardarlo.
const find_open_treatment = (patient_id, session) =>
  treatmentModel
    .findOne({ patient_id, is_active: { $ne: false }, status: { $in: ["activo", "en_pausa"] } })
    .sort({ opened_at: -1 })
    .session(session);

// Normaliza a Date o null un valor de fecha que puede venir como string
// vacío desde el formulario.
const to_date_or_null = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
};

// Mantiene sincronizado el plan de tratamiento del paciente con lo que el
// médico acaba de registrar en una consulta. Se llama dentro de la
// transacción de insertConsultation y updateConsultation.
//
// Parámetros: consultation_id (consulta que se guarda), patient_id,
// clinical_data (evolución y diagnóstico del body), treatment_plan (objeto
// opcional del body con create, link, objective, plan_description,
// total_sessions y estimated_end_date), next_control (fecha de la próxima
// cita sugerida o null), actor ({ id, name } de quien guarda) y session
// (la sesión de Mongoose de la transacción).
//
// Si treatment_plan.create es true y el paciente no tiene un tratamiento
// abierto, crea uno nuevo en estado activo con una entrada de inicio y
// otra de evolución con el texto de esta consulta. Si el paciente ya
// tiene un tratamiento abierto y link no es false, agrega o actualiza en
// ese tratamiento la entrada de evolución de esta consulta y refresca la
// fecha de control. Nunca crea un segundo tratamiento abierto para el
// mismo paciente.
export const sync_treatment_from_consultation = async ({
  consultation_id,
  patient_id,
  clinical_data,
  treatment_plan,
  next_control,
  actor,
  session,
}) => {
  if (!patient_id || !consultation_id) return;

  const evolution_text = (clinical_data?.evolution || "").trim();
  const diagnosis_text = (clinical_data?.diagnosis_description || clinical_data?.diagnosis || "").trim();
  const control_date = to_date_or_null(next_control);
  const now = new Date();

  const open_treatment = await find_open_treatment(patient_id, session);

  // Alta de un tratamiento nuevo desde esta consulta.
  if (treatment_plan?.create === true && !open_treatment) {
    const objective = (treatment_plan.objective || "").trim();
    const plan_description = (treatment_plan.plan_description || "").trim();
    // Sin objetivo ni plan no se crea nada: el formulario ya los exige,
    // esto solo evita guardar un tratamiento vacío por una llamada directa.
    if (!objective || !plan_description) return;

    const timeline = [
      {
        entry_type: "inicio",
        text: "Plan de tratamiento creado desde la consulta.",
        author_id: actor?.id || null,
        author_name: actor?.name || "Sistema",
        date: now,
      },
    ];
    if (evolution_text) {
      timeline.push({
        entry_type: "evolucion",
        consultation_id,
        text: evolution_text,
        author_id: actor?.id || null,
        author_name: actor?.name || "Sistema",
        date: now,
      });
    }

    const treatment = new treatmentModel({
      patient_id,
      status: "activo",
      opened_by_consultation_id: consultation_id,
      opened_by_id: actor?.id || null,
      opened_by_name: actor?.name || "Sistema",
      opened_at: now,
      diagnosis: diagnosis_text,
      objective,
      plan_description,
      total_sessions: treatment_plan.total_sessions ? Number(treatment_plan.total_sessions) : null,
      estimated_end_date: to_date_or_null(treatment_plan.estimated_end_date),
      next_control_date: control_date,
      timeline,
    });
    await treatment.save({ session });
    return;
  }

  // Consulta de seguimiento de un tratamiento ya abierto.
  if (open_treatment && treatment_plan?.link !== false) {
    if (control_date) open_treatment.next_control_date = control_date;

    if (evolution_text) {
      const existing = open_treatment.timeline.find(
        (entry) =>
          entry.entry_type === "evolucion" &&
          entry.consultation_id &&
          String(entry.consultation_id) === String(consultation_id)
      );
      if (existing) {
        existing.text = evolution_text;
      } else {
        open_treatment.timeline.push({
          entry_type: "evolucion",
          consultation_id,
          text: evolution_text,
          author_id: actor?.id || null,
          author_name: actor?.name || "Sistema",
          date: now,
        });
      }
    }

    await open_treatment.save({ session });
    return;
  }

  // Edición de una consulta que en su momento originó un tratamiento: se
  // actualiza la entrada de evolución de esa consulta en vez de duplicarla.
  const origin_treatment = await treatmentModel
    .findOne({ opened_by_consultation_id: consultation_id, is_active: { $ne: false } })
    .session(session);
  if (origin_treatment && evolution_text) {
    const existing = origin_treatment.timeline.find(
      (entry) =>
        entry.entry_type === "evolucion" &&
        entry.consultation_id &&
        String(entry.consultation_id) === String(consultation_id)
    );
    if (existing) {
      existing.text = evolution_text;
    } else {
      origin_treatment.timeline.push({
        entry_type: "evolucion",
        consultation_id,
        text: evolution_text,
        author_id: actor?.id || null,
        author_name: actor?.name || "Sistema",
        date: now,
      });
    }
    if (control_date) origin_treatment.next_control_date = control_date;
    await origin_treatment.save({ session });
  }
};

// Desvincula un tratamiento de la consulta que lo originó cuando esa
// consulta se elimina. El tratamiento no se borra: se deja registrada una
// nota del sistema y se limpia opened_by_consultation_id.
export const detach_treatment_from_consultation = async (consultation_id) => {
  const treatment = await treatmentModel.findOne({ opened_by_consultation_id: consultation_id });
  if (!treatment) return;

  treatment.opened_by_consultation_id = null;
  treatment.timeline.push({
    entry_type: "nota",
    text: "La consulta desde la que se creó este tratamiento fue eliminada.",
    author_name: "Sistema",
    date: new Date(),
  });
  await treatment.save();
};
