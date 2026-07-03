import GenericTable from "@/components/ui/GenericTable";

const formatUltimaVisita = (date) => {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const RecordsTable = ({ records, loading, onRowClick }) => {
  const columns = [
    { header: "Nombre", render: (row) => <span className="font-medium text-gray-900">{row.nombre}</span> },
    { header: "Apellido", key: "apellido" },
    { header: "DUI", render: (row) => <span className="font-mono text-xs text-gray-500">{row.dui || "—"}</span> },
    { header: "Teléfono", render: (row) => <span className="text-gray-500">{row.telefono || "—"}</span> },
    { header: "Última visita", render: (row) => <span className="text-gray-500">{formatUltimaVisita(row.ultimaVisita)}</span> },
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
    />
  );
};

export default RecordsTable;