import React, { useState, useEffect } from "react";
import DoctorsStats from "../components/DoctorsStats";
import TableBar from "../components/TableBar";
import DoctorsTable from "../components/DoctorsTable";
import DoctorProfileCard from "../components/DoctorProfileCard";
import DoctorsCalendar from "../components/DoctorsCalendar";
import TablePagination from "../components/TablePagination";
import DoctorForm from "../components/DoctorsForm";

import { useDoctors } from "../hooks/useDoctors";

import {
  showSuccess,
  showError,
  confirmDelete,
} from "../../../lib/alerts";

const DoctorsList = () => {
  const {
    doctors,
    loading,
    error,
    getDoctors,
    deleteDoctor,
  } = useDoctors();

  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [doctorToEdit, setDoctorToEdit] = useState(null);

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
  // ELIMINAR
  // ==========================
  const handleDeleteDoctor = async (id) => {
    const confirmed = await confirmDelete();

    if (!confirmed) return;

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

  return (
    <div className="p-8 bg-white min-h-screen w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">
          Doctores
        </h1>

        <p className="text-sm text-slate-400 mt-1">
          Gestiona y administra a los diferentes doctores
        </p>
      </div>

      <DoctorsStats
        doctors={doctors}
        loading={loading}
      />

      <div className="grid grid-cols-12 gap-6 mt-8">
        <div className="col-span-8">
          <TableBar />

          <DoctorsTable
            doctors={doctors}
            loading={loading}
            error={error}
            onSelectDoctor={setSelectedDoctor}
            onOpenForm={handleOpenCreate}
            onEditDoctor={handleOpenEdit}
            onDeleteDoctor={handleDeleteDoctor}
          />

          <TablePagination />
        </div>

        <div className="col-span-4">
          <DoctorProfileCard
            doctor={selectedDoctor}
          />
        </div>
      </div>

      <div className="mt-8">
        <DoctorsCalendar />
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