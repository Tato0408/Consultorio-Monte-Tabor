"use client";

import { useState } from "react";
import { Plus, MoreVertical, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";

/* Datos de ejemplo: se usan solo si no se pasa `patient.procedimientos` */
const SAMPLE_PROCEDIMIENTOS = [
  { nombre: "Aplicación de inyección IM", fecha: "23 Abril, 2026", doctor: "Gabriela Castillo", duracion: "30 minutos" },
  { nombre: "Lavado de oído", fecha: "23 Abril, 2026", doctor: "Gabriela Castillo", duracion: "30 minutos" },
  { nombre: "Retiro de puntos", fecha: "23 Abril, 2026", doctor: "Gabriela Castillo", duracion: "30 minutos" },
  { nombre: "Extracción de uña", fecha: "23 Abril, 2026", doctor: "Gabriela Castillo", duracion: "30 minutos" },
];

/* -------------------------------------------------------------------------
 *  PROCEDIMIENTOS POR PACIENTE
 *  Espera `patient.procedimientos` = [{ nombre, fecha, doctor, duracion }]
 * ------------------------------------------------------------------------- */
export default function ProcedimientosTab({ patient = {} }) {
  const data = patient.procedimientos?.length ? patient.procedimientos : SAMPLE_PROCEDIMIENTOS;

  const [rowsPerPage, setRowsPerPage] = useState(8);
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(data.length / rowsPerPage));
  const start = (page - 1) * rowsPerPage;
  const rows = data.slice(start, start + rowsPerPage);

  return (
    <div className="px-2 py-2 text-slate-800">
      {/* Botón agregar */}
      <div className="mb-6 flex justify-end">
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Agregar <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Encabezados */}
      <div className="grid grid-cols-5 gap-4 px-2 pb-4 text-center text-sm text-slate-400">
        <span>Procedimiento</span>
        <span>Fecha</span>
        <span>Doctor encargado</span>
        <span>Duración</span>
        <span>Acciones</span>
      </div>

      {/* Filas */}
      <div>
        {rows.map((p, i) => (
          <div
            key={i}
            className="grid grid-cols-5 items-center gap-4 border-t border-slate-50 px-2 py-5 text-center text-[15px] text-slate-700"
          >
            <span>{p.nombre}</span>
            <span className="text-slate-600">{p.fecha}</span>
            <span className="text-slate-600">{p.doctor}</span>
            <span className="text-slate-600">{p.duracion}</span>
            <span className="flex justify-center">
              <button type="button" className="text-slate-400 hover:text-slate-600">
                <MoreVertical className="h-4 w-4" />
              </button>
            </span>
          </div>
        ))}
      </div>

      {/* Pie: filas por página + paginación */}
      <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-5 text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <span>Filas por página</span>
          <div className="relative">
            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setPage(1);
              }}
              className="appearance-none rounded-md border border-slate-200 bg-white py-1 pl-3 pr-7 text-slate-700 focus:outline-none"
            >
              {[8, 16, 24, 32].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        <div className="flex items-center gap-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex items-center gap-1 text-slate-500 disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </button>

          <span className="text-slate-600">
            <span className="font-medium text-slate-800">{page}</span> de {totalPages}
          </span>

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="flex items-center gap-1 text-slate-500 disabled:opacity-40"
          >
            Siguiente
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}