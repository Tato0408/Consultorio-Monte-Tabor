import IncapacidadDocument from "./IncapacidadDocument";
import RecetaDocument from "./RecetaDocument";
import LabOrderDocument from "./LabOrderDocument";
import ReferenciaDocument from "./ReferenciaDocument";
import ClinicalHistoryDocument from "./ClinicalHistoryDocument";
import { openPdfInNewTab } from "./openPdfInNewTab";

const fmtFechaLarga = (iso) =>
  iso ? new Date(iso).toLocaleDateString("es-SV", { day: "numeric", month: "long", year: "numeric" }) : "—";

// Fecha corta (dd/mm/aaaa) para las filas del historial clínico.
const fmtFechaCorta = (iso) => {
  if (!iso) return "—";
  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) return "—";
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(value.getDate())}/${pad(value.getMonth() + 1)}/${value.getFullYear()}`;
};

// Hora local (HH:MM, 24 horas) del momento en que se emitió el documento
// (issued_at, start_date). Sin zona horaria: es la hora local del instante.
const fmtHoraLocal = (iso) => {
  if (!iso) return "";
  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(value.getHours())}:${pad(value.getMinutes())}`;
};

// Misma cuenta de días inclusiva que usa el resto del proyecto (ver ConsultationForm.jsx
// del panel privado: end_date = start_date + restDays - 1), para que la incapacidad del
// paciente muestre el mismo número de días que registró el doctor.
const calcularDiasReposo = (startDate, endDate) => {
  if (!startDate || !endDate) return "—";
  const inicio = new Date(startDate);
  const fin = new Date(endDate);
  const dias = Math.round((fin.getTime() - inicio.getTime()) / 86400000) + 1;
  return dias > 0 ? dias : "—";
};

