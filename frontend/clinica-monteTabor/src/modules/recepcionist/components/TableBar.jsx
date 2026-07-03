import React from "react";
import {
  Search,
  Filter,
  ChevronDown,
  Plus,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TableBar = ({
  search,
  setSearch,
  onAdd,
}) => {
  return (
    <>
      {/* Filtros Superiores */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">

        <div className="flex items-center gap-1 cursor-pointer hover:text-slate-900 transition-colors">
          <span className="text-lg font-semibold text-slate-800">
            Todos
          </span>
          <ChevronDown className="w-5 h-5 text-slate-500" />
        </div>

        <div className="flex items-center gap-3">


          <Button
            onClick={onAdd}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
          >
            <Plus className="w-4 h-4 mr-2" />
            Agregar Recepcionista
          </Button>

        </div>

      </div>

      {/* Barra de búsqueda */}
      <div className="flex items-center gap-3 mb-6">

        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />

          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            type="text"
            placeholder="Encuentra por nombre, apellido o email"
            className="pl-10 h-10 border-slate-200 text-sm focus-visible:ring-1 focus-visible:ring-slate-400 placeholder:text-slate-400 w-full"
          />
        </div>

      </div>
    </>
  );
};

export default TableBar;