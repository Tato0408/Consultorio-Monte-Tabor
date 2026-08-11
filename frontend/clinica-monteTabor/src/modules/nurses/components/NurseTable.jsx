import GenericTable from "@/components/ui/GenericTable";
import { MoreVertical, Edit2, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const NurseTable = ({ nurses, loading, selectedNurse, onSelect, onAdd, onEdit, onDelete, canUpdate = true, canDelete = true }) => {
  // Definición de Columnas de la Tabla de Enfermeras
  const columns = [
    {
      header: "Nombre",
      render: (nurse) => <span className="font-medium text-gray-900">{nurse.name}</span>,
    },
    { header: "Apellido", key: "last_name" },
    {
      header: "DUI",
      render: (nurse) => <span className="font-mono text-xs text-gray-500">{nurse.dui || "—"}</span>,
    },
    {
      header: "Teléfono",
      render: (nurse) => <span className="text-gray-500">{nurse.phone || "—"}</span>,
    },
    {
      header: "Estado",
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
    ...(canUpdate || canDelete
      ? [
          {
            header: "Acciones",
            align: "right", // Se alinea a la derecha
            // El menú se renderiza en un portal (fuera del contenedor con overflow de la
            // tabla), por lo que ya no depende de "openUpwards": se reposiciona solo y nunca
            // queda recortado, sin importar cuántas filas haya visibles.
            render: (nurse) => (
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
                      onClick={(e) => { e.stopPropagation(); onEdit?.(nurse); }}
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
                      onClick={(e) => { e.stopPropagation(); onDelete?.(nurse); }}
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
    />
  );
};

export default NurseTable;