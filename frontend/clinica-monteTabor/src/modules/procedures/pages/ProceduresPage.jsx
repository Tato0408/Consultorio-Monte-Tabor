import React, { useState } from "react";
import useProcedures from "../hooks/useProcedures";
import ProceduresTable from "../components/ProceduresTable";
import ProcedureForm from "../components/ProceduresForm";
import EditProcedureModal from "../components/EditProcedureModal";
import { useAuth } from "@/context/AuthContext";

const ProceduresPage = () => {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission("procedures", "create");
  const canUpdate = hasPermission("procedures", "update");
  const canDelete = hasPermission("procedures", "delete");

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
    <div className="p-8 bg-white min-h-screen w-full">
      {/* SECCIÓN DEL ENCABEZADO (Diseño simétrico unificado) */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Procedimientos</h1>
        <p className="text-sm text-slate-400 mt-1">
          Administra y consulta todos los procedimientos registrados en el sistema.
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-100 flex gap-4 md:gap-6 text-sm font-medium overflow-x-auto mb-6">
        {[
          { key: "list", label: "Lista de procedimientos" },
          ...(canCreate ? [{ key: "create", label: "Crear procedimiento" }] : []),
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

      {/* Contenido principal */}
      <div>
        {activeTab === "list" ? (
          <div className="space-y-4">
            {error && (
              <div className="text-sm text-red-500 p-3 bg-red-50 rounded-lg border border-red-100">
                {error}
              </div>
            )}
            
            <ProceduresTable
              data={procedures}
              loading={loading}
              onEdit={handleOpenEdit}
              onDelete={handleDelete}
              canUpdate={canUpdate}
              canDelete={canDelete}
            />
          </div>
        ) : (
          <div className="bg-transparent py-1 md:py-2">
            <ProcedureForm onSubmit={handleCreateSubmit} isSubmitting={submitting} />
          </div>
        )}
      </div>

      {/* Modal de edición */}
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