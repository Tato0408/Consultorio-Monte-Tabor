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

  // Selección automática de la primera fila al cargar
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
      {/* SECCIÓN DEL ENCABEZADO */}
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

      {/* Renderiza las tarjetas de estadísticas */}
      <NurseStatCards stats={stats} loading={loading} />

      {/* CONTENEDOR EN REJILLA DE 12 COLUMNAS (SIMETRÍA EXACTA) */}
      <div className="grid grid-cols-12 gap-6 mt-8">
        
        {/* COLUMNA DE LA IZQUIERDA (TABLA DE ENFERMERAS) */}
        <div className="col-span-9">
          <NurseTable
            nurses={nurses}
            loading={loading}
            selectedNurse={selectedNurse}
            onSelect={selectNurse}
            onAdd={canCreate ? handleOpenCreate : undefined}
            onEdit={handleOpenEdit}
            onDelete={deleteNurse}
            canUpdate={canUpdate}
            canDelete={canDelete}
          />
        </div>

        {/* COLUMNA DE LA DERECHA (TARJETA DE PERFIL) */}
        <div className="col-span-3">
          <NurseProfileCard
            nurse={selectedNurse}
            nextProcedure={nextProcedure}
            loadingDetail={loadingDetail}
          />
        </div>
      </div>

      {/* MODAL DEL FORMULARIO */}
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