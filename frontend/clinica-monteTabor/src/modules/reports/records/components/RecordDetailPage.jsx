"use client";

import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import ExpedienteLayout from "./global/RecordsLayout";
import ResumenTab from "./pages/ResumeTab";
import HistoriaClinicaTab from "./pages/RecordsHistoricalClinical";
import ProcedimientosTab from "./pages/RecordsProcedures";
import SignosVitalesTab from "./pages/RecordsVitalSigns";
import ConsultasTab from "./pages/RecordsConsultations";
import usePatientRecordDetail from "../hooks/usePatientRecordDetail";

// Se renderiza dentro de RecordsPage al hacer clic en un paciente de la tabla:
// no navega a una ruta nueva, solo intercambia qué se muestra dentro del SPA.
// `record` trae lo que ya vive en el documento del paciente (useRecords);
// usePatientRecordDetail completa aparte lo que depende de consultas/citas/
// incapacidades reales, y se fusiona antes de pasarlo a cada pestaña.
const RecordDetailPage = ({ record, onBack }) => {
  const fullName = `${record?.nombre || ""} ${record?.apellido || ""}`.trim();
  const { extra, loading, error, refetch } = usePatientRecordDetail(record?.id, fullName);
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canAttend = hasPermission("calendar.consultations", "create");

  if (!record) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-sm text-slate-400">
        No se encontró información del paciente seleccionado.
        <button
          type="button"
          onClick={onBack}
          className="text-blue-600 hover:underline"
        >
          Volver al listado
        </button>
      </div>
    );
  }

  // Solo sobrescribe última visita/doctor si la consulta más reciente es
  // más nueva que el último procedimiento ya calculado por useRecords.
  const useConsultationOverride =
    extra?.ultimaVisitaOverride?._fecha &&
    (!record.ultimaVisita?._fecha ||
      new Date(extra.ultimaVisitaOverride._fecha) > new Date(record.ultimaVisita._fecha));

  const patient = {
    ...record,
    ...extra,
    ...(useConsultationOverride
      ? { ultimaVisita: extra.ultimaVisitaOverride, doctor: extra.doctorOverride }
      : {}),
  };

  const tabs = [
    { label: "Resumen", content: <ResumenTab patient={patient} onSaved={refetch} /> },
    { label: "Historia clínica", content: <HistoriaClinicaTab patient={patient} /> },
    { label: "Procedimientos", content: <ProcedimientosTab patient={patient} /> },
    { label: "Signos vitales", content: <SignosVitalesTab patient={patient} /> },
    {
      label: "Consultas",
      content: (
        <ConsultasTab
          patient={patient}
          canAttend={canAttend}
          onContinuar={(c) => c.appointmentId && navigate(`/calendar/consultations/${c.appointmentId}`)}
          onVerRegistro={(c) => c.appointmentId && navigate(`/calendar/consultations/${c.appointmentId}?mode=view`)}
        />
      ),
    },
  ];

  return (
    <ExpedienteLayout patient={patient} tabs={tabs} onBack={onBack}>
      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-600">
          {error}
        </div>
      )}
      {loading && !extra && (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando información clínica del paciente...
        </div>
      )}
    </ExpedienteLayout>
  );
};

export default RecordDetailPage;
