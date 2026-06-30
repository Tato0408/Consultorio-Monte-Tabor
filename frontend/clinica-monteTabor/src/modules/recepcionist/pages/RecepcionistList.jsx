import React, { useEffect, useState } from "react";
import TableBar from "../components/TableBar";
import ReceptionistsTable from "../components/RecepcionistTable";
import ReceptionistsPagination from "../components/TablePagination";
import ReceptionistForm from "../components/RecepcionistForm";
import { useReceptionist } from "../hooks/useRecepcionist";
import { showSuccess, showError, confirmDelete } from "../../../lib/alerts";

const ReceptionistsList = () => {
  const {
    receptionists,
    loading,
    error,
    getReceptionists,
    searchRecepcionist, // <-- Importamos la función de búsqueda de tu hook
    deleteReceptionist,
  } = useReceptionist();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [receptionistToEdit, setReceptionistToEdit] = useState(null);
  
  // ==========================================
  // ESTADO PARA LA BÚSQUEDA
  // ==========================================
  const [search, setSearch] = useState("");

  useEffect(() => {
    getReceptionists();
  }, []);

  // ==========================================
  // MANEJADOR DE BÚSQUEDA (Filtra en tiempo real)
  // ==========================================
  const handleSearch = async (value) => {
    setSearch(value);
    await searchRecepcionist(value);
  };

  const handleOpenCreate = () => {
    setReceptionistToEdit(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (receptionist) => {
    setReceptionistToEdit(receptionist);
    setIsFormOpen(true);
  };

  const handleCloseForm = async (wasSaved = false) => {
    setIsFormOpen(false);

    if (wasSaved) {
      await getReceptionists();

      if (receptionistToEdit) {
        showSuccess(
          "Recepcionista actualizado",
          "La información fue actualizada correctamente."
        );
      } else {
        showSuccess(
          "Recepcionista agregado",
          "El recepcionista fue registrado correctamente."
        );
      }
    }

    setReceptionistToEdit(null);
  };

  const handleDelete = async (id) => {
    const confirmed = await confirmDelete();
    if (!confirmed) return;

    try {
      await deleteReceptionist(id);
      await getReceptionists();
      showSuccess(
        "Recepcionista eliminado",
        "El registro fue eliminado correctamente."
      );
    } catch (error) {
      showError(
        "Error",
        error.message || "No fue posible eliminar el recepcionista."
      );
    }
  };

  return (
    <div className="w-full min-h-screen bg-white p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Recepcionistas</h1>
        <p className="text-gray-400 mt-1">
          Gestiona y administra a los diferentes recepcionistas
        </p>
      </div>

      {/* REEMPLAZA TU ANTERIOR TABLEBAR POR ESTE CORREGIDO */}
      <TableBar
        search={search}
        setSearch={handleSearch}
        onAdd={handleOpenCreate}
      />

      <ReceptionistsTable
        receptionists={receptionists}
        loading={loading}
        error={error}
        onEdit={handleOpenEdit}
        onDelete={handleDelete}
      />

      <ReceptionistsPagination />

      <ReceptionistForm
        key={receptionistToEdit?._id || "new"}
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        receptionist={receptionistToEdit}
        refreshReceptionists={getReceptionists}
      />
    </div>
  );
};

export default ReceptionistsList;