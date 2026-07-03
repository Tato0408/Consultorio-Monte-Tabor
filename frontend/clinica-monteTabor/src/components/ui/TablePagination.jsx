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
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500 mt-4">
      {/* Selector de filas por pgina */}
      <div className="flex items-center gap-2">
        <span>Filas por página</span>
        <Select 
          //convierte el numero a string para que el componente sleect lo reconozca bien
          value={String(itemsPerPage)} 
          onValueChange={(value) => {
            //evalua que setItemsPerPage si sea una funcion antes de mandarla a llamar
            if (typeof setItemsPerPage === "function") {
              //convierte el string del value de regreso a numero para actualizar el estado
              setItemsPerPage(Number(value));
            }
          }}
        >
          <SelectTrigger className="w-[65px] h-8 border-none p-0 shadow-none focus:ring-0 font-medium text-slate-700 bg-transparent flex gap-1 justify-start">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="5">5</SelectItem>
            <SelectItem value="8">8</SelectItem>
            <SelectItem value="10">10</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Controles de paginas */}
      <div className="flex items-center gap-6">
        <Button
          variant="ghost"
          size="sm"
          // onclick la funcion recibidaps para ir a la pagina anterior
          onClick={onPrevPage}
          //Se deshabilita de forma automatica si el usuario ya esta parado en la pagina 1
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
          //onClick la funcion recibids para avanzar a la siguiente pagina
          onClick={onNextPage}
          //Se deshabilita si el usuario llega a la ultima pagina o si el total de paginas es 0
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