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

const TablePagination = () => {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
      <div className="flex items-center gap-2">
        <span>Filas por página</span>
        <Select defaultValue="8"a>
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

      <div className="flex items-center gap-6">
        <Button
          variant="ghost"
          size="sm"
          className="text-slate-500 hover:text-slate-800 gap-1 font-medium p-0 h-auto hover:bg-transparent"
        >
          <ChevronLeft className="w-4 h-4" />
          Anterior
        </Button>

        <div className="text-sm">
          <span className="font-semibold text-slate-800">1</span>
          <span className="text-slate-400 mx-1">de</span>
          <span className="text-slate-400">5</span>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="text-slate-500 hover:text-slate-800 gap-1 font-medium p-0 h-auto hover:bg-transparent"
        >
          Siguiente
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
export default TablePagination