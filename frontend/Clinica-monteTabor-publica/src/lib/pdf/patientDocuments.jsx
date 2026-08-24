import IncapacidadDocument from "./IncapacidadDocument";
import RecetaDocument from "./RecetaDocument";
import { openPdfInNewTab } from "./openPdfInNewTab";

const fmtFechaLarga = (iso) =>
  iso ? new Date(iso).toLocaleDateString("es-SV", { day: "numeric", month: "long", year: "numeric" }) : "—";

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
      medications={prescription.medications || []}
      labOrders={prescription.lab_orders || []}
      instructions={prescription.post_operative_instructions}
    />
  );
};
