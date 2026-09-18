import GenericTable from "@/components/ui/GenericTable";

// Los botones de editar y eliminar viven en DoctorProfileCard.jsx (el panel
// derecho), por lo que esta tabla no necesita un menu de acciones por fila.
const DoctorsTable = ({
  doctors,
  loading,
  error,
  onSelectDoctor,
  onOpenForm,
}) => {
  if (error) {
    return <p className="mt-5 text-red-500 text-sm text-center">Error: {error}</p>;
  }

  const columns = [
    {
      header: "Nombre",
      align: "center",
      render: (doctor) => <span className="font-medium text-gray-900">{doctor.name}</span>,
    },
    { header: "Apellido", key: "last_name", align: "center" },
    {
      header: "N° Licencia",
      align: "center",
      render: (doctor) => <span className="font-mono text-xs text-gray-500">{doctor.license_number || "—"}</span>,
    },
    {
      header: "Teléfono",
      align: "center",
      render: (doctor) => <span className="text-gray-500">{doctor.phone || "—"}</span>,
    },
    {
      // Nunca la imagen real (es información sensible, solo el propio doctor puede verla y
      // guardarla desde su perfil): el backend ya la reemplaza por este booleano antes de
      // responder (ver withSignatureFlags en doctorsController.js), así que ni siquiera un
      // admin gestionando la lista puede acceder a ella desde aquí.
      header: "Firma",
      align: "center",
      render: (doctor) => (
        <input type="checkbox" checked={Boolean(doctor.has_signature)} disabled className="w-4 h-4 accent-blue-600 cursor-not-allowed" />
      ),
    },
    {
      header: "Sello",
      align: "center",
      render: (doctor) => (
        <input type="checkbox" checked={Boolean(doctor.has_seal)} disabled className="w-4 h-4 accent-blue-600 cursor-not-allowed" />
      ),
    },
    {
      header: "Estado",
      align: "center",
      render: (doctor) => (
        <span
          className={`inline-flex items-center gap-1.5 font-medium px-2.5 py-1 rounded-full text-xs ${
            doctor.is_active !== false ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${doctor.is_active !== false ? "bg-green-500" : "bg-red-500"}`} />
          {doctor.is_active !== false ? "Activo" : "Inactivo"}
        </span>
      ),
    },
  ];

  return (
    <GenericTable
      title="Administración de doctores"
      placeholderSearch="Encuentra por nombre, apellido o email..."
      data={doctors}
      columns={columns}
      loading={loading}
      // Campos usados para filtrar la tabla en el buscador interactivo
      searchFields={["name", "last_name", "email"]}
      onAdd={onOpenForm}
      addLabel="Agregar doctor"
      onRowClick={onSelectDoctor}
      evenColumns
    />
  );
};

export default DoctorsTable;
