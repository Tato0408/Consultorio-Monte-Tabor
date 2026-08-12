import React, { useState, useEffect } from "react";

// Importación de los subcomponentes actualizados
import DoctorsStats from "../components/DoctorsStats";
import DoctorsTable from "../components/DoctorsTable";
import DoctorProfileCard from "../components/DoctorProfileCard";
import DoctorForm from "../components/DoctorsForm";

// Importa el custom hook que maneja todo el estado global y peticiones de los doctores
import { useDoctors } from "../hooks/useDoctors";
// Importa las funciones personalizadas para mostrar las alertas de éxito o error en pantalla
import { showSuccess, showError, confirmDelete } from "../../../lib/alerts";
import { useAuth } from "@/context/AuthContext";

const DoctorsList = () => {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission("users.doctors", "create");
  const canUpdate = hasPermission("users.doctors", "update");
  const canDelete = hasPermission("users.doctors", "delete");

  // Desestructura las propiedades y funciones necesarias desde el custom hook
  const {
    doctors,
    loading,
    error,
    stats,
    getDoctors,
    deleteDoctor,
  } = useDoctors();

  // useState para guardar el objeto del doctor seleccionado para ver su perfil detallado
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  // useState para controlar si el modal del formulario está abierto (true) o cerrado (false)
  const [isFormOpen, setIsFormOpen] = useState(false);
  // useState para almacenar los datos del doctor que se va a modificar
  const [doctorToEdit, setDoctorToEdit] = useState(null);

  // ESTADOS PARA LA PAGINACIÓN
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(8);

  // El propio hook useDoctors ya pide la lista al montarse (su useEffect interno) — pedirla
  // también aquí duplicaba la petición en cada carga de la página.

  // Resetear a página 1 si cambia la cantidad de filas por página
  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage]);

  // useEffect para mantener seleccionado al doctor correcto en la tarjeta lateral de perfil
  useEffect(() => {
    if (doctors.length > 0) {
      const exists = doctors.find((d) => d._id === selectedDoctor?._id);
      if (!exists) {
        setSelectedDoctor(doctors[0]);
      }
    } else {
      setSelectedDoctor(null);
    }
  }, [doctors, selectedDoctor]);

  // Función para abrir el formulario en modo de creación nuevo
  const handleOpenCreate = () => {
    setDoctorToEdit(null);
    setIsFormOpen(true);
  };

  // Función para abrir el formulario listo para modificar
  const handleOpenEdit = (doctor) => {
    setDoctorToEdit(doctor);
    setIsFormOpen(true);
  };

  // CERRAR FORMULARIO Y REFRESCAR TABLA
  // Solo muestra el mensaje de éxito y refresca la tabla si el formulario realmente guardó algo
  // (wasSaved=true). Si el usuario cierra con la X sin guardar, wasSaved llega en false.
  const handleCloseForm = async (wasSaved = false) => {
    setIsFormOpen(false);

    if (wasSaved) {
      await getDoctors();

      if (doctorToEdit) {
        showSuccess("La información del doctor fue actualizada correctamente.");
      } else {
        showSuccess("El doctor fue registrado correctamente.");
      }
    }
    setDoctorToEdit(null);
  };

  // ELIMINAR (con confirmación previa)
  const handleDeleteDoctor = async (id) => {
    const confirmed = await confirmDelete({
      title: "¿Eliminar este doctor?",
      text: "Esta acción no se puede deshacer.",
    });
    if (!confirmed) return;

    try {
      await deleteDoctor(id);
      await getDoctors();

      showSuccess("El doctor fue eliminado correctamente.");

      if (selectedDoctor?._id === id) {
        setSelectedDoctor(null);
      }
    } catch (error) {
      console.error(error);
      showError(error.message || "No se pudo eliminar el doctor.");
    }
  };

  // LÓGICA DE PAGINACIÓN INTERNA
  const totalItems = doctors.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = doctors.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="p-8 bg-white min-h-screen w-full">
      {/* SECCIÓN DEL ENCABEZADO */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Doctores</h1>
        <p className="text-sm text-slate-400 mt-1">
          Gestiona y administra a los diferentes doctores
        </p>
      </div>

      {/* Renderiza las tarjetas de estadísticas */}
      <DoctorsStats doctors={doctors} stats={stats} loading={loading} />

      {/* CONTENEDOR EN REJILLA DE 12 COLUMNAS */}
      <div className="grid grid-cols-12 gap-6 mt-8">
        
        {/* COLUMNA DE LA IZQUIERDA (TABLA Y PAGINADOR - Expandido a col-span-9) */}
        <div className="col-span-9">
          
          {/* Se eliminó <TableBar /> ya que el buscador e inputs ahora viven dentro de la tabla genérica */}
          <DoctorsTable
            doctors={doctors}
            loading={loading}
            error={error}
            onSelectDoctor={setSelectedDoctor}
            onOpenForm={canCreate ? handleOpenCreate : undefined}
          />
        </div>

        {/* COLUMNA DE LA DERECHA (TARJETA DE PERFIL - Ajustado a col-span-3) */}
        <div className="col-span-3">
          <DoctorProfileCard
            doctor={selectedDoctor}
            onEdit={handleOpenEdit}
            onDelete={handleDeleteDoctor}
            canUpdate={canUpdate}
            canDelete={canDelete}
          />
        </div>
      </div>

      {/* MODAL DEL FORMULARIO DE REGISTRO / EDICIÓN */}
      <DoctorForm
        key={doctorToEdit?._id || "new"}
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        doctor={doctorToEdit}
        refreshDoctors={getDoctors}
      />
    </div>
  );
};

export default DoctorsList;