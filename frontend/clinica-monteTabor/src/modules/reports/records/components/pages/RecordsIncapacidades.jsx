"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, FileDown, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { Badge } from "../global/ui";
import { useAuth } from "@/context/AuthContext";
import IncapacidadFormModal from "../global/IncapacidadFormModal";
import apiClient from "@/lib/apiClient";
import { confirmDelete, showSuccess, showError } from "@/lib/alerts";
import { calculateAge } from "@/lib/validators";
import { openPdfInNewTab } from "@/modules/schedule/consultations/pdf/openPdfInNewTab";
import IncapacidadDocument from "@/modules/schedule/consultations/pdf/IncapacidadDocument";

// Mismo patrón de tabla paginada que usa RecordsProcedures.jsx. Las
// incapacidades pueden acumularse con el tiempo, así que no van en un
// modal (ver el análisis del expediente).
// Espera que patient.incapacidades sea una lista de objetos con nombre,
// fecha, fechaFin, estado y los campos crudos (diagnosisRaw, startDateRaw,
// restDays, doctorId, doctorName) que arma usePatientRecordDetail.
export default function IncapacidadesTab({ patient = {}, onSaved }) {
  const { hasPermission, user, userType } = useAuth();
  const canCreate = hasPermission("reports.records", "create");
  const canUpdate = hasPermission("reports.records", "update");
  const canDelete = hasPermission("reports.records", "delete");
  // Generar el PDF no depende de quién emitió la incapacidad: cualquiera
  // con permiso de ver el expediente clínico puede reimprimirlo (ej. un
  // admin, si el paciente perdió su copia).
  const canGeneratePdf = hasPermission("reports.records", "view");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const data = patient.incapacidades ?? [];
  const [rowsPerPage, setRowsPerPage] = useState(8);
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(data.length / rowsPerPage));
  const start = (page - 1) * rowsPerPage;
  const rows = data.slice(start, start + rowsPerPage);

  const openCreate = () => { setEditingEntry(null); setModalOpen(true); };
  const openEdit = (row) => { setEditingEntry(row); setModalOpen(true); };

  const handleDelete = async (row) => {
    const confirmed = await confirmDelete({
      title: "¿Eliminar esta incapacidad?",
      text: "Esta acción no se puede deshacer.",
    });
    if (!confirmed) return;

    setDeletingId(row.id);
    try {
      await apiClient(`/sick-leaves/${row.id}`, { method: "DELETE" });
      showSuccess("Incapacidad eliminada correctamente");
      onSaved?.();
    } catch (err) {
      showError(err.message || "No se pudo eliminar la incapacidad");
    } finally {
      setDeletingId(null);
    }
  };

  const patientFullName = `${patient.nombre || ""} ${patient.apellido || ""}`.trim();

  const handleGeneratePdf = async (row) => {
    const issueDate = row.startDateRaw ? new Date(row.startDateRaw) : new Date();
    const dateFormatted = issueDate.toLocaleDateString("es-SV", { day: "2-digit", month: "2-digit", year: "numeric" });
    const dateFileSafe = dateFormatted.replace(/\//g, "-");
    // Quien genera el PDF firma con su propio nombre si es doctor, admin o enfermera (por
    // ejemplo, un admin reimprimiéndola, un doctor distinto al que atendió, o la enfermera
    // asignada a un procedimiento sin doctor). Recepción no firma nada clínico, así que ahí
    // se mantiene el nombre de quien realmente atendió al paciente.
    const signatureName = userType === "doctor" || userType === "admin" || userType === "nurse"
      ? `${user?.name || ""} ${user?.last_name || ""}`.trim() || row.doctorName
      : row.doctorName;
    try {
      await openPdfInNewTab(
        <IncapacidadDocument
          title={`Incapacidad de ${patientFullName} ${dateFileSafe}`}
          patientName={patientFullName}
          dui={patient.dui}
          age={calculateAge(patient.birthDate)}
          diagnosis={row.diagnosisRaw}
          restDays={row.restDays}
          doctorName={signatureName}
          date={dateFormatted}
        />
      );
    } catch (err) {
      showError(err?.message || "No se pudo generar el PDF de la incapacidad.");
    }
  };

  return (
    <div className="px-2 py-2 text-slate-800">
      {canCreate && (
        <div className="mb-6 flex justify-end">
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Agregar <Plus className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <div className="min-w-[640px]">
          {/* Misma franja gris de encabezado que las tablas de los reportes. Las 5
              columnas (grid-cols-5) quedan con el mismo ancho y todo va centrado. */}
          <div className="grid grid-cols-5 gap-4 rounded-lg bg-slate-50 px-2 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            <span>Diagnóstico</span>
            <span>Fecha de inicio</span>
            <span>Fecha de finalización</span>
            <span>Estado</span>
            <span>Acciones</span>
          </div>

          <div className="mt-1">
            {rows.map((r, i) => (
              <div
                key={r.id || i}
                className="grid grid-cols-5 items-center gap-4 border-t border-slate-50 px-2 py-5 text-center text-[15px] text-slate-700"
              >
                <span>{r.nombre}</span>
                <span className="text-slate-600">{r.fecha}</span>
                <span className="text-slate-600">{r.fechaFin}</span>
                <span className="flex justify-center">
                  <Badge tone={r.estado === "No vigente" ? "gray" : "green"}>{r.estado}</Badge>
                </span>
                <span className="flex justify-center items-center gap-3">
                  {canGeneratePdf && (
                    <button
                      type="button"
                      onClick={() => handleGeneratePdf(r)}
                      title="Generar PDF"
                      className="text-slate-400 hover:text-blue-600"
                    >
                      <FileDown className="h-4 w-4" />
                    </button>
                  )}
                  {canUpdate && (
                    <button
                      type="button"
                      onClick={() => openEdit(r)}
                      title="Editar incapacidad"
                      className="text-slate-400 hover:text-amber-600"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  )}
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => handleDelete(r)}
                      disabled={deletingId === r.id}
                      title="Eliminar incapacidad"
                      className="text-slate-400 hover:text-red-600 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                  {!canGeneratePdf && !canUpdate && !canDelete && (
                    <span className="text-slate-200">—</span>
                  )}
                </span>
              </div>
            ))}

            {rows.length === 0 && (
              <p className="py-8 text-center text-sm text-slate-400">No hay incapacidades registradas.</p>
            )}
          </div>
        </div>
      </div>

      {data.length > 0 && (
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100 pt-5 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <span>Filas por página</span>
            <div className="relative">
              <select
                value={rowsPerPage}
                onChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(1); }}
                className="appearance-none rounded-md border border-slate-200 bg-white py-1 pl-3 pr-7 text-slate-700 focus:outline-none"
              >
                {[8, 16, 24, 32].map((n) => <option key={n} value={n}>{n}</option>)}
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
              <ChevronLeft className="h-4 w-4" /> Anterior
            </button>
            <span className="text-slate-600">
              <span className="font-medium text-slate-800">{page}</span> de {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex items-center gap-1 text-slate-500 disabled:opacity-40"
            >
              Siguiente <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <IncapacidadFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        patientId={patient.id}
        doctorId={editingEntry ? editingEntry.doctorId : user?.id}
        editEntry={editingEntry}
        onSaved={onSaved}
      />
    </div>
  );
}
