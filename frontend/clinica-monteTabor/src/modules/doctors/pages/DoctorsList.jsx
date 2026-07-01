import React, { useState, useEffect } from "react";

import DoctorsStats from "../components/DoctorsStats";
import TableBar from "../components/TableBar";
import DoctorsTable from "../components/DoctorsTable";
import DoctorProfileCard from "../components/DoctorProfileCard";
import TablePagination from "../components/TablePagination";
import DoctorForm from "../components/DoctorsForm";

import { useDoctors } from "../hooks/useDoctors";
import { showSuccess, showError } from "../../../lib/alerts";

const DoctorsList = () => {
  const {
    doctors,
    loading,
    error,
    getDoctors,
    searchDoctors,
    deleteDoctor,
  } = useDoctors();

  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [doctorToEdit, setDoctorToEdit] = useState(null);
  const [search, setSearch] = useState("");

  // ==========================================
  // ESTADOS PARA LA PAGINACIÓN
  // ==========================================
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(8);

  // ==========================
  // BUSCADOR
  // ==========================
  const handleSearch = async (value) => {
    setSearch(value);
    await searchDoctors(value);
  };

  useEffect(() => {
    getDoctors();
  }, []);

  // Resetear a página 1 si cambia la cantidad de registros o filas por página
  useEffect(() => {
    setCurrentPage(1);
  }, [search, itemsPerPage]);

  useEffect(() => {
    if (doctors.length > 0) {
      const exists = doctors.find(
        (d) => d._id === selectedDoctor?._id
      );

      if (!exists) {
        setSelectedDoctor(doctors[0]);
      }
    } else {
      setSelectedDoctor(null);
    }
  }, [doctors, selectedDoctor]);

  // ==========================
  // ABRIR CREAR
  // ==========================
  const handleOpenCreate = () => {
    setDoctorToEdit(null);
    setIsFormOpen(true);
  };

  // ==========================
  // ABRIR EDITAR
  // ==========================
  const handleOpenEdit = (doctor) => {
    setDoctorToEdit(doctor);
    setIsFormOpen(true);
  };

  // ==========================
  // CERRAR FORMULARIO
  // ==========================
  const handleCloseForm = async () => {
    setIsFormOpen(false);
    await getDoctors();

    if (doctorToEdit) {
      showSuccess(
        "Doctor actualizado",
        "La información del doctor fue actualizada correctamente."
      );
    } else {
      showSuccess(
        "Doctor agregado",
        "El doctor fue registrado correctamente."
      );
    }

    setDoctorToEdit(null);
  };

  // ==========================
  // ELIMINAR DIRECTO
  // ==========================
  const handleDeleteDoctor = async (id) => {
    try {
      await deleteDoctor(id);
      await getDoctors();

      showSuccess(
        "Doctor eliminado",
        "El doctor fue eliminado correctamente."
      );

      if (selectedDoctor?._id === id) {
        setSelectedDoctor(null);
      }
    } catch (error) {
      console.error(error);
      showError(
        "Error",
        error.message || "No se pudo eliminar el doctor."
      );
    }
  };

  // ==========================================
  // CÁLCULOS LOGÍSTICOS DE PAGINACIÓN
  // ==========================================
  const totalItems = doctors.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

  // Segmentar el array de doctores según la página activa
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = doctors.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="p-8 bg-white min-h-screen w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Doctores</h1>
        <p className="text-sm text-slate-400 mt-1">
          Gestiona y administra a los diferentes doctores
        </p>
      </div>

      <DoctorsStats doctors={doctors} loading={loading} />

      <div className="grid grid-cols-12 gap-6 mt-8">
        <div className="col-span-8">
          <TableBar
            search={search}
            setSearch={handleSearch}
            onAdd={handleOpenCreate}
          />

          {/* Enviamos únicamente los registros cortados para la página actual */}
          <DoctorsTable
            doctors={currentItems}
            loading={loading}
            error={error}
            onSelectDoctor={setSelectedDoctor}
            onOpenForm={handleOpenCreate}
            onEditDoctor={handleOpenEdit}
            onDeleteDoctor={handleDeleteDoctor}
          />

          {/* Enlazamos todas las props requeridas al paginador */}
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            setItemsPerPage={setItemsPerPage}
            onNextPage={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            onPrevPage={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          />
        </div>

        <div className="col-span-4">
          <DoctorProfileCard doctor={selectedDoctor} />
        </div>
      </div>


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