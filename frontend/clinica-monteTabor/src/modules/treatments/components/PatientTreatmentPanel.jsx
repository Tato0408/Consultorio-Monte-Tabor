import { useState } from "react";
import { User, X, CheckCircle2, Circle, RefreshCcw, FileEdit, CalendarPlus, LogOut } from "lucide-react";
import StatusBadge from "../../reports/components/StatusBadge";
import { STATUS_STYLE } from "../data/treatmentsData";

const TABS = ["Resumen", "Evolución", "Notas", "Documentos"];

const InfoRow = ({ label, value }) => (
  <div className="flex items-center justify-between gap-3 py-1.5">
    <span className="text-xs text-slate-400">{label}</span>
    <span className="text-xs font-semibold text-slate-800 text-right">{value}</span>
  </div>
);

const PatientTreatmentPanel = ({ patient, onClose }) => {
  const [tab, setTab] = useState("Resumen");

  if (!patient) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center text-sm text-slate-400 h-[400px] flex items-center justify-center">
        Selecciona un paciente de la lista para ver su seguimiento.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-5 pb-4 border-b border-slate-50">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
              <User className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 leading-tight">{patient.name}</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                ID: {patient.id} · {patient.age} años · {patient.gender}
              </p>
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} className="p-1 rounded-lg text-slate-300 hover:text-slate-500 hover:bg-slate-50">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <StatusBadge label={patient.status} color={STATUS_STYLE[patient.status] ?? "gray"} />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-5 border-b border-slate-100 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-2.5 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
              tab === t ? "border-blue-600 text-blue-600" : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="p-5 flex flex-col gap-5 overflow-y-auto">
        {tab !== "Resumen" ? (
          <p className="text-sm text-slate-400 text-center py-10">Sin información registrada todavía.</p>
        ) : (
          <>
            {/* Información clínica */}
            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-1">Información clínica</h4>
              <div className="divide-y divide-slate-50">
                <InfoRow label="Diagnóstico" value={patient.clinicalInfo.diagnostico} />
                <InfoRow label="Médico responsable" value={patient.clinicalInfo.medicoResponsable} />
                <InfoRow label="Fecha de inicio" value={patient.clinicalInfo.fechaInicio} />
                <InfoRow label="Fecha estimada de alta" value={patient.clinicalInfo.fechaEstimadaAlta} />
              </div>
            </div>

            {/* Tratamiento actual */}
            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-2">Tratamiento actual</h4>
              <div className="flex flex-col gap-2.5">
                {patient.treatmentItems.map((item, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-slate-800 leading-tight">{item.name}</p>
                      <p className="text-xs text-slate-400 leading-tight mt-0.5">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Seguimiento del tratamiento */}
            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-2">Seguimiento del tratamiento</h4>
              <div className="flex flex-col gap-3">
                {patient.followUpSteps.map((step, i) => {
                  const done = step.status === "Completado";
                  return (
                    <div key={i} className="flex items-start gap-2.5">
                      {done
                        ? <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        : <Circle className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-slate-800 leading-tight">{step.label}</p>
                          <StatusBadge label={step.status} color={done ? "green" : "blue"} />
                        </div>
                        <p className="text-xs text-slate-400 leading-tight mt-0.5">{step.detail}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Última observación */}
            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-2">Última observación</h4>
              <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3">
                <p className="text-xs text-slate-600 leading-relaxed">{patient.lastObservation.text}</p>
                <p className="text-[11px] text-slate-400 mt-2">
                  {patient.lastObservation.date} · {patient.lastObservation.author}
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Acciones */}
      <div className="grid grid-cols-2 gap-2.5 p-5 pt-0">
        <button className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border border-blue-200 text-blue-600 text-xs font-semibold hover:bg-blue-50 transition-colors">
          <RefreshCcw className="w-3.5 h-3.5" />
          Actualizar evolución
        </button>
        <button className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border border-blue-200 text-blue-600 text-xs font-semibold hover:bg-blue-50 transition-colors">
          <FileEdit className="w-3.5 h-3.5" />
          Agregar nota
        </button>
        <button className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-colors">
          <CalendarPlus className="w-3.5 h-3.5" />
          Programar control
        </button>
        <button className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-50 transition-colors">
          <LogOut className="w-3.5 h-3.5" />
          Dar de alta
        </button>
      </div>
    </div>
  );
};

export default PatientTreatmentPanel;
