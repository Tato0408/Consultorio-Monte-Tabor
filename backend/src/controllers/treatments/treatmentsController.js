import { v2 as cloudinary } from "cloudinary";
import treatmentModel from "../../models/treatments/treatment.js";
import patientsModel from "../../models/patients/patients.js";
import prescriptionModel from "../../models/consultations/prescription.js";
import { resolve_actor } from "../../utils/resolveActor.js";

// Milisegundos de un día, base de todos los cálculos de fechas.
const ms_day = 24 * 60 * 60 * 1000;

const treatmentsController = {};

// Mismo chequeo que ya hacía scheduleControl (más abajo) para next_control_date, pero
// faltaba en create/updatePlan para estimated_end_date y next_control_date: un string no
// parseable llegaba directo al campo Date del schema, Mongoose lanzaba un CastError al
// guardar, y el catch genérico lo convertía en un 500 en vez de un 400 explicando qué
// campo está mal.
const getDateFieldError = (value, label) => {
  if (!value) return null;
  if (Number.isNaN(new Date(value).getTime())) return `La fecha de ${label} no es válida.`;
  return null;
};

// Calcula la edad en años a partir de la fecha de nacimiento. Devuelve
// null si no hay fecha registrada, para no mostrar una edad falsa.
const calc_age = (birth_date) => {
  if (!birth_date) return null;
  return Math.floor((Date.now() - new Date(birth_date).getTime()) / (ms_day * 365.25));
};

// Formatea una fecha como dd/mm/aaaa en español. Devuelve un guion largo
// cuando no hay fecha, para que la interfaz nunca muestre Invalid Date.
const format_date = (date) => {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("es-SV", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

// Días que faltan (positivo) o que ya pasaron (negativo) entre hoy y una
// fecha dada, ignorando la hora exacta. Se usa para el texto de días
// restantes o vencidos del próximo control.
const days_until = (date) => {
  if (!date) return null;
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target - today) / ms_day);
};

// Hoy a medianoche, para comparar fechas por día sin la parte horaria.
const today_at_midnight = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

// Estado válido de cada transición desde la pantalla de detalle. Fuera de
// este mapa la transición se rechaza con 400.
const allowed_transitions = {
  activo: ["en_pausa", "cerrado"],
  en_pausa: ["activo", "cerrado"],
  cerrado: ["activo"],
};

const close_reasons = ["finalizado", "abandono", "derivacion", "otro"];

// Etiqueta y color del estado para la insignia de la lista y el detalle.
// Los colores coinciden con las claves de StatusBadge en el frontend.
const derive_badge = (treatment) => {
  if (treatment.status === "activo") return { label: "Activo", tone: "green" };
  if (treatment.status === "en_pausa") return { label: "En pausa", tone: "gray" };
  const reason_label = {
    finalizado: "Cerrado — finalizado",
    abandono: "Cerrado — abandono",
    derivacion: "Cerrado — derivación",
    otro: "Cerrado — otro motivo",
  };
  const reason_tone = {
    finalizado: "blue",
    abandono: "red",
    derivacion: "purple",
    otro: "gray",
  };
  const reason = treatment.closed_reason || "otro";
  return { label: reason_label[reason], tone: reason_tone[reason] };
};

// Cuenta las entradas de la línea de tiempo que representan una visita
// real del paciente (una evolución registrada en consulta o un control
// hecho), para el texto de progreso.
const count_sessions = (timeline = []) =>
  timeline.filter((entry) => entry.entry_type === "evolucion" || entry.entry_type === "control").length;

// Texto y porcentaje de avance del tratamiento. Prioriza el número de
// sesiones planificadas; si no hay, usa el tiempo transcurrido hasta la
// fecha estimada de alta; si tampoco hay, solo cuenta las visitas.
const derive_progress = (treatment) => {
  const done = count_sessions(treatment.timeline);
  if (treatment.total_sessions) {
    const pct = Math.min(100, Math.round((done / treatment.total_sessions) * 100));
    return { label: `${done} de ~${treatment.total_sessions} sesiones`, pct };
  }
  if (treatment.estimated_end_date && treatment.opened_at) {
    const total = new Date(treatment.estimated_end_date) - new Date(treatment.opened_at);
    const elapsed = Date.now() - new Date(treatment.opened_at).getTime();
    const pct = total > 0 ? Math.max(0, Math.min(100, Math.round((elapsed / total) * 100))) : 0;
    return { label: `${done} visita(s) registradas`, pct };
  }
  return { label: done ? `${done} visita(s) registradas` : "Sin visitas todavía", pct: 0 };
};

