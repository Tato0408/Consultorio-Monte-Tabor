import React, { useEffect, useState } from "react";
import ReceptionistsTable from "../components/RecepcionistTable";
import ReceptionistForm from "../components/RecepcionistForm";
import { useReceptionist } from "../hooks/useRecepcionist";
import { showSuccess, showError } from "../../../lib/alerts";

const ReceptionistsList = () => {
  // Desestructuramos solo lo necesario (ya no ocupamos la función searchRecepcionist del backend)
  const {
    receptionists,
    loading,
    error,
    getReceptionists,
    deleteReceptionist,
  } = useReceptionist();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [receptionistToEdit, setReceptionistToEdit] = useState(null);

  useEffect(() => {
    getReceptionists();
  }, []);

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

  return (
    <div className="w-full min-h-screen bg-white p-8">
      {/* SECCIÓN DEL ENCABEZADO */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Recepcionistas</h1>
        <p className="text-gray-400 mt-1">
          Gestiona y administra a los diferentes recepcionistas
        </p>
      </div>

      {/* CONTENEDOR EN REJILLA DE 12 COLUMNAS (Mantiene consistencia estructural) */}
      <div className="grid grid-cols-12 gap-6 mt-8">
        {/* Como en recepcionistas no tienes un perfil a la derecha, ocupa las 12 columnas */}
        <div className="col-span-12">
          
          {/* Pasamos el array general de "receptionists" ENTERO, el GenericTable hace todo por dentro */}
          <ReceptionistsTable
            receptionists={receptionists}
            loading={loading}
            error={error}
            onOpenForm={handleOpenCreate}
            onEdit={handleOpenEdit}
            onDelete={handleDelete}
          />

        </div>
      </div>

      {/* MODAL DEL FORMULARIO DE REGISTRO / EDICIÓN */}
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