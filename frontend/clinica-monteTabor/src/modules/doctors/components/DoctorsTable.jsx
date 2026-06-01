import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const doctors = [
  {
    nombre: "Fernando Miguel",
    apellido: "Velásquez Pérez",
    licencia: "MED-2024-001",
    estado: "Activo",
  },
  {
    nombre: "Daniela Elizabeth",
    apellido: "Villalta Sorto",
    licencia: "MED-2024-002",
    estado: "Activo",
  },
  {
    nombre: "Natalie Abigail",
    apellido: "Navarro Góchez",
    licencia: "MED-2024-003",
    estado: "Activo",
  },
];

const DoctorsTable = () => {
  return (
    <div className="rounded-xl border mt-5">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Apellido</TableHead>
            <TableHead>N° Licencia</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {doctors.map((doctor, index) => (
            <TableRow key={index}>
              <TableCell>{doctor.nombre}</TableCell>

              <TableCell>
                {doctor.apellido}
              </TableCell>

              <TableCell>
                {doctor.licencia}
              </TableCell>

              <TableCell>
                <span className="bg-green-100 text-green-600 px-3 py-1 rounded-full text-xs">
                  {doctor.estado}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default DoctorsTable;