import apiClient from "../apiClient";
import { getLogoDataUri } from "./logo";
import { buildIncapacidadHtml, buildRecetaHtml, buildLabOrderHtml, buildReferenciaHtml, buildClinicalHistoryHtml } from "./htmlTemplates";
import { generarYCompartirPdf } from "./generatePdf";

const fmtFechaLarga = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString("es-SV", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
    : "—";

// Fecha corta (dd/mm/aaaa) para las filas del historial clínico.
const fmtFechaCorta = (iso) => {
  if (!iso) return "—";
  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) return "—";
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(value.getDate())}/${pad(value.getMonth() + 1)}/${value.getFullYear()}`;
};

// Hora local (HH:MM, 24 horas) del instante en que se emitió el documento
// (issued_at, start_date). Sin zona horaria: es la hora local de ese instante.
const fmtHoraLocal = (iso) => {
  if (!iso) return "";
  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(value.getHours())}:${pad(value.getMinutes())}`;
};

// Misma cuenta de días inclusiva que usa el resto del proyecto (ver
// ConsultationForm.jsx del panel privado: end_date = start_date + restDays - 1).
const calcularDiasReposo = (startDate, endDate) => {
  if (!startDate || !endDate) return "—";
  const dias = Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1;
  return dias > 0 ? dias : "—";
};

// Edad a partir de la fecha de nacimiento (patient.birth_date, ver /patientAccount/me).
const calcularEdad = (birthDate) => {
  if (!birthDate) return null;
  const nacimiento = new Date(birthDate);
  if (Number.isNaN(nacimiento.getTime())) return null;
  const hoy = new Date();
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const aunNoCumple =
    hoy.getMonth() < nacimiento.getMonth() ||
    (hoy.getMonth() === nacimiento.getMonth() && hoy.getDate() < nacimiento.getDate());
  if (aunNoCumple) edad -= 1;
  return edad;
};

const nombreCompleto = (patient) => `${patient?.name || ""} ${patient?.last_name || ""}`.trim();
const nombreDoctor = (doctor) => (doctor ? `Dr. ${doctor.name} ${doctor.last_name || ""}`.trim() : "Doctor no especificado");

// /patientAccount/me trae dui y birth_date (necesarios para el PDF); el objeto "user" que
// guarda el login no los incluye, así que se piden aparte justo al generar el documento.
const obtenerPacienteCompleto = () => apiClient("/patientAccount/me");

export async function descargarIncapacidadPdf(sickLeave) {
  const [patient, logoDataUri] = await Promise.all([obtenerPacienteCompleto(), getLogoDataUri()]);
  const doctor = sickLeave.doctor_id || sickLeave.doctor;
  const html = buildIncapacidadHtml({
    logoDataUri,
    patientName: nombreCompleto(patient),
    dui: patient?.dui,
    age: calcularEdad(patient?.birth_date),
    diagnosis: sickLeave.diagnosis,
    restDays: calcularDiasReposo(sickLeave.start_date, sickLeave.end_date),
    doctorName: nombreDoctor(doctor),
    date: fmtFechaLarga(sickLeave.start_date),
    time: fmtHoraLocal(sickLeave.start_date),
  });
  await generarYCompartirPdf(html, "Incapacidad médica");
}

export async function descargarRecetaPdf(prescription) {
  const [patient, logoDataUri] = await Promise.all([obtenerPacienteCompleto(), getLogoDataUri()]);
  const html = buildRecetaHtml({
    logoDataUri,
    patientName: nombreCompleto(patient),
    dui: patient?.dui,
    age: calcularEdad(patient?.birth_date),
    doctorName: nombreDoctor(prescription.doctor),
    date: fmtFechaLarga(prescription.issued_at),
    time: fmtHoraLocal(prescription.issued_at),
    medications: prescription.medications || [],
    instructions: prescription.post_operative_instructions,
  });
  // Media carta: 612x396pt (la mitad de una hoja LETTER de 612x792pt).
  await generarYCompartirPdf(html, "Receta médica", { width: 612, height: 396 });
}

