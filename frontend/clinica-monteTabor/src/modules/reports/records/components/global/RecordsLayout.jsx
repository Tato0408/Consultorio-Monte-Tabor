"use client";

import { useState } from "react";
import { ChevronRight, Pencil } from "lucide-react";
import { Badge } from "./ui";
import EditPatientModal from "./EditPatientModal";

// Contiene lo que se mantiene fijo al navegar entre pestañas: breadcrumb,
// tabs (navegadas por índice) y la barra del paciente.
// Recibe tabs como una lista de objetos con label y content, donde content
// es lo que se renderiza debajo. activeTab y onTabChange son opcionales,
// para controlar el índice activo desde afuera. onBack es opcional: si se
// pasa, el breadcrumb Expedientes vuelve al listado. onPatientUpdated
// refresca el registro después de editar los datos del paciente con el
// botón de lápiz.
export default function ExpedienteLayout({ patient = {}, tabs = [], activeTab, onTabChange, onBack, onPatientUpdated, children }) {
  const [internalTab, setInternalTab] = useState(0);
  const current = activeTab ?? internalTab;
  const setTab = onTabChange ?? setInternalTab;

  const fullName = `${patient.nombre ?? ""} ${patient.apellido ?? ""}`.trim();

  return (
    <div className="min-h-screen bg-white px-10 py-6 text-slate-800">
      {/* Breadcrumb */}
      <nav className="mb-5 flex items-center gap-2 text-sm">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="text-slate-400 hover:text-slate-600 hover:underline"
          >
            Expedientes
          </button>
        ) : (
          <span className="text-slate-400">Expedientes</span>
        )}
        <ChevronRight className="h-4 w-4 text-slate-300" />
        <span className="font-semibold text-slate-800">{fullName || "Paciente"}</span>
      </nav>

      {/* Tabs (navegación por tabIndex) */}
      <div className="mb-6 flex gap-8 border-b border-slate-100">
        {tabs.map((t, i) => (
          <button
            key={t.label}
            type="button"
            onClick={() => setTab(i)}
            className={`relative -mb-px pb-3 text-sm transition-colors ${
              current === i ? "font-medium text-blue-600" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
            {current === i && (
              <span className="absolute inset-x-0 -bottom-px h-0.5 rounded bg-blue-600" />
            )}
          </button>
        ))}
      </div>

      {/* Barra del paciente */}
      <PatientBar patient={patient} onPatientUpdated={onPatientUpdated} />

      {/* Banner opcional (error o loading) para lo que se trae aparte, por ejemplo usePatientRecordDetail */}
      {children && <div className="mt-6">{children}</div>}

      {/* Contenido de la pestaña activa */}
      <div className="mt-8">{tabs[current]?.content}</div>
    </div>
  );
}

function PatientBar({ patient, onPatientUpdated }) {
  const [editOpen, setEditOpen] = useState(false);
  const female = (patient.sexo || patient.sexoCorto || "").toLowerCase().startsWith("f");

  return (
    <div className="flex flex-wrap items-center gap-x-8 gap-y-4 border-b border-slate-100 pb-6">
      {/* Avatar y nombre */}
      <div className="flex items-center gap-3 pr-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-2xl text-blue-500">
          {female ? "♀" : "♂"}
        </div>
        <div className="leading-tight">
          <p className="font-semibold text-slate-800">{patient.nombre ?? "—"}</p>
          <p className="text-sm text-slate-500">{patient.apellido ?? ""}</p>
          <p className="mt-0.5 text-[11px] text-slate-400">DUI: {patient.dui ?? "—"}</p>
        </div>
      </div>

      <Field label="Perfil">
        <p className="text-sm font-medium text-slate-700">
          {patient.edad ?? "—"} • {patient.sexoCorto ?? ""}
        </p>
      </Field>

      <Field label="Contacto">
        <p className="text-xs text-slate-600">{patient.telefono ?? "—"}</p>
        <p className="text-xs text-slate-400">{patient.email ?? ""}</p>
      </Field>

      <Field label="Última visita">
        <p className="text-xs text-slate-600">{patient.ultimaVisita?.fecha ?? "—"}</p>
        <p className="text-xs text-slate-400">{patient.ultimaVisita?.hora ?? ""}</p>
      </Field>

      <Field label="Doctor">
        <div className="flex items-center gap-2">
          <span className="h-6 w-6 rounded-full bg-slate-200" />
          <span className="text-xs text-slate-600">{patient.doctor?.nombre ?? "—"}</span>
        </div>
      </Field>

      {/* Estado y acción */}
      <div className="ml-auto flex items-center gap-3">
        <div className="flex flex-col items-center gap-1">
          {patient.estado && <Badge tone="green">{patient.estado}</Badge>}
          {patient.tipoSangre && <Badge tone="red">{patient.tipoSangre}</Badge>}
        </div>
        <button
          type="button"
          onClick={() => setEditOpen(true)}
          className="rounded-lg border border-slate-200 p-2 text-blue-500 hover:bg-slate-50"
          aria-label="Editar expediente"
        >
          <Pencil className="h-4 w-4" />
        </button>
      </div>

      <EditPatientModal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        patient={patient}
        onSaved={onPatientUpdated}
      />
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="min-w-[90px]">
      <p className="mb-1 text-[11px] text-slate-400">{label}</p>
      {children}
    </div>
  );
}