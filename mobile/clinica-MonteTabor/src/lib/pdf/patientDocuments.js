import apiClient from "../apiClient";
import { getLogoDataUri } from "./logo";
import { buildIncapacidadHtml, buildRecetaHtml } from "./htmlTemplates";
import { generarYCompartirPdf } from "./generatePdf";

const fmtFechaLarga = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString("es-SV", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
    : "—";

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
    medications: prescription.medications || [],
    labOrders: prescription.lab_orders || [],
    instructions: prescription.post_operative_instructions,
  });
  // Media carta: 612x396pt (la mitad de una hoja LETTER de 612x792pt).
  await generarYCompartirPdf(html, "Receta médica", { width: 612, height: 396 });
}