export async function descargarOrdenLaboratorioPdf(labOrder) {
  const [patient, logoDataUri] = await Promise.all([obtenerPacienteCompleto(), getLogoDataUri()]);
  const html = buildLabOrderHtml({
    logoDataUri,
    patientName: nombreCompleto(patient),
    dui: patient?.dui,
    age: calcularEdad(patient?.birth_date),
    gender: patient?.gender,
    doctorName: nombreDoctor(labOrder.doctor || labOrder.doctor_id),
    date: fmtFechaLarga(labOrder.date || labOrder.issued_at),
    time: fmtHoraLocal(labOrder.date || labOrder.issued_at),
    weight: labOrder.weight,
    height: labOrder.height,
    pregnancy: labOrder.pregnancy,
    antibioticTreatment: labOrder.antibiotic_treatment,
    tests: labOrder.tests || [],
    otherTests: labOrder.other_tests,
  });
  await generarYCompartirPdf(html, "Orden de laboratorio");
}

export async function descargarReferenciaPdf(referral) {
  const [patient, logoDataUri] = await Promise.all([obtenerPacienteCompleto(), getLogoDataUri()]);
  const pe = referral.physical_exam || {};
  const physicalExam = [
    pe.general,
    pe.skin,
    pe.cardiopulmonary,
    pe.abdomen,
    pe.neorulogical || pe.neurological,
    pe.musculoskeletal,
    pe.notes,
  ]
    .map((p) => String(p || "").trim())
    .filter(Boolean)
    .join("; ");
  const dateSource = referral.referred_date || referral.date;
  const html = buildReferenciaHtml({
    logoDataUri,
    patientName: nombreCompleto(patient),
    age: calcularEdad(patient?.birth_date),
    phone: patient?.phone,
    address: referral.address,
    date: fmtFechaLarga(dateSource),
    time: fmtHoraLocal(dateSource),
    referredTo: referral.referred_to,
    reason: referral.reason,
    bloodPressure: referral.blood_pressure,
    heartRate: referral.heart_rate,
    respiratoryRate: referral.respiratory_rate,
    spo2: referral.spo2,
    physicalExam,
    icdCode: referral.icd_diagnosis,
    diagnosis: referral.diagnosis,
    diagnosisDescription: referral.diagnosis_description,
    doctorName: nombreDoctor(referral.doctor || referral.doctor_id),
  });
  await generarYCompartirPdf(html, "Referencia médica");
}

// Hora local (HH:MM) del momento actual, para el pie del historial clínico.
const horaActual = () => {
  const pad = (n) => String(n).padStart(2, "0");
  const ahora = new Date();
  return `${pad(ahora.getHours())}:${pad(ahora.getMinutes())}`;
};

// Historial clínico del paciente: signos vitales de todas las fechas,
// antecedentes de todo tipo y procedimientos realizados. Se arma con el
// clinical_history completo que trae /patientAccount/me. El atajo y el botón
// que llaman esto solo aparecen cuando ya hay signos vitales registrados.
export async function descargarHistorialClinicoPdf() {
  const [patient, logoDataUri] = await Promise.all([obtenerPacienteCompleto(), getLogoDataUri()]);
  const historia = patient?.clinical_history || {};
  const edad = calcularEdad(patient?.birth_date);

  const vitals = [...(historia.vital_signs || [])]
    .sort((a, b) => new Date(b.last_date_taken || 0) - new Date(a.last_date_taken || 0))
    .map((v) => ({
      fecha: fmtFechaCorta(v.last_date_taken),
      presion: v.blood_pressure,
      glucosa: v.glucosa_mgdl,
      peso: v.weight,
      altura: v.height,
      temp: v.temperature,
      spo2: v.spo2 != null && v.spo2 !== "" ? `${v.spo2}%` : "",
    }));

  const html = buildClinicalHistoryHtml({
    logoDataUri,
    patientName: nombreCompleto(patient),
    age: edad != null ? `${edad} años` : "",
    gender: patient?.gender,
    dui: patient?.dui,
    bloodType: historia.blood_type,
    birthDate: fmtFechaLarga(patient?.birth_date),
    date: fmtFechaCorta(new Date()),
    time: horaActual(),
    vitals,
    hereditary: (historia.hereditary || []).map((h) => ({
      parentesco: h.relationship,
      condicion: h.condition,
      tipo: h.type,
    })),
    pathological: (historia.pathological || []).map((p) => ({
      enfermedad: p.disease,
      diagnostico: p.diagnosis,
      tipo: p.type,
    })),
    nonPathological: historia.non_pathological,
    ecologicalSocial: historia.ecologycal_social,
    procedures: (historia.procedures || [])
      .filter((p) => p.consultation_id)
      .map((p) => ({ nombre: p.procedure_name, fecha: fmtFechaCorta(p.date) })),
  });
  await generarYCompartirPdf(html, "Historial clínico");
}
