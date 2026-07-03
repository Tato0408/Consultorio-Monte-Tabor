import GenericTable from "@/components/ui/GenericTable";
import { MoreVertical, Edit2, Trash2 } from "lucide-react";
import { useState } from "react";

const NurseTable = ({ nurses, loading, selectedNurse, onSelect, onAdd, onEdit, onDelete }) => {
  const [activeMenuId, setActiveMenuId] = useState(null);

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
    {
      header: "Acciones",
      align: "right", // Se alinea a la derecha
      render: (nurse, index, openUpwards) => {
        const isMenuOpen = activeMenuId === nurse._id;
        return (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveMenuId(isMenuOpen ? null : nurse._id);
              }}
              className={`p-1.5 rounded-lg hover:bg-gray-100 transition-colors ${
                isMenuOpen ? "bg-gray-100 text-gray-900" : "text-gray-400"
              }`}
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {isMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); }} />
                <div
                  className={`absolute w-36 bg-white border border-gray-100 rounded-xl shadow-xl py-1.5 z-30 text-left right-12 ${
                    openUpwards ? "bottom-full mb-1" : "top-full mt-1"
                  } animate-in fade-in slide-in-from-bottom-1 duration-100`}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenuId(null);
                      if (onEdit) onEdit(nurse);
                    }}
                    className="w-full px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-gray-400" />
                    Editar
                  </button>
                  <div className="border-t border-gray-50 my-1" />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenuId(null);
                      if (onDelete) onDelete(nurse);
                    }}
                    className="w-full px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50/60 flex items-center gap-2 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    Eliminar
                  </button>
                </div>
              </>
            )}
          </>
        );
      },
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
    />
  );
};

export default NurseTable;