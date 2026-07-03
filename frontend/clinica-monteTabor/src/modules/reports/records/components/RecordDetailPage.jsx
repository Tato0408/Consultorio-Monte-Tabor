"use client";

import ExpedienteLayout from "./global/RecordsLayout";
import ResumenTab from "./pages/ResumeTab";
import HistoriaClinicaTab from "./pages/RecordsHistoricalClinical";
import ProcedimientosTab from "./pages/RecordsProcedures";
import SignosVitalesTab from "./pages/RecordsVitalSigns";
import ConsultasTab from "./pages/RecordsConsultations";

// Se renderiza dentro de RecordsPage al hacer clic en un paciente de la tabla:
// no navega a una ruta nueva, solo intercambia qué se muestra dentro del SPA.
// Cada pestaña recibe el mismo `record` (armado por useRecords -> getRecordById).
const RecordDetailPage = ({ record, onBack }) => {
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

  const tabs = [
    { label: "Resumen", content: <ResumenTab patient={record} /> },
    { label: "Historia clínica", content: <HistoriaClinicaTab patient={record} /> },
    { label: "Procedimientos", content: <ProcedimientosTab patient={record} /> },
    { label: "Signos vitales", content: <SignosVitalesTab patient={record} /> },
    { label: "Consultas", content: <ConsultasTab patient={record} /> },
  ];

  return <ExpedienteLayout patient={record} tabs={tabs} onBack={onBack} />;
};

export default RecordDetailPage;
