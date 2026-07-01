import React, { useEffect, useState } from "react";
import TableBar from "../components/TableBar";
import ReceptionistsTable from "../components/RecepcionistTable";
import ReceptionistsPagination from "../components/TablePagination";
import ReceptionistForm from "../components/RecepcionistForm";
import { useReceptionist } from "../hooks/useRecepcionist";
import { showSuccess, showError } from "../../../lib/alerts"; // Quitamos confirmDelete

const ReceptionistsList = () => {
  const {
    receptionists,
    loading,
    error,
    getReceptionists,
    searchRecepcionist,
    deleteReceptionist,
  } = useReceptionist();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [receptionistToEdit, setReceptionistToEdit] = useState(null);
  const [search, setSearch] = useState("");

  // ==========================================
  // ESTADOS PARA LA PAGINACIÓN
  // ==========================================
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(8); // Por defecto 8 filas

  useEffect(() => {
    getReceptionists();
  }, []);

  // Resetear a página 1 si cambia la cantidad de registros (por búsquedas o filtros)
  useEffect(() => {
    setCurrentPage(1);
  }, [search, itemsPerPage]);

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

  // Eliminación directa sin alertas de confirmación
  const handleDelete = async (id) => {
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

  // ==========================================
  // CÁLCULOS LOGÍSTICOS DE PAGINACIÓN
  // ==========================================
  const totalItems = receptionists.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

  // Cortar el array original para enviar solo los de la página activa
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = receptionists.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="w-full min-h-screen bg-white p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Recepcionistas</h1>
        <p className="text-gray-400 mt-1">
          Gestiona y administra a los diferentes recepcionistas
        </p>
      </div>

      <TableBar
        search={search}
        setSearch={handleSearch}
        onAdd={handleOpenCreate}
      />

      {/* Pasamos solo los elementos de la página actual */}
      <ReceptionistsTable
        receptionists={currentItems}
        loading={loading}
        error={error}
        onEdit={handleOpenEdit}
        onDelete={handleDelete}
      />

      {/* Enlazamos las props obligatorias al paginador */}
      <ReceptionistsPagination
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={itemsPerPage}
        setItemsPerPage={setItemsPerPage}
        onNextPage={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
        onPrevPage={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
        totalItems={totalItems}
      />

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