// Edad a partir de la fecha de nacimiento del paciente (patient.birth_date, ver
// authController.getCurrentUser), null-safe.
export const calcularEdad = (birthDate) => {
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
const nombreDoctor = (doctor) => (doctor ? `Dr. ${doctor.name} ${doctor.last_name}` : "Doctor no especificado");

// Genera y abre en una pestaña nueva el PDF de una incapacidad, con el mismo formato
// que ya emite el panel privado (constancia con membrete y espacio de firma/sello).
export const descargarIncapacidadPdf = (patient, sickLeave) => {
  const doctor = sickLeave.doctor_id || sickLeave.doctor;
  return openPdfInNewTab(
    <IncapacidadDocument
      title={`Incapacidad médica - ${nombreCompleto(patient)}`}
      patientName={nombreCompleto(patient)}
      dui={patient?.dui}
      age={calcularEdad(patient?.birth_date)}
      diagnosis={sickLeave.diagnosis}
      restDays={calcularDiasReposo(sickLeave.start_date, sickLeave.end_date)}
      doctorName={nombreDoctor(doctor)}
      date={fmtFechaLarga(sickLeave.start_date)}
      time={fmtHoraLocal(sickLeave.start_date)}
    />
  );
};

// Genera y abre en una pestaña nueva el PDF de una receta médica, formato compacto de
// media página (ver RecetaDocument.jsx).
export const descargarRecetaPdf = (patient, prescription) => {
  const doctor = prescription.doctor;
  return openPdfInNewTab(
    <RecetaDocument
      title={`Receta médica - ${nombreCompleto(patient)}`}
      patientName={nombreCompleto(patient)}
      dui={patient?.dui}
      age={calcularEdad(patient?.birth_date)}
      doctorName={nombreDoctor(doctor)}
      date={fmtFechaLarga(prescription.issued_at)}
      time={fmtHoraLocal(prescription.issued_at)}
      medications={prescription.medications || []}
      instructions={prescription.post_operative_instructions}
    />
  );
};

// Genera y abre en una pestaña nueva el PDF de una referencia médica, con el
// formato de la hoja del consultorio y el membrete de Clínica Monte Tabor (ver
// ReferenciaDocument.jsx). Los datos vienen de getReferrals + la sesión.
export const descargarReferenciaPdf = (patient, referral) => {
  const doctor = referral.doctor || referral.doctor_id;
  const physicalExam = referral.physical_exam
    ? [
        referral.physical_exam.general,
        referral.physical_exam.skin,
        referral.physical_exam.cardiopulmonary,
        referral.physical_exam.abdomen,
        referral.physical_exam.neorulogical || referral.physical_exam.neurological,
        referral.physical_exam.musculoskeletal,
        referral.physical_exam.notes,
      ]
        .map((p) => String(p || "").trim())
        .filter(Boolean)
        .join("; ")
    : "";
  return openPdfInNewTab(
    <ReferenciaDocument
      title={`Referencia médica - ${nombreCompleto(patient)}`}
      patientName={nombreCompleto(patient)}
      dui={patient?.dui}
      age={calcularEdad(patient?.birth_date)}
      phone={patient?.phone}
      address={referral.address}
      date={fmtFechaLarga(referral.referred_date || referral.date)}
      time={fmtHoraLocal(referral.referred_date || referral.date)}
      referredTo={referral.referred_to}
      reason={referral.reason}
      bloodPressure={referral.blood_pressure}
      heartRate={referral.heart_rate}
      respiratoryRate={referral.respiratory_rate}
      spo2={referral.spo2}
      physicalExam={physicalExam}
      icdCode={referral.icd_diagnosis}
      diagnosis={referral.diagnosis}
      diagnosisDescription={referral.diagnosis_description}
      doctorName={doctor ? `Dr. ${doctor.name} ${doctor.last_name || ""}`.trim() : "Médico no especificado"}
    />
  );
};

// Genera y abre en una pestaña nueva el PDF de una orden de laboratorio, con el
// mismo formato de casillas y el membrete de Clínica Monte Tabor que ve el
// personal (ver LabOrderDocument.jsx).
export const descargarOrdenLaboratorioPdf = (patient, labOrder) => {
  const doctor = labOrder.doctor || labOrder.doctor_id;
  return openPdfInNewTab(
    <LabOrderDocument
      title={`Orden de laboratorio - ${nombreCompleto(patient)}`}
      patientName={nombreCompleto(patient)}
      dui={patient?.dui}
      age={calcularEdad(patient?.birth_date)}
      gender={patient?.gender}
      doctorName={doctor ? `Dr. ${doctor.name} ${doctor.last_name || ""}`.trim() : "Médico no especificado"}
      date={fmtFechaLarga(labOrder.date || labOrder.issued_at)}
      time={fmtHoraLocal(labOrder.date || labOrder.issued_at)}
      weight={labOrder.weight}
      height={labOrder.height}
      pregnancy={labOrder.pregnancy}
      antibioticTreatment={labOrder.antibiotic_treatment}
      tests={labOrder.tests || []}
      otherTests={labOrder.other_tests}
    />
  );
};

// Hora local (HH:MM) del momento actual, para el pie del historial clínico.
const horaActual = () => {
  const pad = (n) => String(n).padStart(2, "0");
  const ahora = new Date();
  return `${pad(ahora.getHours())}:${pad(ahora.getMinutes())}`;
};

// Genera y abre el PDF del historial clínico del paciente: signos vitales de
// todas las fechas, antecedentes de todo tipo y procedimientos realizados. Se
// arma con lo que trae getMyProfile() (clinical_history completo). El botón
// que llama esto solo aparece cuando ya hay signos vitales registrados.
export const descargarHistorialClinicoPdf = (patient) => {
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

  return openPdfInNewTab(
    <ClinicalHistoryDocument
      title={`Historial clínico - ${nombreCompleto(patient)}`}
      patientName={nombreCompleto(patient)}
      age={edad != null ? `${edad} años` : ""}
      gender={patient?.gender}
      dui={patient?.dui}
      bloodType={historia.blood_type}
      birthDate={fmtFechaLarga(patient?.birth_date)}
      date={fmtFechaCorta(new Date())}
      time={horaActual()}
      vitals={vitals}
      hereditary={(historia.hereditary || []).map((h) => ({
        parentesco: h.relationship,
        condicion: h.condition,
        tipo: h.type,
      }))}
      pathological={(historia.pathological || []).map((p) => ({
        enfermedad: p.disease,
        diagnostico: p.diagnosis,
        tipo: p.type,
      }))}
      nonPathological={historia.non_pathological}
      ecologicalSocial={historia.ecologycal_social}
      procedures={(historia.procedures || [])
        .filter((p) => p.consultation_id)
        .map((p) => ({ nombre: p.procedure_name, fecha: fmtFechaCorta(p.date) }))}
    />
  );
};
