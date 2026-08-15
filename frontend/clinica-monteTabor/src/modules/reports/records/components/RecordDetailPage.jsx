"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import apiClient from "@/lib/apiClient";
import { confirmDelete, showSuccess, showError } from "@/lib/alerts";
import ExpedienteLayout from "./global/RecordsLayout";
import ResumenTab from "./pages/ResumeTab";
import HistoriaClinicaTab from "./pages/RecordsHistoricalClinical";
import ProcedimientosTab from "./pages/RecordsProcedures";
import SignosVitalesTab from "./pages/RecordsVitalSigns";
import ConsultasTab from "./pages/RecordsConsultations";
import IncapacidadesTab from "./pages/RecordsIncapacidades";
import usePatientRecordDetail from "../hooks/usePatientRecordDetail";

const TAB_LABELS = ["Resumen", "Historia clínica", "Procedimientos", "Signos vitales", "Consultas", "Incapacidades"];

// Se renderiza dentro de RecordsPage al hacer clic en un paciente de la
// tabla. No navega a una ruta nueva, solo intercambia qué se muestra
// dentro del SPA.
// La prop record trae lo que ya vive en el documento del paciente
// (useRecords). usePatientRecordDetail completa aparte lo que depende de
// las consultas, las citas y las incapacidades reales, y se fusiona antes
// de pasarlo a cada pestaña.
// onPatientUpdated refresca el documento base del paciente, el que trae
// useRecords, después de guardar cualquiera de los modales del
// expediente (datos personales, antecedentes, signos vitales,
// procedimientos). Llamar solo a usePatientRecordDetail.refetch no
// alcanza, porque ese hook solo trae consultas, citas e incapacidades, no
// el documento del paciente en sí.
const RecordDetailPage = ({ record, onBack, onPatientUpdated }) => {
  const fullName = `${record?.nombre || ""} ${record?.apellido || ""}`.trim();
  const { extra, loading, error, refetch } = usePatientRecordDetail(record?.id, fullName);
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canAttend = hasPermission("calendar.consultations", "create");
  const canEdit = hasPermission("calendar.consultations", "update");
  const [activeTab, setActiveTab] = useState(0);

  // Elimina una consulta médica ya atendida (el documento Consultation
  // real, no la cita). Existe sobre todo para poder limpiar consultas
  // huérfanas: si su cita se borró por separado, la consulta sobrevive
  // apuntando solo al paciente y bloquea la eliminación del paciente sin
  // dar ninguna pista de por qué. Este botón es el único lugar del sistema
  // donde se puede quitar una consulta huérfana.
  const handleEliminarConsulta = async (c) => {
    const ok = await confirmDelete({
      title: "¿Eliminar esta consulta?",
      text: "Se borrará el registro clínico (diagnóstico, notas, receta). Esta acción no se puede deshacer.",
    });
    if (!ok) return;
    try {
      await apiClient(`/consultations/${c.id}`, { method: "DELETE" });
      showSuccess("Consulta eliminada correctamente");
      refreshAll();
    } catch (err) {
      showError(err.message || "No se pudo eliminar la consulta");
    }
  };

  // Refresca tanto el documento del paciente como las consultas, las citas
  // y las incapacidades. Los modales del expediente solo tocan el primero,
  // pero es más simple refrescar ambos siempre que reimplementar en cada
  // callback cuál de los dos hace falta.
  const refreshAll = () => {
    onPatientUpdated?.();
    refetch();
  };

  const goToTab = (label) => setActiveTab(TAB_LABELS.indexOf(label));

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

  // Solo sobrescribe la última visita y el doctor si la consulta más
  // reciente es más nueva que el último procedimiento ya calculado por
  // useRecords.
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
    {
      label: "Resumen",
      content: <ResumenTab patient={patient} onSaved={refreshAll} onNavigateTab={goToTab} />,
    },
    { label: "Historia clínica", content: <HistoriaClinicaTab patient={patient} onSaved={refreshAll} /> },
    { label: "Procedimientos", content: <ProcedimientosTab patient={patient} onSaved={refreshAll} /> },
    { label: "Signos vitales", content: <SignosVitalesTab patient={patient} onSaved={refreshAll} /> },
    {
      label: "Consultas",
      content: (
        <ConsultasTab
          patient={patient}
          canAttend={canAttend}
          canEdit={canEdit}
          onContinuar={(c) => c.appointmentId && navigate(`/calendar/consultations/${c.appointmentId}`)}
          onVerRegistro={(c) =>
            c.appointmentId &&
            navigate(`/calendar/consultations/${c.appointmentId}${canEdit ? "" : "?mode=view"}`)
          }
        />
      ),
    },
    { label: "Incapacidades", content: <IncapacidadesTab patient={patient} onSaved={refreshAll} /> },
  ];

  return (
    <ExpedienteLayout
      patient={patient}
      tabs={tabs}
      onBack={onBack}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onPatientUpdated={refreshAll}
    >
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
