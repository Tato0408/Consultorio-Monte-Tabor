import { useState } from "react";
import { MoreVertical, Edit2, Trash2 } from "lucide-react";
import GenericTable from "@/components/ui/GenericTable";

const DoctorsTable = ({
  doctors,
  loading,
  error,
  onSelectDoctor,
  onOpenForm,
  onEditDoctor,
  onDeleteDoctor,
}) => {
  // Únicamente controlamos qué menú flotante de fila está desplegado
  const [activeMenuId, setActiveMenuId] = useState(null);

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
    {
      header: "Acciones",
      align: "right", // Alinea el encabezado y la celda a la derecha
      render: (doctor, index, openUpwards) => {
        const isMenuOpen = activeMenuId === doctor._id;

        return (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation(); // Evita accionar el clic de selección de la fila
                setActiveMenuId(isMenuOpen ? null : doctor._id);
              }}
              className={`p-1.5 rounded-lg hover:bg-gray-100 transition-colors ${
                isMenuOpen ? "bg-gray-100 text-gray-900" : "text-gray-400"
              }`}
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {isMenuOpen && (
              <>
                {/* Backdrop del componente genérico para cerrar el menú si se clickea fuera */}
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
                      if (onEditDoctor) onEditDoctor(doctor);
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
                      if (onDeleteDoctor) onDeleteDoctor(doctor._id); // Ejecuta el borrado directo
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
      title="Administración de doctores"
      placeholderSearch="Encuentra por nombre, apellido o email..."
      data={doctors}
      columns={columns}
      loading={loading}
      searchFields={["name", "last_name", "email"]} // Filtra interactivamente usando estos campos
      onAdd={onOpenForm}
      addLabel="Agregar Doctor"
    />
  );
};

export default DoctorsTable;