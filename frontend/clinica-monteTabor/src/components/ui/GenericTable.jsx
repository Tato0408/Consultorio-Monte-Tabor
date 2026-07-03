import React, { useState, useEffect } from "react";
import { Search, Plus } from "lucide-react";
import TablePagination from "./TablePagination";
// Importamos los elementos de Shadcn UI que ya usas para los filtros
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

const GenericTable = ({
  title,
  placeholderSearch = "Buscar...",
  data = [],
  columns = [],
  loading = false,
  searchFields = [],
  onAdd,
  addLabel = "Agregar",
  showNurseFilter = false,
  onRowClick,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [nurseFilter, setNurseFilter] = useState("all"); // 'all' | 'yes' | 'no'
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(8);

  // Volver a la página 1 si cambia cualquier filtro
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, nurseFilter, itemsPerPage]);

  if (loading) {
    return <div className="py-10 text-center text-sm text-gray-500">Cargando información...</div>;
  }

  const filteredData = data.filter((item) => {
    // 1. Filtro de texto
    const matchSearch = !searchQuery || searchFields.some((field) => {
      const value = item[field];
      return String(value || "").toLowerCase().includes(searchQuery.toLowerCase());
    });

    // 2. Filtro de enfermera condicional
    let matchNurse = true;
    if (showNurseFilter && nurseFilter !== "all") {
      const needsNurse = nurseFilter === "yes";
      matchNurse = item.requires_nurse === needsNurse;
    }

    return matchSearch && matchNurse;
  });

  // Lógica de paginación sobre los datos ya filtrados
  const totalItems = filteredData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="space-y-4">
      {/* BARRA SUPERIOR CONTROLES */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        
        <div className="flex flex-1 items-center gap-3 max-w-2xl">
          {/* Buscador */}
          {searchFields.length > 0 && (
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={placeholderSearch}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition-all text-gray-700"
              />
            </div>
          )}

          {/* FILTRO DE REQUIERE ENFERMERA (Aparece solo si showNurseFilter es true) */}
          {showNurseFilter && (
            <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-xl px-3 h-[38px]">
              <span className="text-xs text-gray-400 font-normal whitespace-nowrap">¿Enfermera?</span>
              <Select value={nurseFilter} onValueChange={setNurseFilter}>
                <SelectTrigger className="h-7 border-none bg-transparent p-0 shadow-none focus:ring-0 gap-1 text-gray-800 font-semibold text-xs min-w-[60px]">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent sideOffset={6}>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="yes">Sí</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Botón Añadir */}
        {onAdd && (
          <button
            type="button"
            onClick={onAdd}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-medium text-sm transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            {addLabel}
          </button>
        )}
      </div>

      {/* CONTENEDOR DE LA TABLA */}
      <div className="w-full overflow-hidden bg-white border border-gray-100 rounded-xl shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-gray-400 text-xs font-normal">
                {columns.map((col, idx) => (
                  <th
                    key={idx}
                    className={`py-4 pl-4 font-normal text-gray-400 ${
                      col.align === "right" ? "text-right pr-6" : ""
                    }`}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm text-gray-700">
              {currentItems.length > 0 ? (
                currentItems.map((item, rowIndex) => {
                  const openUpwards = rowIndex >= currentItems.length - 2 && currentItems.length > 2;

                  return (
                    <tr key={item._id || rowIndex} onClick={() => onRowClick && onRowClick(item)} className="hover:bg-gray-50/50 transition-colors">
                      {columns.map((col, colIdx) => (
                        <td
                          key={colIdx}
                          className={`py-4 pl-4 ${col.align === "right" ? "text-right pr-6 relative" : ""}`}
                        >
                          {col.render
                            ? col.render(item, rowIndex, openUpwards)
                            : item[col.key] || "—"}
                        </td>
                      ))}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={columns.length} className="text-center py-10 text-gray-400 text-sm">
                    No se encontraron registros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RENDERIZADO DEL COMPONENTE DE PAGINACIÓN */}
      <TablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={itemsPerPage}
        setItemsPerPage={setItemsPerPage}
        onNextPage={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
        onPrevPage={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
      />
    </div>
  );
};

export default GenericTable;