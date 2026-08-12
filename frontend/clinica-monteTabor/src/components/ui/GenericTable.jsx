import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
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
  // evenColumns: reparte las columnas en anchos iguales (table-layout: fixed) en vez del ancho
  // automático por contenido — para tablas donde se quiere que los datos queden distribuidos de
  // forma pareja en vez de amontonados a un lado. Opt-in para no afectar las tablas existentes
  // que ya dependen del ancho automático.
  evenColumns = false,
  // Reporta (en px) la distancia entre el borde superior de este componente y el borde
  // superior de la tabla real, es decir después de la barra de búsqueda/filtros de arriba —
  // para que quien lo use pueda alinear otro elemento (ej. un panel lateral) con el inicio de
  // la tabla en sí, no con el inicio de esos controles.
  onTableOffsetChange,
  // Contenido extra (título, selects de filtro, etc.) que se muestra en la MISMA fila que el
  // buscador, a su izquierda — para no gastar una fila completa aparte solo para eso, dejando
  // espacio en blanco a la derecha tanto de ese contenido como del buscador.
  headerLeft,
  // Filas extra a mostrar por encima de itemsPerPage, sin cambiar de página — para rellenar un
  // espacio vertical disponible (ej. un panel lateral más alto). La paginación (totalPages,
  // qué fila "empieza" cada página) sigue calculándose con itemsPerPage normal; esto solo
  // decide cuántas filas se muestran de más al final de la página actual.
  extraRows = 0,
  // Avisa cuando cambia la cantidad de filas por página seleccionada — para que quien usa
  // extraRows pueda invalidar su cálculo (basado en la altura de la tabla con el tamaño de
  // página ANTERIOR) y volver a medir con el nuevo.
  onItemsPerPageChange,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [nurseFilter, setNurseFilter] = useState("all"); // 'all' | 'yes' | 'no'

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(8);

  const rootRef = useRef(null);
  const tableContainerRef = useRef(null);

  // Volver a la página 1 si cambia cualquier filtro
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, nurseFilter, itemsPerPage]);

  useEffect(() => {
    onItemsPerPageChange?.(itemsPerPage);
  }, [itemsPerPage]);

  useLayoutEffect(() => {
    if (!onTableOffsetChange) return;
    const root = rootRef.current;
    const tableEl = tableContainerRef.current;
    if (!root || !tableEl) {
      onTableOffsetChange(0);
      return;
    }
    const report = () => {
      onTableOffsetChange(tableEl.getBoundingClientRect().top - root.getBoundingClientRect().top);
    };
    report();
    const ro = new ResizeObserver(report);
    ro.observe(root);
    return () => ro.disconnect();
  }, [onTableOffsetChange, loading]);

  if (loading) {
    return <div ref={rootRef} className="py-10 text-center text-sm text-gray-500">Cargando información...</div>;
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
  const indexOfFirstItem = (currentPage - 1) * itemsPerPage;
  const effectivePerPage = itemsPerPage + Math.max(0, extraRows);
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfFirstItem + effectivePerPage);

  return (
    <div ref={rootRef} className="space-y-4">
      {/* BARRA SUPERIOR CONTROLES */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        
        <div className="flex flex-1 flex-wrap items-center gap-3 max-w-2xl">
          {headerLeft}
          {/* Buscador */}
          {searchFields.length > 0 && (
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={placeholderSearch}
                maxLength={100}
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
      <div ref={tableContainerRef} className="w-full overflow-hidden bg-white border border-gray-100 rounded-xl shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" style={evenColumns ? { tableLayout: "fixed" } : undefined}>
            <thead>
              <tr className="border-b border-gray-100 text-gray-400 text-xs font-normal">
                {columns.map((col, idx) => (
                  <th
                    key={idx}
                    className={`py-4 font-normal text-gray-400 ${
                      col.align === "right" ? "text-right pr-6 pl-4" : col.align === "center" ? "text-center px-8" : "pl-4"
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
                          className={`py-4 ${col.align === "right" ? "text-right pr-6 pl-4 relative" : col.align === "center" ? "text-center px-8" : "pl-4"}`}
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