"use client";

import { useState } from "react";
import { Plus, Trash2, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import ProcedureRecordModal from "../global/ProcedureRecordModal";
import apiClient from "@/lib/apiClient";
import { confirmDelete, showSuccess, showError } from "@/lib/alerts";
import { useAuth } from "@/context/AuthContext";

// Espera que patient.procedimientos sea una lista de objetos con nombre,
// fecha, doctor, duracion, id (del subdocumento) y consultationId.
export default function ProcedimientosTab({ patient = {}, onSaved }) {
  const { hasPermission } = useAuth();
  const canDelete = hasPermission("users.patients", "delete");
  const data = patient.procedimientos ?? [];

  const [rowsPerPage, setRowsPerPage] = useState(8);
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Eliminar solo borra el registro del expediente: no revierte el
  // material ya descontado del inventario al registrarlo, y si el
  // procedimiento viene de una consulta podría reaparecer si esa
  // consulta se edita de nuevo. Se advierte ambas cosas aquí, en vez
  // de bloquear la acción, para no impedir corregir un registro mal
  // capturado.
  const handleDelete = async (row) => {
    const extra = row.consultationId
      ? " Este procedimiento viene de una consulta: si esa consulta se vuelve a editar, podría volver a aparecer."
      : "";
    const confirmed = await confirmDelete({
      title: "¿Eliminar este procedimiento?",
      text: `Esta acción no se puede deshacer. No revierte el material ya descontado del inventario al registrarlo.${extra}`,
    });
    if (!confirmed) return;

    setDeletingId(row.id);
    try {
      await apiClient(`/patients/${patient.id}/procedures/${row.id}`, { method: "DELETE" });
      showSuccess("Procedimiento eliminado correctamente");
      onSaved?.();
    } catch (err) {
      showError(err.message || "No se pudo eliminar el procedimiento");
    } finally {
      setDeletingId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(data.length / rowsPerPage));
  const start = (page - 1) * rowsPerPage;
  const rows = data.slice(start, start + rowsPerPage);

  return (
    <div className="px-2 py-2 text-slate-800">
      {/* Botón agregar */}
      <div className="mb-6 flex justify-end">
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Agregar <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Encabezados y filas: overflow-x-auto evita que las 5 columnas se
          desborden del ancho de la pantalla en móvil, deslizando en su
          lugar. */}
      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          {/* Misma franja gris de encabezado que las tablas de los reportes. Las 5
              columnas (grid-cols-5) quedan con el mismo ancho y todo va centrado. */}
          <div className="grid grid-cols-5 gap-4 rounded-lg bg-slate-50 px-2 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            <span>Procedimiento</span>
            <span>Fecha</span>
            <span>Doctor encargado</span>
            <span>Duración</span>
            <span>Acciones</span>
          </div>

          {/* Filas */}
          <div className="mt-1">
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
                  {canDelete ? (
                    <button
                      type="button"
                      onClick={() => handleDelete(p)}
                      disabled={deletingId === p.id}
                      title="Eliminar procedimiento"
                      className="text-slate-400 hover:text-red-600 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : (
                    <span className="text-slate-200">—</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pie: filas por página y paginación */}
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

      <ProcedureRecordModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        patientId={patient.id}
        onSaved={onSaved}
      />
    </div>
  );
}