import { useState } from "react";
import { MoreVertical, Edit2, Trash2 } from "lucide-react";
import GenericTable from "@/components/ui/GenericTable";

const PatientsTable = ({ patients, loading, onAdd, onEdit, onDelete }) => {
  const [activeMenuId, setActiveMenuId] = useState(null);

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
    {
      header: "Acciones",
      align: "right",
      render: (patient, index, openUpwards) => {
        const isMenuOpen = activeMenuId === patient._id;
        return (
          <>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setActiveMenuId(isMenuOpen ? null : patient._id); }}
              className={`p-1.5 rounded-lg hover:bg-gray-100 transition-colors ${isMenuOpen ? "bg-gray-100 text-gray-900" : "text-gray-400"}`}
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
                    onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); if (onEdit) onEdit(patient); }}
                    className="w-full px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-gray-400" />
                    Editar
                  </button>
                  <div className="border-t border-gray-50 my-1" />
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); if (onDelete) onDelete(patient); }}
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
      title="Administración de pacientes"
      placeholderSearch="Buscar por nombre, apellido, DUI o correo..."
      data={patients}
      columns={columns}
      loading={loading}
      searchFields={["name", "last_name", "dui", "email"]}
      onAdd={onAdd}
      addLabel="Agregar Paciente"
    />
  );
};

export default PatientsTable;
