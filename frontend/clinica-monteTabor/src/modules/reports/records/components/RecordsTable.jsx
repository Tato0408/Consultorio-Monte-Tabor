import { ChevronRight } from "lucide-react";
import GenericTable from "@/components/ui/GenericTable";
import PatientAvatar from "@/components/ui/PatientAvatar";

const formatUltimaVisita = (date) => {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

// Días transcurridos desde la última visita, para el punto de color.
const daysSince = (date) => {
  if (!date) return null;
  return Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
};

// Verde: visita del último mes. Ámbar: hasta 3 meses. Rojo: más de 3 meses
// o sin ninguna visita registrada.
const recencyDot = (dias) => {
  if (dias == null) return "bg-slate-300";
  if (dias <= 30) return "bg-emerald-500";
  if (dias <= 90) return "bg-amber-500";
  return "bg-rose-500";
};

const RecordsTable = ({ records, loading, onRowClick }) => {
  const columns = [
    {
      header: "Paciente",
      render: (row) => (
        <div className="flex items-center gap-3">
          <PatientAvatar name={row.nombre} lastName={row.apellido} gender={row.genero} active={row.activo} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">
              {`${row.nombre ?? ""} ${row.apellido ?? ""}`.trim() || "—"}
            </p>
            <p className="text-[11px] text-slate-400">
              {row.sexoCorto && row.sexoCorto !== "—" ? row.sexoCorto : "Sin sexo"}
              {row.edad != null ? ` · ${row.edad} años` : ""}
            </p>
          </div>
        </div>
      ),
    },
    {
      header: "DUI",
      render: (row) => <span className="font-mono text-xs text-slate-500">{row.dui || "—"}</span>,
    },
    {
      header: "Teléfono",
      render: (row) => <span className="text-sm text-slate-500">{row.telefono || "—"}</span>,
    },
    {
      header: "Última visita",
      render: (row) => {
        const dias = daysSince(row.ultimaVisita);
        return (
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 flex-shrink-0 rounded-full ${recencyDot(dias)}`} />
            <span className="text-sm text-slate-600">{formatUltimaVisita(row.ultimaVisita)}</span>
          </div>
        );
      },
    },
    {
      header: "Estado",
      render: (row) =>
        row.activo ? (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Activo
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">
            <span className="h-1.5 w-1.5 rounded-full border border-slate-300" />
            Inactivo
          </span>
        ),
    },
    {
      header: "",
      align: "right",
      render: () => <ChevronRight className="inline-block h-4 w-4 text-slate-300" />,
    },
  ];

  return (
    <GenericTable
      title="Expedientes de pacientes"
      placeholderSearch="Buscar por nombre, apellido o DUI..."
      data={records}
      columns={columns}
      loading={loading}
      searchFields={["nombre", "apellido", "dui"]}
      onRowClick={onRowClick}
      // Encabezado con la franja gris azulada de las tablas de los reportes.
      stripedHeader
      // Arranca mostrando 10 expedientes por página.
      defaultPageSize={10}
    />
  );
};

export default RecordsTable;
