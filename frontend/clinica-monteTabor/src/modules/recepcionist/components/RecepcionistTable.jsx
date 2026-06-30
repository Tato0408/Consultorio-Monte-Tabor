import React, { useState, useEffect, useRef } from "react";
import { MoreVertical, Edit2, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const ReceptionistsTable = ({
  receptionists,
  loading,
  error,
  onOpenForm,
  onEdit,
  onDelete,
}) => {
  // Estado para saber qué menú de fila (ID) está abierto actualmente
  const [activeMenuId, setActiveMenuId] = useState(null);
  const menuRef = useRef(null);

  // Cerrar el menú si el usuario hace clic en cualquier otra parte de la pantalla
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
    e.stopPropagation(); // Evita cualquier comportamiento extraño en la fila
    setActiveMenuId(activeMenuId === id ? null : id);
  };

  // Función manejadora que elimina directamente sin confirmaciones previniendo bugs de eventos
  const handleDeleteClick = (e, receptionist) => {
    e.preventDefault();
    e.stopPropagation(); // Evita que el click se propague a la fila
    
    setActiveMenuId(null); // Cierra el dropdown inmediatamente
    onDelete(receptionist._id); // Ejecuta la acción de borrado directa
  };

  if (loading) {
    return <p className="mt-5 text-center text-sm text-gray-500">Cargando recepcionistas...</p>;
  }

  if (error) {
    return (
      <p className="mt-5 text-red-500 text-sm text-center">
        Error: {error}
      </p>
    );
  }

  return (
    <>
      <div className="rounded-xl border overflow-hidden bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Foto</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Apellido</TableHead>
              <TableHead>DUI</TableHead>
              <TableHead>Correo</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right pr-6">Acciones</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {receptionists.length > 0 ? (
              receptionists.map((receptionist, index) => {
                // DETECCIÓN DE FILAS INFERIORES: Abre hacia arriba si son las últimas 2 filas
                const openUpwards = index >= receptionists.length - 2 && receptionists.length > 2;

                return (
                  <TableRow
                    key={receptionist._id}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <TableCell>
                      <img
                        src={receptionist.img_url}
                        alt={receptionist.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    </TableCell>

                    <TableCell className="font-medium text-gray-900">
                      {receptionist.name}
                    </TableCell>

                    <TableCell>{receptionist.last_name}</TableCell>

                    <TableCell>{receptionist.dui}</TableCell>

                    <TableCell>{receptionist.email}</TableCell>

                    <TableCell>{receptionist.phone}</TableCell>

                    <TableCell>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          receptionist.is_active
                            ? "bg-green-100 text-green-600"
                            : "bg-red-100 text-red-600"
                        }`}
                      >
                        {receptionist.is_active ? "Activo" : "Inactivo"}
                      </span>
                    </TableCell>

                    {/* Columna de Acciones con contenedor relativo */}
                    <TableCell className="text-right pr-6 relative">
                      <button
                        onClick={(e) => toggleMenu(e, receptionist._id)}
                        className={`p-1.5 rounded-lg hover:bg-gray-100 transition-colors ${
                          activeMenuId === receptionist._id ? "bg-gray-100 text-gray-900" : "text-gray-400"
                        }`}
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {/* Menú Dropdown Flotante Personalizado */}
                      {activeMenuId === receptionist._id && (
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
                              e.stopPropagation();
                              onEdit(receptionist);
                              setActiveMenuId(null);
                            }}
                            className="w-full px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-gray-400" />
                            Editar
                          </button>

                          {/* Divisor */}
                          <div className="border-t border-gray-50 my-1" />

                          {/* Opción Eliminar Directa */}
                          <button
                            onClick={(e) => handleDeleteClick(e, receptionist)}
                            className="w-full px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50/60 flex items-center gap-2 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                            Eliminar
                          </button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center py-4"
                >
                  No hay recepcionistas registrados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
};

export default ReceptionistsTable;