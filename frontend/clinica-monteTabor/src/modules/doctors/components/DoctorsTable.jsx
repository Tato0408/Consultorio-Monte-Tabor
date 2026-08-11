import { MoreVertical, Edit2, Trash2 } from "lucide-react";
import GenericTable from "@/components/ui/GenericTable";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const DoctorsTable = ({
  doctors,
  loading,
  error,
  onSelectDoctor,
  onOpenForm,
  onEditDoctor,
  onDeleteDoctor,
  canUpdate = true,
  canDelete = true,
}) => {
  // Si hay un error, lo seguimos manejando de manera limpia en la parte superior
  if (error) {
    return <p className="mt-5 text-red-500 text-sm text-center">Error: {error}</p>;
  }

  // Definición de las columnas específicas para Doctores
  const columns = [
    {
      header: "Nombre",
      render: (doctor) => <span className="font-medium text-gray-900">{doctor.name}</span>,
    },
    { header: "Apellido", key: "last_name" },
    {
      header: "N° Licencia",
      render: (doctor) => <span className="font-mono text-xs text-gray-500">{doctor.license_number || "—"}</span>,
    },
    {
      header: "Correo",
      render: (doctor) => <span className="text-gray-500">{doctor.email || "—"}</span>,
    },
    {
      header: "Teléfono",
      render: (doctor) => <span className="text-gray-500">{doctor.phone || "—"}</span>,
    },
    {
      header: "Estado",
      render: (doctor) => (
        <span
          className={`inline-flex items-center gap-1.5 font-medium px-2.5 py-1 rounded-full text-xs ${
            doctor.is_active ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${doctor.is_active ? "bg-green-500" : "bg-red-500"}`} />
          {doctor.is_active ? "Activo" : "Inactivo"}
        </span>
      ),
    },
    ...(canUpdate || canDelete
      ? [
          {
            header: "Acciones",
            align: "right", // Alinea el encabezado y la celda a la derecha
            // El menú se renderiza en un portal (fuera del contenedor con overflow de la
            // tabla), por lo que ya no depende de "openUpwards": se reposiciona solo y nunca
            // queda recortado, sin importar cuántas filas haya visibles.
            render: (doctor) => (
              <DropdownMenu>
                <DropdownMenuTrigger
                  onClick={(e) => e.stopPropagation()} // Evita accionar el clic de selección de la fila
                  className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 outline-none data-popup-open:bg-gray-100 data-popup-open:text-gray-900"
                >
                  <MoreVertical className="w-4 h-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-36">
                  {canUpdate && (
                    <DropdownMenuItem
                      onClick={(e) => { e.stopPropagation(); onEditDoctor?.(doctor); }}
                      className="text-gray-700 text-xs"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-gray-400" />
                      Editar
                    </DropdownMenuItem>
                  )}
                  {canUpdate && canDelete && <DropdownMenuSeparator />}
                  {canDelete && (
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={(e) => { e.stopPropagation(); onDeleteDoctor?.(doctor._id); }}
                      className="text-xs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Eliminar
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            ),
          },
        ]
      : []),
  ];

  return (
    <GenericTable
      title="Administración de doctores"
      placeholderSearch="Encuentra por nombre, apellido o email..."
      data={doctors}
      columns={columns}
      loading={loading}
      searchFields={["name", "last_name", "email"]} // Filtra interactivamente usando estos campos
      onAdd={onOpenForm}
      addLabel="Agregar Doctor"
      onRowClick={onSelectDoctor}
    />
  );
};

export default DoctorsTable;