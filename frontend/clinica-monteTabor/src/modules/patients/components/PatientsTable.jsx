import { MoreVertical, Edit2, Trash2 } from "lucide-react";
import GenericTable from "@/components/ui/GenericTable";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const PatientsTable = ({ patients, loading, onAdd, onEdit, onDelete, onSelectPatient, canUpdate = true, canDelete = true }) => {
  const columns = [
    { header: "Nombre", render: (patient) => <span className="font-medium text-gray-900">{patient.name}</span> },
    { header: "Apellido", key: "last_name" },
    { header: "DUI", render: (patient) => <span className="font-mono text-xs text-gray-500">{patient.dui || "—"}</span> },
    { header: "Teléfono", render: (patient) => <span className="text-gray-500">{patient.phone || "—"}</span> },
    { header: "Correo", render: (patient) => <span className="text-gray-500">{patient.email || "—"}</span> },
    {
      header: "Estado",
      render: (patient) => (
        <span className={`inline-flex items-center gap-1.5 font-medium px-2.5 py-1 rounded-full text-xs ${patient.is_active ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${patient.is_active ? "bg-green-500" : "bg-red-500"}`} />
          {patient.is_active ? "Activo" : "Inactivo"}
        </span>
      ),
    },
    ...(canUpdate || canDelete
      ? [
          {
            header: "Acciones",
            align: "right",
            // El menú se renderiza en un portal (fuera del contenedor con overflow de la
            // tabla), por lo que ya no depende de "openUpwards": se reposiciona solo y nunca
            // queda recortado, sin importar cuántas filas haya visibles.
            render: (patient) => (
              <DropdownMenu>
                <DropdownMenuTrigger
                  onClick={(e) => e.stopPropagation()}
                  className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 outline-none data-popup-open:bg-gray-100 data-popup-open:text-gray-900"
                >
                  <MoreVertical className="w-4 h-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-36">
                  {canUpdate && (
                    <DropdownMenuItem
                      onClick={(e) => { e.stopPropagation(); onEdit?.(patient); }}
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
                      onClick={(e) => { e.stopPropagation(); onDelete?.(patient); }}
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
      title="Administración de pacientes"
      placeholderSearch="Buscar por nombre, apellido, DUI o correo..."
      data={patients}
      columns={columns}
      loading={loading}
      searchFields={["name", "last_name", "dui", "email"]}
      onAdd={onAdd}
      addLabel="Agregar Paciente"
      onRowClick={onSelectPatient}
    />
  );
};

export default PatientsTable;
