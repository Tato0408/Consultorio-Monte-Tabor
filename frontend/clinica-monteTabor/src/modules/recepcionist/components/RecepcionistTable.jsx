import GenericTable from "@/components/ui/GenericTable";

// Las acciones de editar/eliminar ya no viven aquí — se movieron a botones dentro de
// ReceptionistProfileCard.jsx (el panel de la derecha), para no necesitar un menú por fila.
const ReceptionistsTable = ({
  receptionists,
  loading,
  error,
  onSelect,
  onOpenForm,
}) => {
  //Si ocurre un error lo mostramos
  if (error) {
    return <p className="mt-5 text-red-500 text-sm text-center">Error: {error}</p>;
  }

  //Definimos las columnas que tendra la tabla
  const columns = [
    {
      header: "Nombre",
      align: "center",
      render: (receptionist) => <span className="font-medium text-gray-900">{receptionist.name}</span>,
    },
    {
      header: "Apellido",
      key: "last_name",
      align: "center",
    },
    {
      header: "DUI",
      align: "center",
      render: (receptionist) => <span className="font-mono text-xs text-gray-500">{receptionist.dui || "—"}</span>,
    },
    {
      header: "Teléfono",
      align: "center",
      render: (receptionist) => <span className="text-gray-500">{receptionist.phone || "—"}</span>,
    },
    {
      //Mostramos si el recepcionista esta activo o inactivo
      header: "Estado",
      align: "center",
      render: (receptionist) => (
        <span
          className={`inline-flex items-center gap-1.5 font-medium px-2.5 py-1 rounded-full text-xs ${
            receptionist.is_active ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${receptionist.is_active ? "bg-green-500" : "bg-red-500"}`} />
          {receptionist.is_active ? "Activo" : "Inactivo"}
        </span>
      ),
    },
  ];

  //Renderizamos la tabla generica enviandole toda la configuracion
  return (
    <GenericTable
      title="Administración de recepcionistas"
      placeholderSearch="Encuentra por nombre, apellido, DUI o email..."
      data={receptionists}
      columns={columns}
      loading={loading}
      searchFields={["name", "last_name", "dui", "email"]}
      onAdd={onOpenForm}
      addLabel="Agregar recepcionista"
      onRowClick={onSelect}
      evenColumns
    />
  );
};

export default ReceptionistsTable;
