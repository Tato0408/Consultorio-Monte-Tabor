import GenericTable from "@/components/ui/GenericTable";

// Las acciones de editar/eliminar ya no viven aquí — se movieron a botones dentro de
// NurseProfileCard.jsx (el panel de la derecha), para no necesitar un menú por fila.
const NurseTable = ({ nurses, loading, onSelect, onAdd }) => {
  // Definición de Columnas de la Tabla de Enfermeras
  const columns = [
    {
      header: "Nombre",
      align: "center",
      render: (nurse) => <span className="font-medium text-gray-900">{nurse.name}</span>,
    },
    { header: "Apellido", key: "last_name", align: "center" },
    {
      header: "DUI",
      align: "center",
      render: (nurse) => <span className="font-mono text-xs text-gray-500">{nurse.dui || "—"}</span>,
    },
    {
      header: "Teléfono",
      align: "center",
      render: (nurse) => <span className="text-gray-500">{nurse.phone || "—"}</span>,
    },
    {
      header: "Estado",
      align: "center",
      render: (nurse) => (
        <span
          className={`inline-flex items-center gap-1.5 font-medium px-2.5 py-1 rounded-full text-xs ${
            nurse.is_active ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${nurse.is_active ? "bg-green-500" : "bg-red-500"}`} />
          {nurse.is_active ? "Activo" : "Inactivo"}
        </span>
      ),
    },
  ];

  // Consumimos el componente base pasándole una fila clickeable personalizada si se requiere
  return (
    <GenericTable
      title="Administración de enfermeras"
      placeholderSearch="Buscar enfermera o DUI..."
      data={nurses}
      columns={columns}
      loading={loading}
      searchFields={["name", "last_name", "dui"]} // Campos para la búsqueda combinada full-name/dui
      onAdd={onAdd}
      addLabel="Añadir Enfermera"
      onRowClick={onSelect}
      evenColumns
    />
  );
};

export default NurseTable;
