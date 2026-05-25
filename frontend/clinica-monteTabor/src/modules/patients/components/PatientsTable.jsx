import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const pacientes = [
  {
    nombre: "Emiliano Ándres",
    apellido: "Rodríguez Fuentes",
    dui: "74853478-9",
    telefono: "2184-7741",
    ultimaVisita: "23 Ene, 2026, 10:30AM",
  },
  {
    nombre: "Oscar Daniel",
    apellido: "Osorio Pérez",
    dui: "54813384-1",
    telefono: "7444-8367",
    ultimaVisita: "31 Abr, 2026, 8:00 AM",
  },
  {
    nombre: "Emiliano Ándres",
    apellido: "Rodríguez Fuentes",
    dui: "74853478-9",
    telefono: "2184-7741",
    ultimaVisita: "23 Ene, 2026, 10:30AM",
  },
  {
    nombre: "Oscar Daniel",
    apellido: "Osorio Pérez",
    dui: "54813384-1",
    telefono: "7444-8367",
    ultimaVisita: "31 Abr, 2026, 8:00 AM",
  },
  {
    nombre: "Emiliano Ándres",
    apellido: "Rodríguez Fuentes",
    dui: "74853478-9",
    telefono: "2184-7741",
    ultimaVisita: "23 Ene, 2026, 10:30AM",
  },
  {
    nombre: "Oscar Daniel",
    apellido: "Osorio Pérez",
    dui: "54813384-1",
    telefono: "7444-8367",
    ultimaVisita: "31 Abr, 2026, 8:00 AM",
  },
  {
    nombre: "Emiliano Ándres",
    apellido: "Rodríguez Fuentes",
    dui: "74853478-9",
    telefono: "2184-7741",
    ultimaVisita: "23 Ene, 2026, 10:30AM",
  },
  {
    nombre: "Oscar Daniel",
    apellido: "Osorio Pérez",
    dui: "54813384-1",
    telefono: "7444-8367",
    ultimaVisita: "31 Abr, 2026, 8:00 AM",
  },
];

const PatientsTable = () => {
  return (
    <div className="rounded-md border border-slate-100 overflow-hidden">
      <Table>
        <TableHeader className="bg-transparent">
          <TableRow className="border-b border-slate-100 hover:bg-transparent">
            <TableHead className="text-slate-400 font-normal h-11">
              Nombre
            </TableHead>
            <TableHead className="text-slate-400 font-normal h-11">
              Apellido
            </TableHead>
            <TableHead className="text-slate-400 font-normal h-11">
              DUI
            </TableHead>
            <TableHead className="text-slate-400 font-normal h-11">
              Teléfono
            </TableHead>
            <TableHead className="text-slate-400 font-normal h-11">
              Última visita
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pacientes.map((paciente, index) => (
            <TableRow
              key={index}
              className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
            >
              <TableCell className="py-3.5 font-semibold text-slate-900">
                {paciente.nombre}
              </TableCell>
              <TableCell className="py-3.5 text-slate-600 font-medium">
                {paciente.apellido}
              </TableCell>
              <TableCell className="py-3.5 text-slate-600 font-medium">
                {paciente.dui}
              </TableCell>
              <TableCell className="py-3.5 text-slate-600 font-medium">
                {paciente.telefono}
              </TableCell>
              <TableCell className="py-3.5 text-slate-600 font-medium">
                {paciente.ultimaVisita}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
export default PatientsTable
