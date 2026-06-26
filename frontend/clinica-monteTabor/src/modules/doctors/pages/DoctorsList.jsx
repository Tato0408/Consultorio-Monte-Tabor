import React, { useState, useEffect } from "react";
import DoctorsStats from "../components/DoctorsStats";
import TableBar from "../components/TableBar";
import DoctorsTable from "../components/DoctorsTable";
import DoctorProfileCard from "../components/DoctorProfileCard";
import DoctorsCalendar from "../components/DoctorsCalendar";
import TablePagination from "../components/TablePagination";
import DoctorForm from "../components/DoctorsForm";

import { useDoctors } from "../hooks/useDoctors";

const DoctorsList = () => {
  const { doctors, loading, error } = useDoctors();

  const [selectedDoctor, setSelectedDoctor] =
    useState(null);

  const [isFormOpen, setIsFormOpen] =
    useState(false);

  const [doctorToEdit, setDoctorToEdit] =
    useState(null);

  useEffect(() => {
    if (doctors.length > 0 && !selectedDoctor) {
      setSelectedDoctor(doctors[0]);
    }
  }, [doctors]);

  const handleOpenCreate = () => {
    setDoctorToEdit(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (doctor) => {
    setDoctorToEdit(doctor);
    setIsFormOpen(true);
  };

  const handleDeleteDoctor = async (id) => {
    try {
      console.log("Eliminar doctor:", id);

      // después conectamos el endpoint
      // await doctorService.delete(id)

    } catch (error) {
      console.error(error);
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
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        doctor={doctorToEdit}
      />
    </div>
  );
};

export default DoctorsList;