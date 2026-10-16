import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, FileText } from "lucide-react";
import { getMyConsultations, getMyConsultationById } from "@/services/appointmentsService";

// Mismos signos vitales y campos de examen físico que muestra la app móvil
// (ConsultationDetailScreen.jsx), para que ambas vean la consulta igual.
const VITALS = [
  { key: "blood_pressure", label: "Presión arterial", unit: "" },
  { key: "temperature", label: "Temperatura", unit: "°C" },
  { key: "glucose", label: "Glucosa", unit: "mg/dL" },
  { key: "oxygen_saturation", label: "Saturación O₂", unit: "%" },
  { key: "weight", label: "Peso", unit: "kg" },
  { key: "height", label: "Talla", unit: "cm" },
];

const EXAM_FIELDS = [
  { key: "general", label: "General" },
  { key: "skin", label: "Piel" },
  { key: "cardiopulmonary", label: "Cardiopulmonar" },
  { key: "abdomen", label: "Abdomen" },
  { key: "neurological", label: "Neurológico" },
  { key: "musculoskeletal", label: "Musculoesquelético" },
  { key: "notes", label: "Notas" },
];

const fmtFechaLarga = (value) => new Date(value).toLocaleDateString("es-SV", {
  day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
});

const hasValue = (value) => value !== undefined && value !== null && String(value).trim() !== "";

const Section = ({ title, children }) => (
  <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 sm:p-4">
    <p className="text-xs font-semibold uppercase tracking-wide text-[#3B6FCA] mb-2">{title}</p>
    {children}
  </div>
);

const Row = ({ label, value }) => (
  <div className="flex flex-col sm:flex-row sm:gap-3 py-1">
    <span className="text-xs text-gray-400 sm:w-40 flex-shrink-0">{label}</span>
    <span className="text-sm text-gray-700 whitespace-pre-line">{value}</span>
  </div>
);

