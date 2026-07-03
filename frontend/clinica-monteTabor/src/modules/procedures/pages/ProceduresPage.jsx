import React, { useState } from "react";
import useProcedures from "../hooks/useProcedures"; 
import ProceduresTable from "../components/ProceduresTable";
import ProceduresFilters from "../components/ProceduresFilter";
import ProcedureForm from "../components/ProceduresForm";
import EditProcedureModal from "../components/EditProcedureModal";

const ProceduresPage = () => {
  const [activeTab, setActiveTab] = useState("list");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedProcedure, setSelectedProcedure] = useState(null);

  const { procedures, loading, error, submitting, saveProcedure, handleDelete } = useProcedures();

  const handleCreateSubmit = async (data) => {
    const success = await saveProcedure(null, data);
    if (success) setActiveTab("list");
  };

  const handleUpdateSubmit = async (id, updatedData) => {
    const success = await saveProcedure(id, updatedData);
    if (success) {
      setIsEditModalOpen(false);
      setSelectedProcedure(null);
    }
  };

  const handleOpenEdit = (procedure) => {
    setSelectedProcedure(procedure);
    setIsEditModalOpen(true);
  };

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6 bg-gray-50/50 min-h-screen">

      {/* Encabezado */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">Procedimientos</h1>
        <p className="text-sm text-gray-500 mt-1">
          Administra y consulta todos los procedimientos registrados en el sistema.
        </p>
      </div>

      <div className="border-b border-gray-100 flex gap-4 md:gap-6 text-sm font-medium overflow-x-auto">
        {[
          { key: "list", label: "Lista de procedimientos" },
          { key: "create", label: "Crear procedimiento" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`pb-3 whitespace-nowrap transition-all relative flex-shrink-0 ${
              activeTab === tab.key
                ? "text-blue-600 font-semibold border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Contenido */}
      <div className="pt-1 md:pt-2">
        {activeTab === "list" ? (
          <div className="space-y-2">
            {error && (
              <div className="text-sm text-red-500 p-3 bg-red-50 rounded-lg border border-red-100">
                {error}
              </div>
            )}
            <ProceduresFilters onFilterChange={() => {}} />
            <ProceduresTable
              data={procedures}
              loading={loading}
              onEdit={handleOpenEdit}
              onDelete={handleDelete}
            />
          </div>
        ) : (
          <div className="bg-transparent py-1 md:py-2">
            <ProcedureForm onSubmit={handleCreateSubmit} isSubmitting={submitting} />
          </div>
        )}
      </div>

      <EditProcedureModal
        isOpen={isEditModalOpen}
        onClose={() => { setIsEditModalOpen(false); setSelectedProcedure(null); }}
        procedureData={selectedProcedure}
        onUpdate={handleUpdateSubmit}
        isSubmitting={submitting}
      />
    </div>
  );
};

export default ProceduresPage;