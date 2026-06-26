import React, { useState } from "react";
// 1. Importación de los Hooks y componentes desarrollados (Tus paths actualizados)
import useProcedures from "../hooks/useProcedures"; 
import ProceduresTable from "../components/ProceduresTable";
import ProceduresFilters from "../components/ProceduresFilter";
import ProcedureForm from "../components/ProceduresForm";
import EditProcedureModal from "../components/EditProcedureModal";

const ProceduresPage = () => {
  const [activeTab, setActiveTab] = useState("list");
  
  // Estados para controlar el modal lateral de edición
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedProcedure, setSelectedProcedure] = useState(null);

  // Funciones globales del CRUD
  const {
    procedures,
    loading,
    error,
    submitting,
    saveProcedure,
    handleDelete,
  } = useProcedures();

  // Guardar nuevo procedimiento
  const handleCreateSubmit = async (data) => {
    const success = await saveProcedure(null, data);
    if (success) {
      setActiveTab("list"); // Redirecciona a la lista automáticamente
    }
  };

  // Actualizar procedimiento existente
  const handleUpdateSubmit = async (id, updatedData) => {
    const success = await saveProcedure(id, updatedData);
    if (success) {
      setIsEditModalOpen(false);
      setSelectedProcedure(null);
    }
  };

  // Abre el modal lateral y carga los datos del elemento a editar
  const handleOpenEdit = (procedure) => {
    setSelectedProcedure(procedure);
    setIsEditModalOpen(true);
  };

  return (
    <div className="space-y-6 p-6 bg-gray-50/50 min-h-screen">
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Procedimientos</h1>
        <p className="text-sm text-gray-500 mt-1">
          Administra y consulta todos los procedimientos registrados en el sistema.
        </p>
      </div>

      {/* Navegación por Tabs */}
      <div className="border-b border-gray-100 flex gap-6 text-sm font-medium">
        <button
          onClick={() => setActiveTab("list")}
          className={`pb-3 transition-all relative ${
            activeTab === "list"
              ? "text-blue-600 font-semibold border-b-2 border-blue-600"
              : "text-gray-500 hover:text-gray-800"
          }`}
        >
          Lista de procedimientos
        </button>
        <button
          onClick={() => setActiveTab("create")}
          className={`pb-3 transition-all relative ${
            activeTab === "create"
              ? "text-blue-600 font-semibold border-b-2 border-blue-600"
              : "text-gray-500 hover:text-gray-800"
          }`}
        >
          Crear procedimiento
        </button>
      </div>

      {/* Contenido Condicional de los Tabs */}
      <div className="pt-2">
        {activeTab === "list" ? (
          <div className="space-y-2">
            {error && (
              <div className="text-sm text-red-500 p-3 bg-red-50 rounded-lg border border-red-100">
                {error}
              </div>
            )}
            
            {/* Componente de Filtros */}
            <ProceduresFilters onFilterChange={() => {}} />
            
            {/* Componente de Tabla */}
            <ProceduresTable 
              data={procedures} 
              loading={loading} 
              onEdit={handleOpenEdit}
              onDelete={handleDelete}
            />
          </div>
        ) : (
          <div className="bg-transparent py-2">
            <ProcedureForm 
              onSubmit={handleCreateSubmit} 
              isSubmitting={submitting} 
            />
          </div>
        )}
      </div>

      {/* Modal de edición */}
      <EditProcedureModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedProcedure(null);
        }}
        procedureData={selectedProcedure}
        onUpdate={handleUpdateSubmit}
        isSubmitting={submitting}
      />
    </div>
  );
};

export default ProceduresPage;