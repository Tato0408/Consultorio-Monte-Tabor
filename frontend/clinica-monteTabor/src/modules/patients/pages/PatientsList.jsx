import { useState, useEffect } from "react";
import PatientsTable from "../components/PatientsTable";
import PatientStatCards from "../components/PatientStatCards";
import PatientProfileCard from "../components/PatientProfileCard";
import PatientFormModal from "../components/PatientFormModal";
import usePatients from "../hooks/usePatients";

const PatientsList = () => {
  const {
    patients,
    selectedPatient,
    loading,
    error,
    selectPatient,
    createPatient,
    updatePatient,
    deletePatient,
  } = usePatients();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [patientToEdit, setPatientToEdit] = useState(null);

  // Selección automática de la primera fila al cargar
  useEffect(() => {
    if (patients.length > 0 && !selectedPatient) {
      selectPatient(patients[0]);
    }
  }, [patients, selectedPatient, selectPatient]);

  const handleOpenCreate = () => {
    setPatientToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (patient) => {
    setPatientToEdit(patient);
    setIsModalOpen(true);
  };

  const handleSavePatient = async (payload) => {
    if (patientToEdit?._id) {
      return await updatePatient(patientToEdit._id, payload);
    }
    return await createPatient(payload);
  };

  return (
    <div className="p-8 bg-white min-h-screen w-full font-sans text-slate-700">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Pacientes
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Gestiona y administra a los diferentes pacientes
        </p>
      </div>

      {error && (
        <div className="p-4 mb-6 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl font-medium">
          {error}
        </div>
      )}

      <PatientStatCards patients={patients} loading={loading} />

      <div className="grid grid-cols-12 gap-6 mt-8">
        <div className="col-span-9">
          <PatientsTable
            patients={patients}
            loading={loading}
            onAdd={handleOpenCreate}
            onEdit={handleOpenEdit}
            onDelete={deletePatient}
            onSelectPatient={selectPatient}
          />
        </div>

        <div className="col-span-3">
          <PatientProfileCard patient={selectedPatient} />
        </div>
      </div>

      <PatientFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSavePatient}
        patient={patientToEdit}
      />
    </div>
  );
};

export default PatientsList;
