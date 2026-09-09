import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import useTreatmentsFollowUp from "../hooks/useTreatmentsFollowUp";

import TreatmentsStats from "../components/TreatmentsStats";
import TreatmentsList from "../components/TreatmentsList";
import TreatmentDetail from "../components/TreatmentDetail";

// Pantalla de tratamientos. Muestra la lista de planes con sus tarjetas de
// resumen; al elegir un plan se abre su detalle (línea de tiempo,
// documentos y acciones de transición). Un plan nace desde el formulario
// de consulta, no desde aquí; esta pantalla es para ver el panorama y
// registrar lo que pasa fuera de consulta.
const TreatmentsPage = () => {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission("inventory.treatments", "create");
  const canUpdate = hasPermission("inventory.treatments", "update");
  const canDelete = hasPermission("inventory.treatments", "delete");

  const {
    loading,
    error,
    stats,
    treatments,
    refetch,
    update_plan,
    schedule_control,
    set_status,
    add_note,
    update_note,
    delete_note,
    upload_document,
    delete_document,
  } = useTreatmentsFollowUp();

  const [selectedId, setSelectedId] = useState(null);

  const actions = {
    update_plan,
    schedule_control,
    set_status,
    add_note,
    update_note,
    delete_note,
    upload_document,
    delete_document,
  };

  return (
    <div className="p-4 sm:p-8 bg-gray-50/50 min-h-screen w-full font-sans text-slate-700">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Tratamientos</h1>
        <p className="text-sm text-slate-400 mt-1">Planes de tratamiento en seguimiento y su historial clínico</p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl p-4 flex items-center justify-between gap-4">
          <span>{error}</span>
          <button type="button" onClick={() => refetch()} className="font-semibold whitespace-nowrap hover:underline">
            Reintentar
          </button>
        </div>
      )}

      {selectedId ? (
        <TreatmentDetail
          treatmentId={selectedId}
          canCreate={canCreate}
          canUpdate={canUpdate}
          canDelete={canDelete}
          onBack={() => setSelectedId(null)}
          onRefetchList={() => refetch(true)}
          actions={actions}
        />
      ) : !loading && !error && treatments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 py-20 text-center text-sm text-slate-400">
          Todavía no hay planes de tratamiento. Se crean desde el formulario de consulta, marcando
          "Este paciente inicia un plan de tratamiento".
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <TreatmentsStats stats={stats} loading={loading} />
          <TreatmentsList
            treatments={treatments}
            loading={loading}
            onSelectTreatment={(id) => setSelectedId(id)}
          />
        </div>
      )}
    </div>
  );
};

export default TreatmentsPage;
