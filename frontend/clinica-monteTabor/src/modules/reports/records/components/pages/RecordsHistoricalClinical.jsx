"use client";

import { useState } from "react";
import { MoreVertical, CheckCircle2, Plus } from "lucide-react";
import { Badge, SectionCard } from "../global/ui";
import AntecedentFormModal from "../global/AntecedentFormModal";
import VitalSignsFormModal from "../global/VitalSignsFormModal";
import TextFieldModal from "../global/TextFieldModal";

/* Color del badge de TIPO según su categoría */
const TIPO_TONE = {
  crónico: "gray",
  cronico: "gray",
  cardio: "red",
  respiratorio: "green",
  psicológico: "blue",
  psicologico: "blue",
};
const toneFor = (tipo = "") => TIPO_TONE[tipo.toLowerCase()] || "gray";

/* Botón azul "+ Agregar" */
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

/* Tabla de antecedentes (3 columnas + acción) */
function AntecedentesTable({ headers, rows }) {
  const cols = "grid grid-cols-[1.3fr_1.3fr_1fr_36px] gap-2";
  return (
    <div className="text-sm">
      <div className={`${cols} border-b border-slate-100 px-1 pb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400`}>
        <span>{headers[0]}</span>
        <span>{headers[1]}</span>
        <span>{headers[2]}</span>
        <span className="text-right">Acción</span>
      </div>
      {rows.map((r, i) => (
        <div key={i} className={`${cols} items-center border-b border-slate-50 px-1 py-3 last:border-0`}>
          <span className="text-slate-700">{r.a}</span>
          <span className="text-slate-600">{r.b}</span>
          <span>
            <Badge tone={toneFor(r.tipo)}>{r.tipo}</Badge>
          </span>
          {/* Editar/eliminar por fila individual todavía no tiene un destino propio (el PUT
              /patients/:id de hoy solo permite agregar antecedentes, no editar/quitar uno
              puntual) — se deja pendiente a propósito en vez de simular una acción que no
              persistiría nada. */}
          <button type="button" className="flex justify-end text-slate-300 cursor-not-allowed" disabled title="Próximamente">
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>
      ))}
      {rows.length === 0 && (
        <p className="py-4 text-xs text-slate-400">No hay antecedentes registrados de este tipo.</p>
      )}
    </div>
  );
}

/* Tarjeta de un signo vital (variantes: normal, blue, green) */
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

  const [hereditaryModalOpen, setHereditaryModalOpen] = useState(false);
  const [pathologicalModalOpen, setPathologicalModalOpen] = useState(false);
  const [vitalsModalOpen, setVitalsModalOpen] = useState(false);
  const [nonPathologicalModalOpen, setNonPathologicalModalOpen] = useState(false);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Columna izquierda */}
      <div className="space-y-6">
        <SectionCard title="Antecedentes hereditarios" action={<AddButton onClick={() => setHereditaryModalOpen(true)}>Agregar</AddButton>}>
          <AntecedentesTable headers={["Parentesco", "Condición", "Tipo"]} rows={h.hereditarios ?? []} />
        </SectionCard>

        <SectionCard title="Antecedentes patológicos" action={<AddButton onClick={() => setPathologicalModalOpen(true)}>Agregar</AddButton>}>
          <AntecedentesTable headers={["Enfermedad", "Diagnosticado", "Tipo"]} rows={h.patologicos ?? []} />
        </SectionCard>
      </div>

      {/* Columna derecha */}
      <div className="space-y-6">
        <SectionCard
          title="Signos vitales - Última toma"
          action={
            <button
              type="button"
              onClick={() => setVitalsModalOpen(true)}
              className="text-xs font-medium text-blue-600 hover:underline"
            >
              Actualizar
            </button>
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
            <button
              type="button"
              onClick={() => setNonPathologicalModalOpen(true)}
              className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-200"
            >
              Editar
            </button>
          }
        >
          <div className="rounded-xl bg-slate-50 p-5">
            <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">
              {h.noPatologicos ?? "—"}
            </p>
            <p className="mt-4 text-[11px] italic text-slate-300">
              Da clic en “Editar” para modificar este campo libremente
            </p>
          </div>
        </SectionCard>
      </div>

      <AntecedentFormModal
        isOpen={hereditaryModalOpen}
        onClose={() => setHereditaryModalOpen(false)}
        patientId={patient.id}
        title="Nuevo antecedente hereditario"
        bodyKey="new_hereditary"
        fields={[{ key: "relationship", label: "Parentesco" }, { key: "condition", label: "Condición" }]}
        onSaved={onSaved}
      />
      <AntecedentFormModal
        isOpen={pathologicalModalOpen}
        onClose={() => setPathologicalModalOpen(false)}
        patientId={patient.id}
        title="Nuevo antecedente patológico"
        bodyKey="new_pathological"
        fields={[{ key: "disease", label: "Enfermedad" }, { key: "diagnosis", label: "Diagnóstico" }]}
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
