import { useState, useEffect } from "react";
import useTreatmentsFollowUp from "../hooks/useTreatmentsFollowUp";

import TreatmentsStats from "../components/TreatmentsStats";
import TreatmentsPatientsTable from "../components/TreatmentsPatientsTable";
import EvolutionChart from "../components/EvolutionChart";
import UpcomingControls from "../components/UpcomingControls";
import PatientTreatmentPanel from "../components/PatientTreatmentPanel";

const TreatmentsPage = () => {
  const { loading, stats, patients, chartData, upcomingControls } = useTreatmentsFollowUp();
  const [selectedPatient, setSelectedPatient] = useState(null);

  useEffect(() => {
    if (!loading && patients.length > 0 && !selectedPatient) {
      setSelectedPatient(patients[0]);
    }
  }, [loading, patients, selectedPatient]);

  return (
    <div className="p-4 sm:p-8 bg-gray-50/50 min-h-screen w-full font-sans text-slate-700">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Seguimiento del Paciente</h1>
        <p className="text-sm text-slate-400 mt-1">Gestiona el plan de atención y evolución de cada paciente</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Columna principal */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <TreatmentsStats stats={stats} loading={loading} />

          <TreatmentsPatientsTable
            patients={patients}
            loading={loading}
            onSelectPatient={setSelectedPatient}
            selectedPatientId={selectedPatient?.id}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <EvolutionChart data={chartData} loading={loading} />
            <UpcomingControls controls={upcomingControls} loading={loading} />
          </div>
        </div>

        {/* Panel lateral del paciente seleccionado */}
        <div className="lg:col-span-4">
          <div className="sticky top-6">
            <PatientTreatmentPanel patient={selectedPatient} onClose={() => setSelectedPatient(null)} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TreatmentsPage;
