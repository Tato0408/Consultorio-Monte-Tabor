import { useState } from "react";
import { MoreVertical, Edit2, Trash2 } from "lucide-react";
import GenericTable from "@/components/ui/GenericTable";

const ReceptionistsTable = ({
  receptionists,
  loading,
  error,
  onOpenForm,
  onEdit,
  onDelete,
}) => {
  // Únicamente controlamos qué menú flotante de fila está desplegado
  const [activeMenuId, setActiveMenuId] = useState(null);

  // Manejo de errores limpio en el subcomponente
  if (error) {
    return <p className="mt-5 text-red-500 text-sm text-center">Error: {error}</p>;
  }

  // Definición de las columnas específicas para Recepcionistas (Sin Columna de Foto)
  const columns = [
    {
      header: "Nombre",
      render: (receptionist) => <span className="font-medium text-gray-900">{receptionist.name}</span>,
    },
    { header: "Apellido", key: "last_name" },
    {
      header: "DUI",
      render: (receptionist) => <span className="font-mono text-xs text-gray-500">{receptionist.dui || "—"}</span>,
    },
    {
      header: "Correo",
      render: (receptionist) => <span className="text-gray-500">{receptionist.email || "—"}</span>,
    },
    {
      header: "Teléfono",
      render: (receptionist) => <span className="text-gray-500">{receptionist.phone || "—"}</span>,
    },
    {
      header: "Estado",
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
    {
      header: "Acciones",
      align: "right",
      render: (receptionist, index, openUpwards) => {
        const isMenuOpen = activeMenuId === receptionist._id;

        return (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation(); // Evita que se disparen selecciones accidentales en la fila
                setActiveMenuId(isMenuOpen ? null : receptionist._id);
              }}
              className={`p-1.5 rounded-lg hover:bg-gray-100 transition-colors ${
                isMenuOpen ? "bg-gray-100 text-gray-900" : "text-gray-400"
              }`}
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {isMenuOpen && (
              <>
                {/* Backdrop nativo para cerrar el menú haciendo clic fuera */}
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
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenuId(null);
                      if (onEdit) onEdit(receptionist);
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
                      e.preventDefault();
                      setActiveMenuId(null);
                      if (onDelete) onDelete(receptionist._id);
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

  return (
    <GenericTable
      title="Administración de recepcionistas"
      placeholderSearch="Encuentra por nombre, apellido, DUI o email..."
      data={receptionists}
      columns={columns}
      loading={loading}
      searchFields={["name", "last_name", "dui", "email"]} 
      onAdd={onOpenForm}
      addLabel="Agregar Recepcionista"
    />
  );
};

export default ReceptionistsTable;