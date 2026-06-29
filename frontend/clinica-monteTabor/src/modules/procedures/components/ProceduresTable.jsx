import React, { useState, useEffect, useRef } from "react";
import { Clock, Package, X, MoreVertical, ChevronLeft, ChevronRight, Edit2, Trash2 } from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

const ProceduresTable = ({ data, loading, onEdit, onDelete }) => {
  // Estado para saber qué menú de fila (ID) está abierto actualmente
  const [activeMenuId, setActiveMenuId] = useState(null);
  const menuRef = useRef(null);

  // Cerrar el menú chiquito si el usuario hace clic en cualquier otra parte de la pantalla
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleMenu = (id) => {
    setActiveMenuId(activeMenuId === id ? null : id);
  };

  if (loading) {
    return <div className="py-10 text-center text-sm text-gray-500">Cargando procedimientos...</div>;
  }

  return (
    <div className="w-full overflow-hidden bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100 text-gray-400 text-xs font-normal">
              <th className="py-4 font-normal text-gray-400">Procedimiento</th>
              <th className="py-4 font-normal text-gray-400">Duración estimada</th>
              <th className="py-4 font-normal text-gray-400">Precio</th>
              <th className="py-4 font-normal text-gray-400">Materiales</th>
              <th className="py-4 font-normal text-gray-400">Requiere enfermera</th>
              <th className="py-4 text-right font-normal text-gray-400 pr-4">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 text-sm text-gray-700">
            {data.map((proc, index) => {
              // DETECCIÓN DE FILAS INFERIORES: Si son las últimas 2 filas de la lista, abrimos hacia arriba
              const openUpwards = index >= data.length - 2 && data.length > 2;

              return (
                <tr key={proc._id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-4 font-medium text-gray-900">{proc.name}</td>
                  
                  <td className="py-4 text-gray-500">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span>{proc.estimated_duration ? `${proc.estimated_duration} min` : "N/A"}</span>
                    </div>
                  </td>
                  
                  <td className="py-4 font-medium text-gray-900">
                    ${proc.price ? proc.price.toFixed(2) : "0.00"}
                  </td>
                  
                  <td className="py-4 text-gray-500">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-gray-400" />
                      <span>{proc.materials ? proc.materials.length : 0} materiales</span>
                    </div>
                  </td>
                  
                  <td className="py-4">
                    {proc.requires_nurse ? (
                      <span className="inline-flex items-center gap-1.5 text-green-600 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Sí
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-gray-500 font-medium">
                        <X className="w-3.5 h-3.5 text-red-400 stroke-[3]" /> No
                      </span>
                    )}
                  </td>
                  
                  {/* Columna de Acciones con menú contenedor relativo */}
                  <td className="py-4 text-right pr-4 relative">
                    <button 
                      onClick={() => toggleMenu(proc._id)}
                      className={`p-1.5 rounded-lg hover:bg-gray-100 transition-colors ${
                        activeMenuId === proc._id ? "bg-gray-100 text-gray-900" : "text-gray-400"
                      }`}
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {/* "Modal chiquito" / Menú Dropdown Flotante */}
                    {activeMenuId === proc._id && (
                      <div 
                        ref={menuRef}
                        className={`absolute w-36 bg-white border border-gray-100 rounded-xl shadow-xl py-1.5 z-30 text-left animate-in fade-in duration-150 right-12 ${
                          openUpwards 
                            ? "bottom-full mb-1 slide-in-from-bottom-1" 
                            : "top-full mt-1 slide-in-from-top-1"
                        }`}
                      >
                        {/* Opción Editar */}
                        <button
                          onClick={() => {
                            onEdit(proc);
                            setActiveMenuId(null);
                          }}
                          className="w-full px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-gray-400" />
                          Editar
                        </button>

                        {/* Divisor */}
                        <div className="border-t border-gray-50 my-1" />

                        {/* Opción Eliminar */}
                        <button
                          onClick={() => {
                            onDelete(proc._id);
                            setActiveMenuId(null);
                          }}
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
            })}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="flex items-center justify-between pt-6 text-sm text-gray-500 border-t border-gray-100 mt-2">
        <div className="flex items-center gap-2">
          <span>Filas por página</span>
          <Select defaultValue="8">
            <SelectTrigger className="h-7 border-none bg-transparent p-0 shadow-none gap-1 text-gray-700 font-medium">
              <SelectValue placeholder="8" />
            </SelectTrigger>
            <SelectContent sideOffset={4} className="min-w-16">
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="8">8</SelectItem>
              <SelectItem value="10">10</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-6">
          <button className="flex items-center gap-1 hover:text-gray-900 transition-colors disabled:opacity-40" disabled>
            <ChevronLeft className="w-4 h-4" /> Anterior
          </button>
          <span className="text-gray-900 font-medium">1 de 5</span>
          <button className="flex items-center gap-1 hover:text-gray-900 transition-colors" disabled>
            Siguiente <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProceduresTable;