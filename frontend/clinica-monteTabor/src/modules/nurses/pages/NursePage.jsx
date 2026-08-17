import { useState, useEffect } from "react";

import NurseTable from "../components/NurseTable";
import NurseStatCards from "../components/NurseStatCards";
import NurseProfileCard from "../components/NurseProfileCard";
import useNurse from "../hooks/useNurse";
import NurseFormModal from "../components/NurseFormModal";
import { useAuth } from "@/context/AuthContext";

const NursesPage = () => {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission("users.nurses", "create");
  const canUpdate = hasPermission("users.nurses", "update");
  const canDelete = hasPermission("users.nurses", "delete");

  const {
    nurses,
    selectedNurse,
    nextProcedure,
    stats,
    loading,
    loadingDetail,
    error,
    selectNurse,
    createNurse,
    updateNurse,
    deleteNurse,
  } = useNurse();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nurseToEdit, setNurseToEdit] = useState(null);

  // Selecciona automaticamente la primera enfermera de la lista al cargar
  useEffect(() => {
    if (nurses && nurses.length > 0 && !selectedNurse) {
      selectNurse(nurses[0]);
    }
  }, [nurses, selectedNurse, selectNurse]);

  const handleOpenCreate = () => {
    setNurseToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (nurse) => {
    setNurseToEdit(nurse);
    setIsModalOpen(true);
  };

  const handleSaveNurse = async (formData) => {
    if (nurseToEdit?._id) {
      return await updateNurse(nurseToEdit._id, formData);
    } else {
      return await createNurse(formData);
    }
  };

  return (
    <div className="p-8 bg-white min-h-screen w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Enfermeras</h1>
        <p className="text-sm text-slate-400 mt-1">
          Gestiona y administra a las diferentes enfermeras
        </p>
      </div>

      {error && (
        <div className="p-4 mb-6 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl font-medium">
          {error}
        </div>
      )}

      <NurseStatCards stats={stats} loading={loading} />

      {/* Rejilla de 12 columnas: tabla a la izquierda, perfil a la derecha */}
      <div className="grid grid-cols-12 gap-6 mt-8">

        {/* Columna izquierda: tabla de enfermeras (col-span-9) */}
        <div className="col-span-9">
          <NurseTable
            nurses={nurses}
            loading={loading}
            onSelect={selectNurse}
            onAdd={canCreate ? handleOpenCreate : undefined}
          />
        </div>

        {/* Columna derecha: tarjeta de perfil (col-span-3) */}
        <div className="col-span-3">
          <NurseProfileCard
            nurse={selectedNurse}
            nextProcedure={nextProcedure}
            loadingDetail={loadingDetail}
            onEdit={handleOpenEdit}
            onDelete={deleteNurse}
            canUpdate={canUpdate}
            canDelete={canDelete}
          />
        </div>
      </div>

      <NurseFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveNurse}
        nurse={nurseToEdit}
        isEditMode={!!nurseToEdit}
      />
    </div>
  );
};

export default NursesPage;