import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TablePagination = ({
  currentPage,
  totalPages,
  itemsPerPage,
  setItemsPerPage,
  onNextPage,
  onPrevPage,
  // Opciones del selector "Filas por página", configurable porque no todas las tablas quieren
  // las mismas: ej. Movimientos de inventario rellena el espacio en blanco debajo de la tabla
  // con filas extra (ver extraRows en GenericTable.jsx), así que paginar de 5 en 5 ahí no tiene
  // sentido, deja espacio en blanco de todos modos.
  pageSizeOptions = [5, 8, 10],
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500 mt-4">
      {/* Selector de filas por página */}
      <div className="flex items-center gap-2">
        <span>Filas por página</span>
        <Select
          // Convierte el número a string para que el componente Select lo reconozca bien.
          value={String(itemsPerPage)}
          onValueChange={(value) => {
            // Comprueba que setItemsPerPage sea una función antes de invocarla.
            if (typeof setItemsPerPage === "function") {
              // Convierte el string del value de vuelta a número para actualizar el estado.
              setItemsPerPage(Number(value));
            }
          }}
        >
          <SelectTrigger className="w-[65px] h-8 border-none p-0 shadow-none focus:ring-0 font-medium text-slate-700 bg-transparent flex gap-1 justify-start">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {pageSizeOptions.map((size) => (
              <SelectItem key={size} value={String(size)}>{size}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Controles de páginas */}
      <div className="flex items-center gap-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={onPrevPage}
          // Se deshabilita automáticamente si el usuario ya está en la página 1.
          disabled={currentPage === 1}
          className="text-slate-500 hover:text-slate-800 gap-1 font-medium p-0 h-auto hover:bg-transparent disabled:opacity-40"
        >
          <ChevronLeft className="w-4 h-4" />
          Anterior
        </Button>

        <div className="text-sm">
          <span className="font-semibold text-slate-800">{currentPage}</span>
          <span className="text-slate-400 mx-1">de</span>
          <span className="text-slate-400">{totalPages || 1}</span>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onNextPage}
          // Se deshabilita si el usuario llega a la última página o si el total de páginas es 0.
          disabled={currentPage === totalPages || totalPages === 0}
          className="text-slate-500 hover:text-slate-800 gap-1 font-medium p-0 h-auto hover:bg-transparent disabled:opacity-40"
        >
          Siguiente
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default TablePagination;