import React, { useState, useEffect, useRef } from "react";
import { MoreVertical, Edit2, Trash2 } from "lucide-react";

const DoctorsTable = ({
  doctors,
  loading,
  error,
  onSelectDoctor,
  onOpenForm,
  onEditDoctor,
  onDeleteDoctor,
}) => {
  //Estado para saber qué menú de fila (ID) está abierto actualmente
  const [activeMenuId, setActiveMenuId] = useState(null);
  const menuRef = useRef(null);

  //Cerra el meni si el usuario hace click en cualquier otra parte de la pantalla
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleMenu = (e, id) => {
    e.stopPropagation(); // Evita que al abrir el menú se seleccione la fila entera
    setActiveMenuId(activeMenuId === id ? null : id);
  };

  //Funcion manejadora que elimina directamente sin confirmaciones
  const handleDeleteClick = (e, doctor) => {
    e.preventDefault();
    e.stopPropagation(); // Evita accionar el click de la fila entera
    
    setActiveMenuId(null); // Cierra el dropdown inmediatamente
    onDeleteDoctor(doctor._id); // Llama directo a la acción de eliminar
  };

  if (loading) {
    return <div className="py-10 text-center text-sm text-gray-500">Cargando doctores...</div>;
  }

  if (error) {
    return <p className="mt-5 text-red-500 text-sm text-center">Error: {error}</p>;
  }

  return (
    <>
      <div className="flex justify-end mt-5 mb-4">
        <button
          onClick={onOpenForm}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
        >
          + Agregar Doctor
        </button>
      </div>

      <div className="w-full overflow-hidden bg-white border border-gray-100 rounded-xl shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-gray-400 text-xs font-normal">
                <th className="py-4 pl-4 font-normal text-gray-400">Nombre</th>
                <th className="py-4 font-normal text-gray-400">Apellido</th>
                <th className="py-4 font-normal text-gray-400">N° Licencia</th>
                <th className="py-4 font-normal text-gray-400">Correo</th>
                <th className="py-4 font-normal text-gray-400">Teléfono</th>
                <th className="py-4 font-normal text-gray-400">Estado</th>
                <th className="py-4 text-right font-normal text-gray-400 pr-4">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm text-gray-700">
              {doctors.length > 0 ? (
                doctors.map((doctor, index) => {
                  const openUpwards = index >= doctors.length - 2 && doctors.length > 2;

                  return (
                    <tr
                      key={doctor._id}
                      className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                      onClick={() => onSelectDoctor(doctor)}
                    >
                      <td className="py-4 pl-4 font-medium text-gray-900">{doctor.name}</td>
                      <td className="py-4 text-gray-600">{doctor.last_name}</td>
                      <td className="py-4 text-gray-500 font-mono text-xs">{doctor.license_number}</td>
                      <td className="py-4 text-gray-500">{doctor.email}</td>
                      <td className="py-4 text-gray-500">{doctor.phone}</td>

                      <td className="py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 font-medium px-2.5 py-1 rounded-full text-xs ${
                            doctor.is_active
                              ? "bg-green-50 text-green-700"
                              : "bg-red-50 text-red-700"
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${doctor.is_active ? "bg-green-500" : "bg-red-500"}`} />
                          {doctor.is_active ? "Activo" : "Inactivo"}
                        </span>
                      </td>

                      {/* Columna de Acciones con menú relativo */}
                      <td className="py-4 text-right pr-4 relative">
                        <button
                          onClick={(e) => toggleMenu(e, doctor._id)}
                          className={`p-1.5 rounded-lg hover:bg-gray-100 transition-colors ${
                            activeMenuId === doctor._id ? "bg-gray-100 text-gray-900" : "text-gray-400"
                          }`}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {/* Menú Dropdown Flotante Personalizado */}
                        {activeMenuId === doctor._id && (
                          <div
                            ref={menuRef}
                            className={`absolute w-36 bg-white border border-gray-100 rounded-xl shadow-xl py-1.5 z-30 text-left right-12 ${
                              openUpwards
                                ? "bottom-full mb-1"
                                : "top-full mt-1"
                            }`}
                          >
                            {/* Opción Editar */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation(); // Evita accionar el click de la fila entera
                                onEditDoctor(doctor);
                                setActiveMenuId(null);
                              }}
                              className="w-full px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-gray-400" />
                              Editar
                            </button>

                            <div className="border-t border-gray-50 my-1" />

                            {/* Opción Eliminar Directa */}
                            <button
                              onClick={(e) => handleDeleteClick(e, doctor)}
                              className="w-full px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50/60 flex items-center gap-2 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-400" />
                              Eliminar
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-400 text-sm">
                    No hay doctores registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default DoctorsTable;