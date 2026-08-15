import React, { useState, useEffect } from "react";

import DoctorsStats from "../components/DoctorsStats";
import DoctorsTable from "../components/DoctorsTable";
import DoctorProfileCard from "../components/DoctorProfileCard";
import DoctorForm from "../components/DoctorsForm";

import { useDoctors } from "../hooks/useDoctors";
import { showSuccess, showError, confirmDelete } from "../../../lib/alerts";
import { useAuth } from "@/context/AuthContext";

const DoctorsList = () => {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission("users.doctors", "create");
  const canUpdate = hasPermission("users.doctors", "update");
  const canDelete = hasPermission("users.doctors", "delete");

  const {
    doctors,
    loading,
    error,
    stats,
    getDoctors,
    deleteDoctor,
  } = useDoctors();

  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [doctorToEdit, setDoctorToEdit] = useState(null);

  // ESTADOS PARA LA PAGINACIÓN
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(8);

  // El hook useDoctors ya carga la lista al montarse mediante su propio
  // useEffect interno, por lo que no es necesario volver a pedirla aquí.

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

  const handleOpenCreate = () => {
    setDoctorToEdit(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (doctor) => {
    setDoctorToEdit(doctor);
    setIsFormOpen(true);
  };

  // Cierra el formulario. Solo refresca la tabla y muestra el mensaje de
  // exito si el formulario realmente guardo algo (wasSaved en true). Si el
  // usuario cierra con la X sin guardar, wasSaved llega en false.
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

  // Elimina un doctor previa confirmacion del usuario.
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

      <DoctorsStats doctors={doctors} stats={stats} loading={loading} />

      {/* CONTENEDOR EN REJILLA DE 12 COLUMNAS */}
      <div className="grid grid-cols-12 gap-6 mt-8">
        
        {/* Columna izquierda: tabla y paginador (col-span-9) */}
        <div className="col-span-9">

          <DoctorsTable
            doctors={doctors}
            loading={loading}
            error={error}
            onSelectDoctor={setSelectedDoctor}
            onOpenForm={canCreate ? handleOpenCreate : undefined}
          />
        </div>

        {/* Columna derecha: tarjeta de perfil (col-span-3) */}
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

      {/* Modal del formulario de registro y edicion */}
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