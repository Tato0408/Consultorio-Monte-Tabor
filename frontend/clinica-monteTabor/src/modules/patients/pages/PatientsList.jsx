import React from "react";
import PatientsTable from "../components/PatientsTable";
import TableBar from "../components/TableBar";
import TablePagination from "../components/TablePagination";

const PatientsList = () => {
  return (
    <>
      <div className="p-8 bg-white min-h-screen w-full font-sans text-slate-700">
        {/* Encabezado del Módulo */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Pacientes
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Gestiona y administra a los las diferentes pacientes
          </p>
        </div>

        {/* Componentes del Módulo */}
        <TableBar />
        <PatientsTable />

        <hr className="border-slate-200 my-5" />

        <TablePagination />
      </div>
    </>
  );
};
export default PatientsList
