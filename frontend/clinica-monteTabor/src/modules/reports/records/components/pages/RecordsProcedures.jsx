"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";

// Espera que patient.procedimientos sea una lista de objetos con nombre,
// fecha, doctor, duracion, id (del subdocumento) y consultationId.
// Pestaña de solo lectura: muestra únicamente los procedimientos realmente
// realizados a este paciente, es decir, los que vienen de una consulta real
// (consultationId presente, sincronizados por syncProcedureHistory en el
// backend). No hay botón de agregar ni de eliminar porque desde acá no se
// puede crear ni borrar un procedimiento suelto sin respaldo en una
// consulta — eso solo pasaba antes con el registro manual, que no reflejaba
// un procedimiento verdaderamente atendido.
export default function ProcedimientosTab({ patient = {} }) {
  const data = (patient.procedimientos ?? []).filter((p) => p.consultationId);

  const [rowsPerPage, setRowsPerPage] = useState(8);
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(data.length / rowsPerPage));
  const start = (page - 1) * rowsPerPage;
  const rows = data.slice(start, start + rowsPerPage);

  return (
    <div className="px-2 py-2 text-slate-800">
      {/* Encabezados y filas: overflow-x-auto evita que las 4 columnas se
          desborden del ancho de la pantalla en móvil, deslizando en su
          lugar. */}
      <div className="overflow-x-auto">
        <div className="min-w-[520px]">
          {/* Misma franja gris de encabezado que las tablas de los reportes. Las 4
              columnas (grid-cols-4) quedan con el mismo ancho y todo va centrado. */}
          <div className="grid grid-cols-4 gap-4 rounded-lg bg-slate-50 px-2 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            <span>Procedimiento</span>
            <span>Fecha</span>
            <span>Doctor encargado</span>
            <span>Duración</span>
          </div>

          {/* Filas */}
          <div className="mt-1">
            {rows.map((p, i) => (
              <div
                key={p.id || i}
                className="grid grid-cols-4 items-center gap-4 border-t border-slate-50 px-2 py-5 text-center text-[15px] text-slate-700"
              >
                <span>{p.nombre}</span>
                <span className="text-slate-600">{p.fecha}</span>
                <span className="text-slate-600">{p.doctor}</span>
                <span className="text-slate-600">{p.duracion}</span>
              </div>
            ))}

            {rows.length === 0 && (
              <p className="py-8 text-center text-sm text-slate-400">
                No hay procedimientos registrados para este paciente.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Pie: filas por página y paginación */}
      {data.length > 0 && (
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100 pt-5 text-sm text-slate-500">
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
      )}
    </div>
  );
}
