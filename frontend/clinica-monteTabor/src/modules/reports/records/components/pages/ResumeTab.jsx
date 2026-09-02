"use client";

import { Fragment, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, Download, Info, FlaskConical, Plus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { showWarning, showError } from "@/lib/alerts";
import { Badge, SectionCard, VerTodos, initials } from "../global/ui";
import IncapacidadFormModal from "../global/IncapacidadFormModal";
import LabOrderDocument from "@/modules/schedule/consultations/pdf/LabOrderDocument";
import { downloadPdf } from "@/modules/schedule/consultations/pdf/downloadPdf";
import { calculateAge } from "@/lib/validators";

// Arma y descarga el PDF de una orden de laboratorio guardada (misma plantilla
// que usa la pantalla de consulta). Los datos del paciente y del médico vienen
// poblados desde GET /lab-orders.
const descargarOrdenLaboratorio = async (labOrder) => {
  const p = labOrder.patient_id || {};
  const appt = labOrder.consultation_id?.appointment_id || {};
  const provider = appt.doctor_id || appt.nurse_id || null;
  const patientName = `${p.name || ""} ${p.last_name || ""}`.trim() || "Paciente";
  const doctorName = provider ? `${provider.name || ""} ${provider.last_name || ""}`.trim() : "";
  const dateSource = labOrder.consultation_id?.date || labOrder.issued_at || labOrder.createdAt;
  const dateFormatted = dateSource
    ? new Date(dateSource).toLocaleDateString("es-SV", { day: "2-digit", month: "2-digit", year: "numeric" })
    : "";
  const fileSafe = dateFormatted.replace(/\//g, "-");

  await downloadPdf(
    <LabOrderDocument
      title={`Orden de laboratorio de ${patientName} ${fileSafe}`}
      patientName={patientName}
      age={calculateAge(p.birth_date)}
      gender={p.gender}
      dui={p.dui}
      doctorName={doctorName}
      date={dateFormatted}
      weight={labOrder.weight}
      height={labOrder.height}
      pregnancy={labOrder.pregnancy}
      antibioticTreatment={labOrder.antibiotic_treatment}
      tests={labOrder.tests || []}
      otherTests={labOrder.other_tests}
    />,
    `Orden de laboratorio - ${patientName} ${fileSafe}`
  );
};

// Botón azul de agregar, mismo estilo que el resto del expediente.
function AddButton({ children = "Agregar", ...props }) {
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

// Tarjeta de un signo vital individual.
function VitalCard({ label, value, unit, badge }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <p className="text-[11px] text-slate-400">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-slate-800">{value ?? "—"}</p>
      {unit && <p className="mt-0.5 text-[11px] text-slate-400">{unit}</p>}
      {badge && (
        <div className="mt-1">
          <Badge tone="green">{badge}</Badge>
        </div>
      )}
    </div>
  );
}

export default function ResumenTab({ patient = {}, onSaved, onNavigateTab }) {
  const v = patient.signosVitales ?? {};
  const navigate = useNavigate();
  const { hasPermission, user } = useAuth();
  const canAttend = hasPermission("calendar.consultations", "create");
  const canCreateSickLeave = hasPermission("reports.records", "create");
  const [incapacidadModalOpen, setIncapacidadModalOpen] = useState(false);

  // Recetas, referencias y laboratorios solo existen ligados a una
  // consulta. El botón Agregar lleva al formulario real de consulta de la
  // próxima cita del paciente, en vez de duplicar ese concepto como un
  // recurso suelto.
  const handleAgregarClinico = () => {
    if (!patient.nextPendingAppointmentId) {
      showWarning("Agenda una cita para este paciente para registrar recetas, laboratorios o referencias.");
      return;
    }
    navigate(`/calendar/consultations/${patient.nextPendingAppointmentId}`);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <VitalCard label="Presión arterial" value={v.presionArterial} unit="mmHg" />
        <VitalCard label="Glucosa" value={v.glucosa} unit="mg/dL" />
        <VitalCard label="Peso / altura" value={v.peso} unit={v.altura} />
        <VitalCard label="IMC" value={v.imc} badge={v.imcCategoria} />
        <div className="col-span-2 flex flex-col items-center justify-center rounded-2xl bg-blue-600 p-4 text-center text-white shadow-sm sm:col-span-1">
          <Clock className="h-5 w-5 opacity-90" />
          <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide opacity-80">
            Último registro de signos vitales
          </p>
          <p className="mt-1 text-sm font-medium">{v.ultimoRegistro ?? "—"}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard title="Procedimientos recientes" action={<VerTodos onClick={() => onNavigateTab?.("Procedimientos")} />}>
          <div className="overflow-x-auto">
            <div className="grid grid-cols-[minmax(120px,1fr)_auto_auto] items-center gap-x-6 gap-y-4 text-sm min-w-[420px]">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Procedimiento</span>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Fecha</span>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Doctor asignado</span>
              {(patient.procedimientos ?? []).map((p, i) => (
                <Fragment key={i}>
                  <span className="text-slate-700">{p.nombre}</span>
                  <span className="text-slate-500">{p.fecha}</span>
                  <span className="flex items-center gap-2 text-slate-600">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[9px] font-semibold text-slate-500">
                      {initials(p.doctor)}
                    </span>
                    {p.doctor}
                  </span>
                </Fragment>
              ))}
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Antecedentes hereditarios" action={<VerTodos onClick={() => onNavigateTab?.("Historia clínica")} />}>
          <div className="space-y-3">
            {(patient.antecedentes ?? []).map((a, i) => (
              <div key={i} className="rounded-xl border-l-4 border-emerald-500 bg-slate-50 p-4">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    Parentesco: {a.parentesco}
                  </span>
                  <Badge tone="gray">{a.tipo}</Badge>
                </div>
                <p className="text-base font-semibold text-slate-800">{a.nombre}</p>
                <p className="mt-2 flex items-start gap-1.5 text-xs text-slate-500">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {a.nota}
                </p>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <SectionCard
          title="Recetas"
          action={
            <div className="flex items-center gap-2">
              {canAttend && <AddButton onClick={handleAgregarClinico} />}
              <VerTodos onClick={() => onNavigateTab?.("Consultas")}>Ver todas</VerTodos>
            </div>
          }
        >
          <div className="space-y-3">
            {(patient.recetas ?? []).map((r, i) => (
              <div key={i} className="flex items-start justify-between gap-3 rounded-xl bg-slate-50 p-4">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{r.nombre}</p>
                  <p className="text-[11px] text-slate-400">{r.fecha}</p>
                </div>
                <span className="max-w-[90px] text-right text-[9px] font-semibold uppercase leading-tight tracking-wide text-slate-400">
                  {r.doctor}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Incapacidades"
          action={
            <div className="flex items-center gap-2">
              {canCreateSickLeave && <AddButton onClick={() => setIncapacidadModalOpen(true)} />}
              <VerTodos onClick={() => onNavigateTab?.("Incapacidades")}>Ver todas</VerTodos>
            </div>
          }
        >
          <div className="space-y-3">
            {(patient.incapacidades ?? []).map((it, i) => (
              <div key={i} className="flex items-start justify-between gap-2 rounded-xl bg-slate-50 p-4">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{it.nombre}</p>
                  <p className="text-[11px] text-slate-400">{it.fecha}</p>
                </div>
                <Badge tone="gray">{it.estado}</Badge>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Referencias"
          action={
            <div className="flex items-center gap-2">
              {canAttend && <AddButton onClick={handleAgregarClinico} />}
              <VerTodos onClick={() => onNavigateTab?.("Consultas")}>Ver todas</VerTodos>
            </div>
          }
        >
          <div className="space-y-3">
            {(patient.referencias ?? []).map((rf, i) => (
              <div key={i} className="flex items-start justify-between gap-2 rounded-xl bg-slate-50 p-4">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{rf.nombre}</p>
                  <p className="text-[11px] text-slate-400">{rf.fecha}</p>
                </div>
                <Badge tone="blue">{rf.estado}</Badge>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Resultados de laboratorio y exámenes"
        action={
          <div className="flex items-center gap-2">
            {canAttend && <AddButton onClick={handleAgregarClinico} />}
            <VerTodos onClick={() => onNavigateTab?.("Consultas")} />
          </div>
        }
      >
        <div className="space-y-3">
          {(patient.laboratorios ?? []).length === 0 && (
            <p className="text-sm text-slate-400">Sin órdenes de laboratorio registradas.</p>
          )}
          {(patient.laboratorios ?? []).map((l, i) => (
            <div key={l.id || i} className="flex items-center gap-4 rounded-xl bg-slate-50 px-4 py-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-slate-400 shadow-sm">
                <FlaskConical className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-800">{l.nombre}</p>
                <p className="text-[11px] text-slate-400">{l.fecha}</p>
              </div>
              <Badge tone="blue">{l.estado}</Badge>
              {l.labOrder && (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await descargarOrdenLaboratorio(l.labOrder);
                    } catch (err) {
                      showError(err?.message || "No se pudo generar la orden de laboratorio.");
                    }
                  }}
                  title="Descargar orden de laboratorio"
                  className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800"
                >
                  <Download className="h-4 w-4" /> Descargar
                </button>
              )}
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard title="Notas de evolución" action={<VerTodos onClick={() => onNavigateTab?.("Consultas")}>Ver más</VerTodos>}>
          <div className="rounded-xl border-l-4 border-blue-500 bg-slate-50 p-4">
            <p className="text-sm leading-relaxed text-slate-600">
              {patient.notasEvolucion?.texto ?? "—"}
            </p>
            {patient.notasEvolucion?.actualizado && (
              <p className="mt-3 text-[11px] text-slate-400">
                Actualizado: {patient.notasEvolucion.actualizado}
              </p>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Impresión diagnóstica">
          <div className="flex items-center gap-4 rounded-xl bg-slate-50 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-[11px] font-bold text-blue-600">
              {patient.impresionDiagnostica?.codigo ?? "CIE"}
            </div>
            <div>
              <p className="text-sm font-medium text-slate-800">
                {patient.impresionDiagnostica?.descripcion ?? "—"}
              </p>
              <p className="text-[11px] text-slate-400">
                {patient.impresionDiagnostica?.tipo ?? ""}
              </p>
            </div>
          </div>
        </SectionCard>
      </div>

      <IncapacidadFormModal
        isOpen={incapacidadModalOpen}
        onClose={() => setIncapacidadModalOpen(false)}
        patientId={patient.id}
        doctorId={user?.id}
        onSaved={onSaved}
      />
    </div>
  );
}