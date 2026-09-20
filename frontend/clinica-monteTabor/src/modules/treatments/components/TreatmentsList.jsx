import { useState, useMemo } from "react";
import { User } from "lucide-react";
import GenericTable from "@/components/ui/GenericTable";
import DataCombobox from "@/components/ui/DataCombobox";
import StatusBadge from "../../reports/components/StatusBadge";
import { treatment_tabs, badge_color_by_tone } from "../data/treatmentsData";

// Lista de planes de tratamiento. Filtra por pestaña de estado y por
// médico, ambos combinados. La pestaña "Requieren control" no es un
// estado: muestra los tratamientos activos cuyo control ya venció (row.alert).
const TreatmentsList = ({ treatments, loading, onSelectTreatment }) => {
  const [tab, setTab] = useState("activo");
  const [doctor_filter, setDoctorFilter] = useState("all");

  const doctor_options = useMemo(
    () => [...new Set(treatments.map((t) => t.doctor).filter(Boolean))].sort(),
    [treatments]
  );

  const filtered = treatments
    .filter((t) => (tab === "requiere_control" ? t.alert : t.status === tab))
    .filter((t) => doctor_filter === "all" || t.doctor === doctor_filter)
    .map((t) => ({ ...t, _id: t.id }));

  const columns = [
    {
      header: "Paciente",
      render: (t) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 text-slate-400" />
          </div>
          <div>
            <p className="font-medium text-slate-900 leading-tight">{t.patient_name}</p>
            <p className="text-xs text-slate-400">{t.patient_age_label}</p>
          </div>
        </div>
      ),
    },
    {
      header: "Diagnóstico / objetivo",
      render: (t) => (
        <div className="max-w-xs">
          <p className="text-slate-700 truncate">{t.diagnosis}</p>
          <p className="text-xs text-slate-400 truncate">{t.objective}</p>
        </div>
      ),
    },
    {
      header: "Médico",
      render: (t) => <span className="text-slate-600">{t.doctor}</span>,
    },
    {
      header: "Inicio",
      render: (t) => <span className="text-slate-500 text-xs">{t.start_date}</span>,
    },
    {
      header: "Progreso",
      render: (t) => (
        <div className="min-w-[120px]">
          <p className="text-xs text-slate-500 mb-1">{t.progress_label}</p>
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-slate-800" style={{ width: `${t.progress_pct}%` }} />
          </div>
        </div>
      ),
    },
    {
      header: "Próximo control",
      render: (t) => (
        <div>
          <p className="text-slate-700 text-xs">{t.next_control}</p>
          {t.next_control_in && (
            <p className={`text-xs ${t.alert ? "text-orange-500" : "text-blue-500"}`}>{t.next_control_in}</p>
          )}
        </div>
      ),
    },
    {
      header: "Estado",
      render: (t) => (
        <div className="flex flex-col items-start gap-1">
          <StatusBadge label={t.badge_label} color={badge_color_by_tone[t.badge_tone] ?? "gray"} />
          {t.alert && (
            <span className="text-[10px] font-semibold text-orange-500">Control vencido</span>
          )}
        </div>
      ),
    },
  ];

  const tabs_row = (
    <div className="flex items-center gap-1 border-b border-slate-100 overflow-x-auto">
      {treatment_tabs.map((entry) => (
        <button
          key={entry.key}
          type="button"
          onClick={() => setTab(entry.key)}
          className={`px-3 py-2 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
            tab === entry.key
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          {entry.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h2 className="text-base font-bold text-slate-800">Planes de tratamiento</h2>
        <DataCombobox
          value={doctor_filter}
          onChange={(v) => setDoctorFilter(v || "all")}
          options={[
            { value: "all", label: "Todos los médicos" },
            ...doctor_options.map((d) => ({ value: d, label: d })),
          ]}
          placeholder="Todos los médicos"
          labelClassName="hidden"
          className="w-full sm:w-56"
          triggerClassName="h-9"
        />
      </div>

      <GenericTable
        placeholderSearch="Buscar paciente o diagnóstico..."
        data={filtered}
        columns={columns}
        loading={loading}
        searchFields={["patient_name", "diagnosis", "objective", "doctor"]}
        onRowClick={(t) => onSelectTreatment(t.id)}
        tabsRow={tabs_row}
      />
    </div>
  );
};

export default TreatmentsList;
