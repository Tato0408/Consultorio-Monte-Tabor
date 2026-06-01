import React from "react";
import DoctorsStats from "../components/DoctorsStats";
import TableBar from "../components/TableBar";
import DoctorsTable from "../components/DoctorsTable";
import DoctorProfileCard from "../components/DoctorProfileCard";
import DoctorsCalendar from "../components/DoctorsCalendar";
import TablePagination from "../components/TablePagination";

const DoctorsList = () => {
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

      <DoctorsStats />

      <div className="grid grid-cols-12 gap-6 mt-8">
        <div className="col-span-8">
          <TableBar />
          <DoctorsTable />
          <TablePagination />
        </div>

        <div className="col-span-4">
          <DoctorProfileCard />
        </div>
      </div>

      <div className="mt-8">
        <DoctorsCalendar />
      </div>
    </div>
  );
};

export default DoctorsList;