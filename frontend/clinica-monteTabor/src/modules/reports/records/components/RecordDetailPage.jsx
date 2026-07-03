"use client";

import ExpedienteLayout from "./global/RecordsLayout";
import ResumenTab from "./pages/ResumeTab";
import HistoriaClinicaTab from "./pages/RecordsHistoricalClinical";
import ProcedimientosTab from "./pages/RecordsProcedures";

/* Placeholder para las pestañas que aún no tienen contenido */
const EnConstruccion = ({ label }) => (
  <div className="py-24 text-center text-sm text-slate-400">
    Contenido de "{label}" en construcción.
  </div>
);

/* -------------------------------------------------------------------------
 *  DETALLE DEL EXPEDIENTE
 *  Se renderiza en el mismo componente de página (RecordsPage) al hacer clic
 *  en un paciente de la tabla: no navega a una ruta nueva, solo intercambia
 *  qué se muestra dentro del SPA. Cada pestaña recibe el mismo `record`
 *  (armado por useRecords -> getRecordById) y se navega entre ellas por
 *  índice, igual que la pestaña "Resumen".
 * ------------------------------------------------------------------------- */
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
    { label: "Signos vitales", content: <EnConstruccion label="Signos vitales" /> },
    { label: "Consultas", content: <EnConstruccion label="Consultas" /> },
  ];

  return <ExpedienteLayout patient={record} tabs={tabs} onBack={onBack} />;
};

export default RecordDetailPage;
