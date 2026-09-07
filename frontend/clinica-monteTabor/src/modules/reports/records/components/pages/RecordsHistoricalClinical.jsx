"use client";

import { useState } from "react";
import { Pencil, Trash2, CheckCircle2, Plus } from "lucide-react";
import { Badge, SectionCard } from "../global/ui";
import AntecedentFormModal from "../global/AntecedentFormModal";
import VitalSignsFormModal from "../global/VitalSignsFormModal";
import TextFieldModal from "../global/TextFieldModal";
import apiClient from "@/lib/apiClient";
import { showSuccess, showError, confirmDelete } from "@/lib/alerts";
import { useAuth } from "@/context/AuthContext";

// Color del badge de tipo según su categoría.
const TIPO_TONE = {
  crónico: "gray",
  cronico: "gray",
  cardio: "red",
  respiratorio: "green",
  psicológico: "blue",
  psicologico: "blue",
};
const toneFor = (tipo = "") => TIPO_TONE[tipo.toLowerCase()] || "gray";

// Botón azul de agregar.
function AddButton({ children, ...props }) {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
      {...props}
    >
      <Plus className="h-3.5 w-3.5" />
      {children}
    </button>
  );
}

// Tabla de antecedentes: tres columnas más una de acción. Las cuatro columnas quedan
// con el mismo ancho (grid-cols-4) y todo va centrado, con la misma franja gris de
// encabezado (bg-slate-50, mayúsculas) que las tablas de los reportes. Los botones de
// editar y eliminar solo se muestran si el rol tiene esos permisos en el expediente.
function AntecedentesTable({ headers, rows, onEdit, onDelete, canUpdate, canDelete }) {
  const cols = "grid grid-cols-4 gap-2";
  const showAction = canUpdate || canDelete;
  return (
    <div className="text-sm">
      <div className={`${cols} rounded-lg bg-slate-50 px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400`}>
        <span>{headers[0]}</span>
        <span>{headers[1]}</span>
        <span>{headers[2]}</span>
        <span>{showAction ? "Acción" : ""}</span>
      </div>
      {rows.map((r) => (
        <div key={r.id} className={`${cols} items-center border-b border-slate-50 px-2 py-3 text-center last:border-0`}>
          <span className="text-slate-700 break-words">{r.a}</span>
          <span className="text-slate-600 break-words">{r.b}</span>
          <span className="flex justify-center">
            <Badge tone={toneFor(r.tipo)} className="whitespace-normal break-words text-center">{r.tipo}</Badge>
          </span>
          <div className="flex items-center justify-center gap-1">
            {canUpdate && (
              <button
                type="button"
                onClick={() => onEdit(r)}
                title="Editar"
                className="p-1.5 rounded-lg text-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={() => onDelete(r)}
                title="Eliminar"
                className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      ))}
      {rows.length === 0 && (
        <p className="py-4 text-xs text-slate-400">No hay antecedentes registrados de este tipo.</p>
      )}
    </div>
  );
}

// Tarjeta de un signo vital, con variantes normal, blue y green.
function VitalMini({ label, value, unit, variant }) {
  if (variant === "green") {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl bg-emerald-400 p-4 text-center text-white">
        <p className="text-[9px] font-semibold uppercase tracking-wide opacity-90">{label}</p>
        <p className="mt-1 text-lg font-bold">{value ?? "—"}</p>
        <CheckCircle2 className="mt-1 h-4 w-4" />
      </div>
    );
  }
  const tint = variant === "blue" ? "border-blue-200 bg-blue-50/40" : "border-slate-100 bg-white";
  return (
    <div className={`flex flex-col items-center justify-center rounded-xl border ${tint} p-4 text-center`}>
      <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-bold text-slate-800">{value ?? "—"}</p>
      {unit && <p className="text-[10px] text-slate-400">{unit}</p>}
    </div>
  );
}

export default function HistoriaClinicaTab({ patient = {}, onSaved }) {
  const h = patient.historiaClinica ?? {};
  const v = patient.signosVitales ?? {};

  // Las acciones de agregar, editar y eliminar del expediente dependen del
  // modulo "Expediente" (reports.records) en Roles y Permisos, no del de
  // gestion de pacientes.
  const { hasPermission } = useAuth();
  const canCreate = hasPermission("reports.records", "create");
  const canUpdate = hasPermission("reports.records", "update");
  const canDelete = hasPermission("reports.records", "delete");

  const [hereditaryModalOpen, setHereditaryModalOpen] = useState(false);
  const [pathologicalModalOpen, setPathologicalModalOpen] = useState(false);
  const [vitalsModalOpen, setVitalsModalOpen] = useState(false);
  const [nonPathologicalModalOpen, setNonPathologicalModalOpen] = useState(false);
  // Cuando hereditaryEditEntry o pathologicalEditEntry es null, el modal
  // de agregar o editar está en modo agregar. Con una fila, edita ese
  // antecedente puntual.
  const [hereditaryEditEntry, setHereditaryEditEntry] = useState(null);
  const [pathologicalEditEntry, setPathologicalEditEntry] = useState(null);

  const openAddHereditary = () => {
    setHereditaryEditEntry(null);
    setHereditaryModalOpen(true);
  };
  const openEditHereditary = (row) => {
    setHereditaryEditEntry(row);
    setHereditaryModalOpen(true);
  };
  const openAddPathological = () => {
    setPathologicalEditEntry(null);
    setPathologicalModalOpen(true);
  };
  const openEditPathological = (row) => {
    setPathologicalEditEntry(row);
    setPathologicalModalOpen(true);
  };

  const handleDeleteHereditary = async (row) => {
    const confirmed = await confirmDelete({
      title: "¿Eliminar este antecedente hereditario?",
      text: `Se borrará "${row.b}" (${row.a}). Esta acción no se puede deshacer.`,
    });
    if (!confirmed) return;
    try {
      await apiClient(`/patients/${patient.id}/hereditary/${row.id}`, { method: "DELETE" });
      showSuccess("Antecedente eliminado correctamente");
      onSaved?.();
    } catch (err) {
      showError(err.message || "No se pudo eliminar el antecedente");
    }
  };

  const handleDeletePathological = async (row) => {
    const confirmed = await confirmDelete({
      title: "¿Eliminar este antecedente patológico?",
      text: `Se borrará "${row.a}". Esta acción no se puede deshacer.`,
    });
    if (!confirmed) return;
    try {
      await apiClient(`/patients/${patient.id}/pathological/${row.id}`, { method: "DELETE" });
      showSuccess("Antecedente eliminado correctamente");
      onSaved?.();
    } catch (err) {
      showError(err.message || "No se pudo eliminar el antecedente");
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Columna izquierda */}
      <div className="space-y-6">
        <SectionCard
          title="Antecedentes hereditarios"
          action={canCreate ? <AddButton onClick={openAddHereditary}>Agregar</AddButton> : null}
        >
          <AntecedentesTable
            headers={["Parentesco", "Condición", "Tipo"]}
            rows={h.hereditarios ?? []}
            onEdit={openEditHereditary}
            onDelete={handleDeleteHereditary}
            canUpdate={canUpdate}
            canDelete={canDelete}
          />
        </SectionCard>

        <SectionCard
          title="Antecedentes patológicos"
          action={canCreate ? <AddButton onClick={openAddPathological}>Agregar</AddButton> : null}
        >
          <AntecedentesTable
            headers={["Enfermedad", "Diagnosticado", "Tipo"]}
            rows={h.patologicos ?? []}
            onEdit={openEditPathological}
            onDelete={handleDeletePathological}
            canUpdate={canUpdate}
            canDelete={canDelete}
          />
        </SectionCard>
      </div>

      {/* Columna derecha */}
      <div className="space-y-6">
        <SectionCard
          title="Signos vitales - Última toma"
          action={
            canCreate ? (
              <button
                type="button"
                onClick={() => setVitalsModalOpen(true)}
                className="text-xs font-medium text-blue-600 hover:underline"
              >
                Actualizar
              </button>
            ) : null
          }
        >
          <div className="grid grid-cols-2 gap-3">
            <VitalMini label="Presión arterial" value={v.presionArterial} unit="mmHg" />
            <VitalMini label="Glucosa" value={v.glucosa} unit="mg/dL" />
            <VitalMini label="Peso" value={v.peso} unit="kg" />
            <VitalMini label="Altura" value={v.altura} unit="m" />
            <VitalMini label="IMC" value={v.imc} unit={v.imcCategoria?.toLowerCase()} variant="blue" />
            <VitalMini label="Estado general" value={v.estadoGeneral} variant="green" />
          </div>
        </SectionCard>

        <SectionCard
          title="Antecedentes no patológicos"
          action={
            canUpdate ? (
              <button
                type="button"
                onClick={() => setNonPathologicalModalOpen(true)}
                className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-200"
              >
                Editar
              </button>
            ) : null
          }
        >
          <div className="rounded-xl bg-slate-50 p-5">
            <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">
              {h.noPatologicos ?? "—"}
            </p>
            {canUpdate && (
              <p className="mt-4 text-[11px] italic text-slate-300">
                Da clic en “Editar” para modificar este campo libremente
              </p>
            )}
          </div>
        </SectionCard>
      </div>

      <AntecedentFormModal
        isOpen={hereditaryModalOpen}
        onClose={() => setHereditaryModalOpen(false)}
        patientId={patient.id}
        title="Nuevo antecedente hereditario"
        editTitle="Editar antecedente hereditario"
        bodyKey="new_hereditary"
        fields={[
          { key: "relationship", label: "Parentesco", placeholder: "Ej. Padre/Madre" },
          { key: "condition", label: "Condición", placeholder: "Ej. Diabetes" },
          { key: "type", label: "Tipo", placeholder: "Ej. Crónico" },
        ]}
        editEntry={hereditaryEditEntry}
        onSaved={onSaved}
      />
      <AntecedentFormModal
        isOpen={pathologicalModalOpen}
        onClose={() => setPathologicalModalOpen(false)}
        patientId={patient.id}
        title="Nuevo antecedente patológico"
        editTitle="Editar antecedente patológico"
        bodyKey="new_pathological"
        fields={[
          { key: "disease", label: "Enfermedad", placeholder: "Ej. Hipertensión" },
          { key: "diagnosis", label: "Diagnóstico", placeholder: "Ej. Confirmado" },
          { key: "type", label: "Tipo", placeholder: "Ej. Crónico" },
        ]}
        editEntry={pathologicalEditEntry}
        onSaved={onSaved}
      />
      <VitalSignsFormModal
        isOpen={vitalsModalOpen}
        onClose={() => setVitalsModalOpen(false)}
        patientId={patient.id}
        onSaved={onSaved}
      />
      <TextFieldModal
        isOpen={nonPathologicalModalOpen}
        onClose={() => setNonPathologicalModalOpen(false)}
        patientId={patient.id}
        title="Antecedentes no patológicos"
        bodyKey="non_pathological"
        currentValue={h.noPatologicos === "Sin antecedentes no patológicos registrados." ? "" : h.noPatologicos}
        onSaved={onSaved}
      />
    </div>
  );
}