// Detalle de la consulta clínica de una cita atendida, el mismo contenido que
// la app móvil abre al tocar una consulta completada. Se carga solo al
// expandir la tarjeta para no pedir todas las consultas de golpe.
export default function ConsultationSummary({ appointmentId }) {
  const [consultation, setConsultation] = useState(null);
  const [estado, setEstado] = useState("cargando");

  useEffect(() => {
    let cancelado = false;
    const cargar = async () => {
      try {
        const lista = await getMyConsultations();
        const item = (Array.isArray(lista) ? lista : [])
          .find((c) => String(c.appointment_id) === String(appointmentId));
        if (!item?.consultation_id) {
          if (!cancelado) setEstado("sinRegistro");
          return;
        }
        const detalle = await getMyConsultationById(item.consultation_id);
        if (cancelado) return;
        setConsultation(detalle);
        setEstado("listo");
      } catch {
        if (!cancelado) setEstado("error");
      }
    };
    cargar();
    return () => { cancelado = true; };
  }, [appointmentId]);

  if (estado === "cargando") {
    return (
      <div className="flex items-center gap-2 text-gray-400 text-sm py-2">
        <Loader2 className="w-4 h-4 animate-spin" /> Cargando la consulta...
      </div>
    );
  }
  if (estado === "sinRegistro") {
    return <p className="text-gray-400">Tu cita ya fue atendida, pero el médico aún no ha terminado de registrar la consulta. Vuelve a revisarla en unos minutos.</p>;
  }
  if (estado === "error") {
    return <p className="text-red-500">No se pudo cargar el detalle de la consulta. Inténtalo de nuevo.</p>;
  }

  const clinical = consultation.clinical_data || {};
  const triage = clinical.triage || {};
  const vitales = VITALS.filter((v) => hasValue(triage[v.key]));

  // El panel privado guarda el examen neurológico bajo la clave "neorulogical"
  // (mal escrita), por eso se usa como respaldo, igual que la app móvil.
  const examen = { ...(consultation.physical_exam || {}) };
  if (!examen.neurological && examen.neorulogical) examen.neurological = examen.neorulogical;
  const filasExamen = EXAM_FIELDS.filter((f) => hasValue(examen[f.key]));

  const procedimientos = (consultation.procedure || []).filter((p) => p.procedure_name);
  const receta = consultation.prescription;
  const medicamentos = receta?.medications || [];
  const indicaciones = receta?.post_operative_instructions?.trim();
  const referencia = consultation.referral;
  const incapacidad = consultation.sickLeave;
  const tieneDocumentos = medicamentos.length > 0 || Boolean(indicaciones) || Boolean(incapacidad);

  return (
    <div className="space-y-3">
      <Section title="Diagnóstico">
        <p className="text-sm text-gray-700 whitespace-pre-line">
          {clinical.diagnosis_description || clinical.diagnosis || "Sin diagnóstico registrado."}
        </p>
        {clinical.diagnosis && clinical.diagnosis_description && (
          <Row label="Diagnóstico (CIE)" value={`${clinical.diagnosis}${clinical.icd_diagnosis ? ` · ${clinical.icd_diagnosis}` : ""}`} />
        )}
        {clinical.evolution && <Row label="Evolución" value={clinical.evolution} />}
      </Section>

      {vitales.length > 0 && (
        <Section title="Signos vitales">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {vitales.map((v) => (
              <div key={v.key} className="rounded-lg bg-white border border-gray-100 px-3 py-2">
                <p className="text-[11px] text-gray-400">{v.label}</p>
                <p className="text-sm font-semibold text-gray-800">{triage[v.key]}{v.unit ? ` ${v.unit}` : ""}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {filasExamen.length > 0 && (
        <Section title="Examen físico">
          {filasExamen.map((f) => <Row key={f.key} label={f.label} value={examen[f.key]} />)}
        </Section>
      )}

      {procedimientos.length > 0 && (
        <Section title="Procedimientos realizados">
          <ul className="list-disc pl-5 text-sm text-gray-700 space-y-0.5">
            {procedimientos.map((p, i) => <li key={`${p.procedure_id}-${i}`}>{p.procedure_name}</li>)}
          </ul>
        </Section>
      )}

      {(medicamentos.length > 0 || indicaciones) && (
        <Section title="Receta médica">
          <div className="space-y-2">
            {medicamentos.map((med, i) => (
              <div key={i} className="rounded-lg bg-white border border-gray-100 px-3 py-2">
                <p className="text-sm font-semibold text-gray-800">{med.name}</p>
                <p className="text-xs text-gray-500">
                  {[med.dose && `Dosis: ${med.dose}`, med.frequency && `Frecuencia: ${med.frequency}`, med.duration && `Duración: ${med.duration}`]
                    .filter(Boolean).join(" · ")}
                </p>
                {med.route_of_administration && <p className="text-xs text-gray-500">Vía: {med.route_of_administration}</p>}
                {med.instructions && <p className="text-xs text-gray-500">{med.instructions}</p>}
              </div>
            ))}
            {indicaciones && <Row label="Indicaciones" value={indicaciones} />}
          </div>
        </Section>
      )}

      {referencia?.reason?.trim() && (
        <Section title="Referencia">
          <Row label="Motivo" value={referencia.reason} />
          {referencia.referred_to && <Row label="Referido a" value={referencia.referred_to} />}
          {referencia.referred_date && <Row label="Fecha" value={fmtFechaLarga(referencia.referred_date)} />}
        </Section>
      )}

      {incapacidad && (
        <Section title="Incapacidad">
          <Row
            label="Periodo"
            value={`${incapacidad.start_date ? fmtFechaLarga(incapacidad.start_date) : "—"} – ${incapacidad.end_date ? fmtFechaLarga(incapacidad.end_date) : "—"}`}
          />
          {incapacidad.diagnosis && <Row label="Diagnóstico" value={incapacidad.diagnosis} />}
        </Section>
      )}

      {consultation.follow_up_date && (
        <Section title="Próximo control">
          <p className="text-sm text-gray-700">{fmtFechaLarga(consultation.follow_up_date)}</p>
        </Section>
      )}

      {tieneDocumentos && (
        <Link
          to="/documentos"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#3B6FCA] hover:underline"
        >
          <FileText className="w-4 h-4" /> Descargar receta e incapacidad en Documentos
        </Link>
      )}
    </div>
  );
}