// Nombre completo del paciente a partir del documento poblado.
const patient_full_name = (patient) =>
  patient ? `${patient.name || ""} ${patient.last_name || ""}`.trim() : "—";

// Iniciales del paciente para el avatar de la lista.
const patient_initials = (patient) => {
  if (!patient) return "?";
  const first = (patient.name || "").trim()[0] || "";
  const last = (patient.last_name || "").trim()[0] || "";
  return (first + last).toUpperCase() || "?";
};

// Convierte un tratamiento poblado en el objeto plano que consume la
// tabla de la pantalla. alert marca un tratamiento activo cuyo control ya
// venció y el paciente no ha vuelto.
const to_list_row = (treatment, today) => {
  const patient = treatment.patient_id;
  const badge = derive_badge(treatment);
  const progress = derive_progress(treatment);
  const remaining = days_until(treatment.next_control_date);
  const alert = treatment.status === "activo" && !!treatment.next_control_date && new Date(treatment.next_control_date) < today;
  const age = calc_age(patient?.birth_date);
  return {
    id: String(treatment._id),
    patient_id: patient ? String(patient._id) : null,
    patient_name: patient_full_name(patient),
    patient_initials: patient_initials(patient),
    patient_age_label: age != null ? `${age} años · ${patient?.gender || "—"}` : patient?.gender || "—",
    diagnosis: treatment.diagnosis || "Sin diagnóstico registrado",
    objective: treatment.objective || "Sin objetivo registrado",
    doctor: treatment.opened_by_name || "—",
    start_date: format_date(treatment.opened_at),
    progress_label: progress.label,
    progress_pct: progress.pct,
    next_control: treatment.next_control_date ? format_date(treatment.next_control_date) : "—",
    next_control_in:
      remaining === null
        ? ""
        : remaining >= 0
        ? `en ${remaining} día(s)`
        : `vencido hace ${Math.abs(remaining)} día(s)`,
    status: treatment.status,
    closed_reason: treatment.closed_reason || null,
    badge_label: badge.label,
    badge_tone: badge.tone,
    alert,
  };
};

// Trae la medicación de la consulta más reciente ligada al tratamiento
// (la de origen o la última evolución con consultation_id), para mostrar
// la "medicación vigente" en el resumen del detalle.
const load_current_medications = async (treatment) => {
  const consultation_ids = [
    ...new Set(
      (treatment.timeline || [])
        .filter((entry) => entry.consultation_id)
        .map((entry) => String(entry.consultation_id))
    ),
  ];
  if (treatment.opened_by_consultation_id) {
    consultation_ids.push(String(treatment.opened_by_consultation_id));
  }
  if (!consultation_ids.length) return [];

  const prescriptions = await prescriptionModel
    .find({ consultation_id: { $in: consultation_ids } })
    .sort({ issued_at: -1, createdAt: -1 })
    .lean();
  const latest = prescriptions[0];
  if (!latest?.medications?.length) return [];

  return latest.medications
    .filter((med) => med?.name)
    .map((med) => [med.name, [med.dose, med.frequency].filter(Boolean).join(" · ")].filter(Boolean).join(" — "));
};

