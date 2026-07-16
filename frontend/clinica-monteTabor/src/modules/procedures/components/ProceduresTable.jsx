import { useState } from "react";
import { Clock, Package, X, MoreVertical, Edit2, Trash2 } from "lucide-react";
import GenericTable from "@/components/ui/GenericTable";

const ProceduresTable = ({ data, loading, onAdd, onEdit, onDelete, canUpdate = true, canDelete = true }) => {
  // Únicamente controlamos qué menú flotante de fila está desplegado
  const [activeMenuId, setActiveMenuId] = useState(null);

  // Definición de las columnas específicas para Procedimientos
  const columns = [
    {
      header: "Procedimiento",
      render: (proc) => (
        <span className="font-medium text-gray-900 line-clamp-2 pr-2">
          {proc.name}
        </span>
      ),
    },
    {
      header: "Duración estimada",
      render: (proc) => (
        <div className="flex items-center gap-1.5 md:gap-2 text-gray-500 hidden sm:flex">
          <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span>{proc.estimated_duration ? `${proc.estimated_duration} min` : "N/A"}</span>
        </div>
      ),
    },
    {
      header: "Precio",
      render: (proc) => (
        <span className="font-medium text-gray-900">
          ${proc.price ? proc.price.toFixed(2) : "0.00"}
        </span>
      ),
    },
    {
      header: "Materiales",
      render: (proc) => (
        <div className="flex items-center gap-2 text-gray-500 hidden md:flex">
          <Package className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span>{proc.materials ? proc.materials.length : 0} materiales</span>
        </div>
      ),
    },
    {
      header: "Requiere enfermera",
      render: (proc) => (
        <div className="hidden lg:block">
          {proc.requires_nurse ? (
            <span className="inline-flex items-center gap-1.5 text-green-600 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Sí
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-gray-500 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400" /> No
            </span>
          )}
        </div>
      ),
    },
    ...(canUpdate || canDelete
      ? [
          {
            header: "Acciones",
            align: "right",
            render: (proc, index, openUpwards) => {
              const isMenuOpen = activeMenuId === proc._id;

              return (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation(); // Evita que se dispare la selección de la fila
                      setActiveMenuId(isMenuOpen ? null : proc._id);
                    }}
                    className={`p-1.5 rounded-lg hover:bg-gray-100 transition-colors ${
                      isMenuOpen ? "bg-gray-100 text-gray-900" : "text-gray-400"
                    }`}
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {isMenuOpen && (
                    <>
                      {/* Backdrop global para cerrar al clickear fuera */}
                      <div
                        className="fixed inset-0 z-10"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(null);
                        }}
                      />

                      <div
                        className={`absolute w-36 bg-white border border-gray-100 rounded-xl shadow-xl py-1.5 z-30 text-left right-12 ${
                          openUpwards ? "bottom-full mb-1" : "top-full mt-1"
                        } animate-in fade-in slide-in-from-bottom-1 duration-100`}
                      >
                        {canUpdate && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(null);
                              if (onEdit) onEdit(proc);
                            }}
                            className="w-full px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-gray-400" />
                            Editar
                          </button>
                        )}

                        {canUpdate && canDelete && <div className="border-t border-gray-50 my-1" />}

                        {canDelete && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(null);
                              if (onDelete) onDelete(proc._id);
                            }}
                            className="w-full px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50/60 flex items-center gap-2 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                            Eliminar
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </>
              );
            },
          },
        ]
      : []),
  ];

  return (
    <GenericTable
      title="Administración de procedimientos"
      placeholderSearch="Buscar procedimiento por nombre..."
      data={data}
      columns={columns}
      loading={loading}
      searchFields={["name"]}
      onAdd={onAdd}
      addLabel="Agregar Procedimiento"
      showNurseFilter={true} // <-- El filtro exclusivo de enfermeras ahora se activa bien desde aquí
    />
  );
};

export default ProceduresTable;