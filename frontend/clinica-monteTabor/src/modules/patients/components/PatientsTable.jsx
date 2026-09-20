import GenericTable from "@/components/ui/GenericTable";

// Los botones de editar y eliminar viven en PatientProfileCard.jsx (el panel
// derecho), por lo que esta tabla no necesita un menu de acciones por fila.
const PatientsTable = ({ patients, loading, onAdd, onSelectPatient }) => {
  const columns = [
    { header: "Nombre", align: "center", render: (patient) => <span className="font-medium text-gray-900">{patient.name}</span> },
    { header: "Apellido", key: "last_name", align: "center" },
    { header: "DUI", align: "center", render: (patient) => <span className="font-mono text-xs text-gray-500">{patient.dui || "—"}</span> },
    { header: "Teléfono", align: "center", render: (patient) => <span className="text-gray-500">{patient.phone || "—"}</span> },
    {
      header: "Estado",
      align: "center",
      // is_active === undefined cuenta como activo en el resto del sistema
      // (default:true del schema), no como inactivo.
      render: (patient) => (
        <span className={`inline-flex items-center gap-1.5 font-medium px-2.5 py-1 rounded-full text-xs ${patient.is_active !== false ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${patient.is_active !== false ? "bg-green-500" : "bg-red-500"}`} />
          {patient.is_active !== false ? "Activo" : "Inactivo"}
        </span>
      ),
    },
  ];

  return (
    <GenericTable
      title="Administración de pacientes"
      placeholderSearch="Buscar por nombre, apellido, DUI o correo..."
      data={patients}
      columns={columns}
      loading={loading}
      searchFields={["name", "last_name", "dui", "email"]}
      onAdd={onAdd}
      addLabel="Agregar paciente"
      onRowClick={onSelectPatient}
      evenColumns
    />
  );
};

export default PatientsTable;