// GET /api/treatments
// Lista los planes de tratamiento con la forma que consume la pantalla
// (tabla y tarjetas de estadísticas). Acepta filtros opcionales por
// paciente, estado y motivo de cierre.
treatmentsController.list = async (req, res) => {
  try {
    const { patient_id, status, closed_reason } = req.query;

    const filters = { is_active: { $ne: false } };
    if (patient_id) filters.patient_id = patient_id;
    if (status) filters.status = status;
    if (closed_reason) filters.closed_reason = closed_reason;

    const treatments = await treatmentModel
      .find(filters)
      .populate("patient_id", "name last_name birth_date gender is_active")
      .sort({ opened_at: -1 })
      .lean();

    // Se descartan los tratamientos de pacientes inactivos, igual que en el resto del
    // sistema, y los huérfanos (patient_id ya no existe, populate lo deja en null): antes
    // "undefined !== false" daba true y un huérfano se colaba en el listado con nombre "—".
    const visible = treatments.filter((treatment) => treatment.patient_id && treatment.patient_id.is_active !== false);

    const today = today_at_midnight();
    const rows = visible.map((treatment) => to_list_row(treatment, today));

    const in_7_days = new Date(today.getTime() + 7 * ms_day);
    const start_of_month = new Date(today.getFullYear(), today.getMonth(), 1);

    const stats = {
      activos: rows.filter((row) => row.status === "activo").length,
      controlesSemana: visible.filter((treatment) => {
        if (treatment.status === "cerrado" || !treatment.next_control_date) return false;
        const control = new Date(treatment.next_control_date);
        return control >= today && control <= in_7_days;
      }).length,
      requierenControl: rows.filter((row) => row.alert).length,
      cerradosMes: visible.filter(
        (treatment) => treatment.status === "cerrado" && treatment.closed_at && new Date(treatment.closed_at) >= start_of_month
      ).length,
    };

    return res.status(200).json({ stats, treatments: rows });
  } catch (error) {
    console.log("error " + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

// GET /api/treatments/active?patient_id=
// Devuelve el tratamiento activo o en pausa más reciente del paciente, o
// null. Lo usa el formulario de consulta para avisar que el paciente ya
// tiene un tratamiento en curso.
treatmentsController.getActiveByPatient = async (req, res) => {
  try {
    const { patient_id } = req.query;
    if (!patient_id) {
      return res.status(400).json({ message: "Falta el paciente" });
    }

    const treatment = await treatmentModel
      .findOne({ patient_id, is_active: { $ne: false }, status: { $in: ["activo", "en_pausa"] } })
      .sort({ opened_at: -1 })
      .lean();

    if (!treatment) return res.status(200).json({ treatment: null });

    return res.status(200).json({
      treatment: {
        id: String(treatment._id),
        objective: treatment.objective,
        diagnosis: treatment.diagnosis,
        status: treatment.status,
        start_date: format_date(treatment.opened_at),
      },
    });
  } catch (error) {
    console.log("error " + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

// GET /api/treatments/:id
// Detalle completo de un tratamiento: resumen del plan, línea de tiempo
// (más reciente primero), documentos y medicación vigente.
treatmentsController.getById = async (req, res) => {
  try {
    const treatment = await treatmentModel
      .findById(req.params.id)
      .populate("patient_id", "name last_name birth_date gender is_active")
      .lean();

    if (!treatment || treatment.is_active === false) {
      return res.status(404).json({ message: "Tratamiento no encontrado" });
    }

    const patient = treatment.patient_id;
    const badge = derive_badge(treatment);
    const progress = derive_progress(treatment);
    const age = calc_age(patient?.birth_date);
    const medications = await load_current_medications(treatment);

    const timeline = [...(treatment.timeline || [])]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .map((entry) => ({
        id: String(entry._id),
        entry_type: entry.entry_type,
        text: entry.text,
        author: entry.author_name || "—",
        date: format_date(entry.date),
        from_consultation: !!entry.consultation_id,
        consultation_id: entry.consultation_id ? String(entry.consultation_id) : null,
        editable: entry.entry_type === "nota",
      }));

    const documents = [...(treatment.documents || [])]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .map((doc) => ({
        id: String(doc._id),
        name: doc.name,
        url: doc.url,
        uploaded_by: doc.uploaded_by_name || "—",
        date: format_date(doc.date),
      }));

    return res.status(200).json({
      id: String(treatment._id),
      patient_id: patient ? String(patient._id) : null,
      patient_name: patient_full_name(patient),
      patient_initials: patient_initials(patient),
      patient_age_label: age != null ? `${age} años · ${patient?.gender || "—"}` : patient?.gender || "—",
      status: treatment.status,
      closed_reason: treatment.closed_reason || null,
      closed_at: treatment.closed_at ? format_date(treatment.closed_at) : "",
      closure_note: treatment.closure_note || "",
      pause_note: treatment.pause_note || "",
      badge_label: badge.label,
      badge_tone: badge.tone,
      diagnosis: treatment.diagnosis || "Sin diagnóstico registrado",
      objective: treatment.objective || "Sin objetivo registrado",
      plan_description: treatment.plan_description || "Sin plan registrado",
      doctor: treatment.opened_by_name || "—",
      start_date: format_date(treatment.opened_at),
      estimated_end_date: treatment.estimated_end_date ? format_date(treatment.estimated_end_date) : "—",
      estimated_end_date_iso: treatment.estimated_end_date
        ? new Date(treatment.estimated_end_date).toISOString().slice(0, 10)
        : "",
      total_sessions: treatment.total_sessions ?? null,
      next_control: treatment.next_control_date ? format_date(treatment.next_control_date) : "—",
      next_control_iso: treatment.next_control_date
        ? new Date(treatment.next_control_date).toISOString().slice(0, 10)
        : "",
      progress_label: progress.label,
      progress_pct: progress.pct,
      alert:
        treatment.status === "activo" &&
        !!treatment.next_control_date &&
        new Date(treatment.next_control_date) < today_at_midnight(),
      current_medications: medications.length ? medications : ["Sin medicamentos registrados"],
      opened_by_consultation_id: treatment.opened_by_consultation_id
        ? String(treatment.opened_by_consultation_id)
        : null,
      timeline,
      documents,
    });
  } catch (error) {
    console.log("error " + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

// POST /api/treatments
// Alta manual de un tratamiento desde la pantalla, sin pasar por una
// consulta. objective y plan_description son obligatorios.
treatmentsController.create = async (req, res) => {
  try {
    const { patient_id, objective, plan_description, diagnosis, total_sessions, estimated_end_date, next_control_date } =
      req.body;

    if (!patient_id) {
      return res.status(400).json({ message: "Falta el paciente" });
    }
    if (!objective || !objective.trim() || !plan_description || !plan_description.trim()) {
      return res.status(400).json({ message: "El objetivo y el plan son obligatorios." });
    }

    const dateError = getDateFieldError(estimated_end_date, "fin estimado") || getDateFieldError(next_control_date, "próximo control");
    if (dateError) {
      return res.status(400).json({ message: dateError });
    }

    const patient = await patientsModel.findById(patient_id).select("is_active").lean();
    if (!patient || patient.is_active === false) {
      return res.status(404).json({ message: "Paciente no encontrado" });
    }

    const actor = await resolve_actor(req);
    const now = new Date();

    const treatment = new treatmentModel({
      patient_id,
      status: "activo",
      opened_by_id: actor.id,
      opened_by_name: actor.name,
      opened_at: now,
      diagnosis: (diagnosis || "").trim(),
      objective: objective.trim(),
      plan_description: plan_description.trim(),
      total_sessions: total_sessions ? Number(total_sessions) : null,
      estimated_end_date: estimated_end_date || null,
      next_control_date: next_control_date || null,
      timeline: [
        {
          entry_type: "inicio",
          text: "Plan de tratamiento creado.",
          author_id: actor.id,
          author_name: actor.name,
          date: now,
        },
      ],
    });
    await treatment.save();

    return res.status(200).json({ message: "Tratamiento creado", id: String(treatment._id) });
  } catch (error) {
    console.log("error " + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

// PATCH /api/treatments/:id
// Edita la definición del plan (objetivo, plan, sesiones, fechas). Cada
// edición deja una entrada "cambio_plan" en la línea de tiempo.
treatmentsController.updatePlan = async (req, res) => {
  try {
    const { objective, plan_description, total_sessions, estimated_end_date, next_control_date } = req.body;

    const treatment = await treatmentModel.findById(req.params.id);
    if (!treatment || treatment.is_active === false) {
      return res.status(404).json({ message: "Tratamiento no encontrado" });
    }

    if (objective !== undefined) {
      if (!objective.trim()) return res.status(400).json({ message: "El objetivo no puede quedar vacío." });
      treatment.objective = objective.trim();
    }
    if (plan_description !== undefined) {
      if (!plan_description.trim()) return res.status(400).json({ message: "El plan no puede quedar vacío." });
      treatment.plan_description = plan_description.trim();
    }
    if (estimated_end_date !== undefined) {
      const dateError = getDateFieldError(estimated_end_date, "fin estimado");
      if (dateError) return res.status(400).json({ message: dateError });
    }
    if (next_control_date !== undefined) {
      const dateError = getDateFieldError(next_control_date, "próximo control");
      if (dateError) return res.status(400).json({ message: dateError });
    }
    if (total_sessions !== undefined) treatment.total_sessions = total_sessions ? Number(total_sessions) : null;
    if (estimated_end_date !== undefined) treatment.estimated_end_date = estimated_end_date || null;
    if (next_control_date !== undefined) treatment.next_control_date = next_control_date || null;

    const actor = await resolve_actor(req);
    treatment.timeline.push({
      entry_type: "cambio_plan",
      text: "Se actualizó la definición del plan.",
      author_id: actor.id,
      author_name: actor.name,
      date: new Date(),
    });
    await treatment.save();

    return res.status(200).json({ message: "Plan actualizado" });
  } catch (error) {
    console.log("error " + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

// PATCH /api/treatments/:id/control
// Fija o reprograma la fecha del próximo control a mano.
treatmentsController.scheduleControl = async (req, res) => {
  try {
    const { next_control_date } = req.body;
    if (!next_control_date || isNaN(new Date(next_control_date).getTime())) {
      return res.status(400).json({ message: "Selecciona una fecha de control válida." });
    }

    const treatment = await treatmentModel.findById(req.params.id);
    if (!treatment || treatment.is_active === false) {
      return res.status(404).json({ message: "Tratamiento no encontrado" });
    }

    treatment.next_control_date = new Date(next_control_date);
    const actor = await resolve_actor(req);
    treatment.timeline.push({
      entry_type: "control",
      text: `Próximo control programado para el ${format_date(treatment.next_control_date)}.`,
      author_id: actor.id,
      author_name: actor.name,
      date: new Date(),
    });
    await treatment.save();

    return res.status(200).json({ message: "Control programado" });
  } catch (error) {
    console.log("error " + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

// PATCH /api/treatments/:id/status
// Aplica una transición de estado explícita: pausar, reanudar, cerrar o
// reabrir. Cada transición valida los datos que necesita y deja su
// entrada en la línea de tiempo.
treatmentsController.setStatus = async (req, res) => {
  try {
    const { status, closed_reason, closure_note, pause_note } = req.body;

    const treatment = await treatmentModel.findById(req.params.id);
    if (!treatment || treatment.is_active === false) {
      return res.status(404).json({ message: "Tratamiento no encontrado" });
    }

    if (!allowed_transitions[treatment.status]?.includes(status)) {
      return res.status(400).json({ message: "Esa transición de estado no es válida." });
    }

    const actor = await resolve_actor(req);
    const now = new Date();
    let entry;

    if (status === "en_pausa") {
      if (!pause_note || !pause_note.trim()) {
        return res.status(400).json({ message: "Indica el motivo de la pausa." });
      }
      treatment.pause_note = pause_note.trim();
      entry = { entry_type: "pausa", text: `Tratamiento pausado. ${pause_note.trim()}` };
    } else if (status === "cerrado") {
      if (!close_reasons.includes(closed_reason)) {
        return res.status(400).json({ message: "Selecciona un motivo de cierre válido." });
      }
      if (!closure_note || !closure_note.trim()) {
        return res.status(400).json({ message: "La nota de cierre es obligatoria." });
      }
      treatment.closed_reason = closed_reason;
      treatment.closed_at = now;
      treatment.closure_note = closure_note.trim();
      entry = { entry_type: "cierre", text: closure_note.trim() };
    } else if (status === "activo") {
      const was_closed = treatment.status === "cerrado";
      treatment.closed_reason = null;
      treatment.closed_at = null;
      treatment.closure_note = null;
      treatment.pause_note = null;
      entry = {
        entry_type: "reapertura",
        text: was_closed ? "Tratamiento reabierto." : "Tratamiento reanudado.",
      };
    }

    treatment.status = status;
    treatment.timeline.push({
      ...entry,
      author_id: actor.id,
      author_name: actor.name,
      date: now,
    });
    await treatment.save();

    return res.status(200).json({ message: "Estado actualizado" });
  } catch (error) {
    console.log("error " + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

// POST /api/treatments/:id/notes
// Agrega una nota manual a la línea de tiempo (algo que pasó fuera de una
// consulta: una llamada, un resultado de laboratorio, una observación de
// enfermería).
treatmentsController.addNote = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ message: "La nota no puede estar vacía." });
    }

    const treatment = await treatmentModel.findById(req.params.id);
    if (!treatment || treatment.is_active === false) {
      return res.status(404).json({ message: "Tratamiento no encontrado" });
    }

    const actor = await resolve_actor(req);
    treatment.timeline.push({
      entry_type: "nota",
      text: text.trim(),
      author_id: actor.id,
      author_name: actor.name,
      date: new Date(),
    });
    await treatment.save();

    return res.status(200).json({ message: "Nota agregada" });
  } catch (error) {
    console.log("error " + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

// PATCH /api/treatments/:id/timeline/:entryId
// Edita el texto de una nota manual. No se permite editar entradas que
// vinieron de una consulta ni las de inicio, cierre o cambios de estado.
treatmentsController.updateNote = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ message: "La nota no puede estar vacía." });
    }

    const treatment = await treatmentModel.findById(req.params.id);
    if (!treatment || treatment.is_active === false) {
      return res.status(404).json({ message: "Tratamiento no encontrado" });
    }

    const entry = treatment.timeline.id(req.params.entryId);
    if (!entry || entry.entry_type !== "nota") {
      return res.status(404).json({ message: "Nota no encontrada" });
    }

    entry.text = text.trim();
    await treatment.save();

    return res.status(200).json({ message: "Nota actualizada" });
  } catch (error) {
    console.log("error " + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

// DELETE /api/treatments/:id/timeline/:entryId
// Borra una nota manual de la línea de tiempo.
treatmentsController.deleteNote = async (req, res) => {
  try {
    const treatment = await treatmentModel.findById(req.params.id);
    if (!treatment || treatment.is_active === false) {
      return res.status(404).json({ message: "Tratamiento no encontrado" });
    }

    const entry = treatment.timeline.id(req.params.entryId);
    if (!entry || entry.entry_type !== "nota") {
      return res.status(404).json({ message: "Nota no encontrada" });
    }

    treatment.timeline.pull(req.params.entryId);
    await treatment.save();

    return res.status(200).json({ message: "Nota eliminada" });
  } catch (error) {
    console.log("error " + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

// POST /api/treatments/:id/documents
// El archivo ya está en Cloudinary cuando corre este código (lo sube el
// middleware de multer). req.file trae la URL pública y el public_id que
// hace falta para poder borrarlo después.
treatmentsController.uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Selecciona un archivo para subir." });
    }

    const treatment = await treatmentModel.findById(req.params.id);
    if (!treatment || treatment.is_active === false) {
      return res.status(404).json({ message: "Tratamiento no encontrado" });
    }

    const actor = await resolve_actor(req);
    const now = new Date();
    treatment.documents.push({
      name: req.file.originalname,
      url: req.file.path,
      public_id: req.file.filename,
      uploaded_by_name: actor.name,
      date: now,
    });
    treatment.timeline.push({
      entry_type: "documento",
      text: `Se adjuntó el documento ${req.file.originalname}.`,
      author_id: actor.id,
      author_name: actor.name,
      date: now,
    });
    await treatment.save();

    return res.status(200).json({ message: "Documento subido" });
  } catch (error) {
    console.log("error " + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

// DELETE /api/treatments/:id/documents/:documentId
// Borra el archivo de Cloudinary y luego el registro del tratamiento. Se
// prueba primero como "raw" (el tipo real de los PDF y Word) y si no
// existe con ese tipo, como "image".
treatmentsController.deleteDocument = async (req, res) => {
  try {
    const treatment = await treatmentModel.findById(req.params.id);
    if (!treatment || treatment.is_active === false) {
      return res.status(404).json({ message: "Tratamiento no encontrado" });
    }

    const document = treatment.documents.id(req.params.documentId);
    if (!document) {
      return res.status(404).json({ message: "Documento no encontrado" });
    }

    if (document.public_id) {
      await cloudinary.uploader
        .destroy(document.public_id, { resource_type: "raw" })
        .catch(() =>
          cloudinary.uploader.destroy(document.public_id, { resource_type: "image" }).catch(() => {})
        );
    }

    treatment.documents.pull(req.params.documentId);
    await treatment.save();

    return res.status(200).json({ message: "Documento eliminado" });
  } catch (error) {
    console.log("error " + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

// DELETE /api/treatments/:id
// Borra el tratamiento por completo: plan, línea de tiempo y documentos
// (incluidos sus archivos en Cloudinary). A diferencia de cerrarlo, esto no
// es una transición de estado reversible: el registro desaparece del todo,
// tal como advierte la confirmación del botón "Eliminar tratamiento" en el
// detalle.
treatmentsController.remove = async (req, res) => {
  try {
    const treatment = await treatmentModel.findById(req.params.id);
    if (!treatment || treatment.is_active === false) {
      return res.status(404).json({ message: "Tratamiento no encontrado" });
    }

    for (const document of treatment.documents) {
      if (!document.public_id) continue;
      await cloudinary.uploader
        .destroy(document.public_id, { resource_type: "raw" })
        .catch(() =>
          cloudinary.uploader.destroy(document.public_id, { resource_type: "image" }).catch(() => {})
        );
    }

    await treatmentModel.findByIdAndDelete(req.params.id);

    return res.status(200).json({ message: "Tratamiento eliminado" });
  } catch (error) {
    console.log("error " + error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

export default treatmentsController;
