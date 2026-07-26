import React, { useEffect, useState } from "react";
import ReceptionistsTable from "../components/RecepcionistTable";
import ReceptionistForm from "../components/RecepcionistForm";
import { useReceptionist } from "../hooks/useRecepcionist";
import { showSuccess, showError, confirmDelete } from "../../../lib/alerts";
import { useAuth } from "@/context/AuthContext";

const ReceptionistsList = () => {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission("users.receptionist", "create");
  const canUpdate = hasPermission("users.receptionist", "update");
  const canDelete = hasPermission("users.receptionist", "delete");

  //Desestructuramos Userecepcionist (las funciones q trae) solo lo que vamos a ocupar del hook
  const {
    receptionists,
    loading,
    error,
    getReceptionists,
    deleteReceptionist,
  } = useReceptionist();

  //Estado para controlar si el formulario está abierto
  const [isFormOpen, setIsFormOpen] = useState(false);

  //Aquí guardamos el recepcionista que se va a editar
  //Si es null significa que vamos a crear uno nuevo
  const [receptionistToEdit, setReceptionistToEdit] = useState(null);

  //Cuando carga la vista obtenemos todos los recepcionistas
  useEffect(() => {
    getReceptionists();
  }, []);

  //Abre el formulario para registrar un nuevo recepcionista
  const handleOpenCreate = () => {
    setReceptionistToEdit(null);
    setIsFormOpen(true);
  };

  //Abre el formulario cargando la información del recepcionista seleccionado
  const handleOpenEdit = (receptionist) => {
    setReceptionistToEdit(receptionist);
    setIsFormOpen(true);
  };

  //Esta función se ejecuta cuando se cierra el formulario
  const handleCloseForm = async (wasSaved = false) => {
    //Cerramos el modal
    setIsFormOpen(false);

    //Si se guardó información volvemos a cargar la tabla
    if (wasSaved) {
      await getReceptionists();

      //Si había un recepcionista seleccionado significa que fue una edición
      if (receptionistToEdit) {
        showSuccess("La información fue actualizada correctamente.");
      } else {
        //Si no había ninguno seleccionado entonces fue un registro nuevo
        showSuccess("El recepcionista fue registrado correctamente.");
      }
    }

    //Limpiamos el estado para que no quede información guardada
    setReceptionistToEdit(null);
  };

  //Función para eliminar un recepcionista (con confirmación previa)
  const handleDelete = async (id) => {
    const confirmed = await confirmDelete({
      title: "¿Eliminar este recepcionista?",
      text: "Esta acción no se puede deshacer.",
    });
    if (!confirmed) return;

    try {
      //Eliminamos el registro
      await deleteReceptionist(id);

      //Actualizamos la tabla
      await getReceptionists();

      //Mostramos mensaje de éxito
      showSuccess("El recepcionista fue eliminado correctamente.");
    } catch (error) {
      //Si ocurre un error mostramos la alerta
      showError(error.message || "No fue posible eliminar el recepcionista.");
    }
  };

  return (
    <div className="w-full min-h-screen bg-white p-8">
      {/* Encabezado de la pantalla */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Recepcionistas</h1>
        <p className="text-gray-400 mt-1">
          Gestiona y administra a los diferentes recepcionistas
        </p>
      </div>

      {/* Contenedor principal donde irá la tabla */}
      <div className="grid grid-cols-12 gap-6 mt-8">
        {/* La tabla ocupa las 12 columnas */}
        <div className="col-span-12">
          
          {/* Aquí enviamos toda la información necesaria a la tabla */}
          <ReceptionistsTable
            receptionists={receptionists}
            loading={loading}
            error={error}
            onOpenForm={canCreate ? handleOpenCreate : undefined}
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