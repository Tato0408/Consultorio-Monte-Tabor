import { useState } from "react";
import { Filter, User } from "lucide-react";
import GenericTable from "@/components/ui/GenericTable";
import StatusBadge from "../../reports/components/StatusBadge";
import { STATUS_STYLE } from "../data/treatmentsData";

const TABS = [
  { key: "all",        label: "Todos" },
  { key: "En tratamiento",    label: "Activos" },
  { key: "Requiere revisión", label: "Requiere revisión" },
  { key: "Suspendido",       label: "Suspendidos" },
  { key: "Finalizado",      label: "Finalizados" },
];

const TreatmentsPatientsTable = ({ patients, loading, onSelectPatient, selectedPatientId }) => {
  const [tab, setTab] = useState("all");

  const filtered = tab === "all" ? patients : patients.filter((p) => p.status === tab);

  const columns = [
    {
      header: "Paciente",
      render: (p) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 text-slate-400" />
          </div>
          <div>
            <p className="font-medium text-slate-900 leading-tight">{p.name}</p>
            <p className="text-xs text-slate-400 mt-0.5">ID: {p.id}</p>
          </div>
        </div>
      ),
    },
    {
      header: "Diagnóstico",
      render: (p) => (
        <div>
          <p className="text-slate-700">{p.diagnosis}</p>
          {p.diagnosisDetail && <p className="text-xs text-slate-400">{p.diagnosisDetail}</p>}
        </div>
      ),
    },
    {
      header: "Tratamiento actual",
      render: (p) => (
        <div>
          <p className="text-slate-700">{p.currentTreatment}</p>
          {p.currentTreatmentDetail && <p className="text-xs text-slate-400">{p.currentTreatmentDetail}</p>}
        </div>
      ),
    },
    {
      header: "Médico",
      render: (p) => <span className="text-slate-600">{p.doctor}</span>,
    },
    {
      header: "Inicio",
      render: (p) => <span className="text-slate-500 text-xs">{p.startDate}</span>,
    },
    {
      header: "Próximo control",
      render: (p) => (
        <div>
          <p className="text-slate-700 text-xs">{p.nextControl}</p>
          {p.nextControlIn && <p className="text-xs text-blue-500">{p.nextControlIn}</p>}
        </div>
      ),
    },
    {
      header: "Estado",
      render: (p) => <StatusBadge label={p.status} color={STATUS_STYLE[p.status] ?? "gray"} />,
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h2 className="text-base font-bold text-slate-800">Pacientes en seguimiento</h2>
        <button className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50">
          <Filter className="w-3.5 h-3.5" />
          Filtros
        </button>
      </div>

      <div className="flex items-center gap-1 mb-4 border-b border-slate-100 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`px-3 py-2 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
              tab === t.key
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <GenericTable
        placeholderSearch="Buscar en la lista..."
        data={filtered}
        columns={columns}
        loading={loading}
        searchFields={["name", "diagnosis", "currentTreatment", "doctor"]}
        onRowClick={onSelectPatient}
      />
    </div>
  );
};

export default TreatmentsPatientsTable;
