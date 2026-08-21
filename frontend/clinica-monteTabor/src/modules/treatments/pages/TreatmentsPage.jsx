import { useState, useEffect } from "react";
import useTreatmentsFollowUp from "../hooks/useTreatmentsFollowUp";

import TreatmentsStats from "../components/TreatmentsStats";
import TreatmentsPatientsTable from "../components/TreatmentsPatientsTable";
import EvolutionChart from "../components/EvolutionChart";
import UpcomingControls from "../components/UpcomingControls";
import PatientTreatmentPanel from "../components/PatientTreatmentPanel";

const TreatmentsPage = () => {
  const {
    loading,
    error,
    stats,
    patients,
    chartData,
    upcomingControls,
    refetch,
    updateEvolution,
    deleteEvolution,
    addNote,
    updateNote,
    deleteNote,
    uploadDocument,
    deleteDocument,
    scheduleControl,
    setStatus,
    discharge,
  } = useTreatmentsFollowUp();

  // Se guarda solo el ID seleccionado (no una copia del paciente): así, cada vez que las 4
  // acciones del panel refrescan la lista de pacientes, "selectedPatient" se recalcula solo con
  // los datos más recientes en vez de quedarse mostrando la versión vieja de antes de guardar.
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const selectedPatient = patients.find((p) => p.id === selectedPatientId) || null;

  useEffect(() => {
    if (!loading && patients.length > 0 && !selectedPatientId) {
      setSelectedPatientId(patients[0].id);
    }
  }, [loading, patients, selectedPatientId]);

  return (
    <div className="p-4 sm:p-8 bg-gray-50/50 min-h-screen w-full font-sans text-slate-700">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Seguimiento del paciente</h1>
        <p className="text-sm text-slate-400 mt-1">Gestiona el plan de atención y evolución de cada paciente</p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl p-4 flex items-center justify-between gap-4">
          <span>{error}</span>
          <button
            type="button"
            onClick={refetch}
            className="font-semibold whitespace-nowrap hover:underline"
          >
            Reintentar
          </button>
        </div>
      )}

      {!loading && !error && patients.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 py-20 text-center text-sm text-slate-400">
          Todavía no hay pacientes con procedimientos registrados para dar seguimiento.
        </div>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Estadísticas: fila superior completa */}
        <div className="order-1 lg:col-start-1 lg:col-span-8 lg:row-start-1">
          <TreatmentsStats stats={stats} loading={loading} />
        </div>

        {/* Tabla de pacientes en seguimiento */}
        <div className="order-2 lg:col-start-1 lg:col-span-8 lg:row-start-2">
          <TreatmentsPatientsTable
            patients={patients}
            loading={loading}
            onSelectPatient={(p) => setSelectedPatientId(p.id)}
            selectedPatientId={selectedPatient?.id}
          />
        </div>

        {/* Panel del paciente seleccionado: en móvil va justo debajo de la tabla
            (orden de apilado), en escritorio queda fijo a la derecha abarcando
            la altura de estadísticas, tabla y gráficas. */}
        <div className="order-3 lg:col-start-9 lg:col-span-4 lg:row-start-1 lg:row-span-3">
          <div className="lg:sticky lg:top-6">
            <PatientTreatmentPanel
              patient={selectedPatient}
              onClose={() => setSelectedPatientId(null)}
              onUpdateEvolution={(result) => updateEvolution(selectedPatient.id, result)}
              onDeleteEvolution={() => deleteEvolution(selectedPatient.id)}
              onAddNote={(text) => addNote(selectedPatient.id, text)}
              onUpdateNote={(noteId, text) => updateNote(selectedPatient.id, noteId, text)}
              onDeleteNote={(noteId) => deleteNote(selectedPatient.id, noteId)}
              onUploadDocument={(file) => uploadDocument(selectedPatient.id, file)}
              onDeleteDocument={(documentId) => deleteDocument(selectedPatient.id, documentId)}
              onScheduleControl={(date) => scheduleControl(selectedPatient.id, date)}
              onSetStatus={(status) => setStatus(selectedPatient.id, status)}
              onDischarge={() => discharge(selectedPatient.id)}
            />
          </div>
        </div>

        {/* Gráficas: fila inferior completa */}
        <div className="order-4 lg:col-start-1 lg:col-span-8 lg:row-start-3 grid grid-cols-1 md:grid-cols-2 gap-6">
          <EvolutionChart data={chartData} loading={loading} />
          <UpcomingControls controls={upcomingControls} loading={loading} />
        </div>
      </div>
      )}
    </div>
  );
};

export default TreatmentsPage;
