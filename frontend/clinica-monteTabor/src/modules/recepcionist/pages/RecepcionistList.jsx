import React, { useState, useEffect } from "react";
import ReceptionistsTable from "../components/RecepcionistTable";
import ReceptionistForm from "../components/RecepcionistForm";
import ReceptionistProfileCard from "../components/ReceptionistProfileCard";
import { useReceptionist } from "../hooks/useRecepcionist";
import { showSuccess, showError, confirmDelete } from "../../../lib/alerts";
import { useAuth } from "@/context/AuthContext";

const ReceptionistsList = () => {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission("users.receptionist", "create");
  const canUpdate = hasPermission("users.receptionist", "update");
  const canDelete = hasPermission("users.receptionist", "delete");

  const {
    receptionists,
    loading,
    error,
    getReceptionists,
    deleteReceptionist,
  } = useReceptionist();

  const [isFormOpen, setIsFormOpen] = useState(false);

  // Recepcionista que se va a editar. Si es null, el formulario crea uno nuevo.
  const [receptionistToEdit, setReceptionistToEdit] = useState(null);

  const [selectedReceptionist, setSelectedReceptionist] = useState(null);

  // El hook useReceptionist ya carga la lista al montarse mediante su propio
  // useEffect interno, por lo que no es necesario volver a pedirla aquí.

  // Selecciona automaticamente la primera fila al cargar (misma logica que
  // en Pacientes y Enfermeras).
  useEffect(() => {
    if (receptionists.length > 0) {
      const exists = receptionists.find((r) => r._id === selectedReceptionist?._id);
      if (!exists) {
        setSelectedReceptionist(receptionists[0]);
      }
    } else {
      setSelectedReceptionist(null);
    }
  }, [receptionists, selectedReceptionist]);

  const handleOpenCreate = () => {
    setReceptionistToEdit(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (receptionist) => {
    setReceptionistToEdit(receptionist);
    setIsFormOpen(true);
  };

  // Cierra el formulario. Solo refresca la tabla y muestra el mensaje de
  // exito si el formulario realmente guardo algo (wasSaved en true).
  const handleCloseForm = async (wasSaved = false) => {
    setIsFormOpen(false);

    if (wasSaved) {
      await getReceptionists();

      // Si habia un recepcionista seleccionado, fue una edicion. Si no
      // habia ninguno seleccionado, fue un registro nuevo.
      if (receptionistToEdit) {
        showSuccess("La información fue actualizada correctamente.");
      } else {
        showSuccess("El recepcionista fue registrado correctamente.");
      }
    }

    setReceptionistToEdit(null);
  };

  // Elimina un recepcionista previa confirmacion del usuario.
  const handleDelete = async (id) => {
    const confirmed = await confirmDelete({
      title: "¿Eliminar este recepcionista?",
      text: "Esta acción no se puede deshacer.",
    });
    if (!confirmed) return;

    try {
      await deleteReceptionist(id);

      await getReceptionists();

      showSuccess("El recepcionista fue eliminado correctamente.");
    } catch (error) {
      showError(error.message || "No fue posible eliminar el recepcionista.");
    }
  };

  return (
    <div className="w-full min-h-screen bg-white p-4 sm:p-8">
      {/* Encabezado de la pantalla */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Recepcionistas</h1>
        <p className="text-gray-400 mt-1">
          Gestiona y administra a los diferentes recepcionistas
        </p>
      </div>

      {/* Contenedor principal: tabla a la izquierda, tarjeta de perfil a la derecha (una sola columna en móvil) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-8">
        <div className="lg:col-span-9">

          <ReceptionistsTable
            receptionists={receptionists}
            loading={loading}
            error={error}
            onSelect={setSelectedReceptionist}
            onOpenForm={canCreate ? handleOpenCreate : undefined}
          />

        </div>

        <div className="lg:col-span-3">
          <ReceptionistProfileCard
            receptionist={selectedReceptionist}
            onEdit={handleOpenEdit}
            onDelete={handleDelete}
            canUpdate={canUpdate}
            canDelete={canDelete}
          />
        </div>
      </div>

      {/* Modal que sirve tanto para registrar como para editar */}
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
