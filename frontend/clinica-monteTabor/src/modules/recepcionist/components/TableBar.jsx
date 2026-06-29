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

const TableBar = ({ onAdd }) => {
  return (
    <>
      {/* Filtros superiores */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">

        <div className="flex items-center gap-1 cursor-pointer hover:text-slate-900">
          <span className="text-lg font-semibold text-slate-800">
            Todos
          </span>

          <ChevronDown className="w-5 h-5 text-slate-500" />
        </div>

        <div className="flex items-center gap-3">

          <span className="text-sm text-slate-400">
            Ordenar
          </span>

          <Select defaultValue="a-z">
            <SelectTrigger className="w-[100px] h-9">
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="a-z">
                A-Z
              </SelectItem>

              <SelectItem value="z-a">
                Z-A
              </SelectItem>
            </SelectContent>
          </Select>

        </div>

      </div>

      {/* Barra inferior */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">

        <div className="flex items-center gap-3">

          <div className="relative w-full max-w-md">

            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />

            <Input
              placeholder="Encuentra por nombre, apellido o email"
              className="pl-10 h-10 w-80"
            />

          </div>

          <Button
            variant="outline"
            className="gap-2"
          >
            <Filter className="w-4 h-4" />
            Filtrar
          </Button>

        </div>

        <Button
          onClick={onAdd}
          className="bg-blue-600 hover:bg-blue-700 text-white gap-2 px-5"
        >
          <Plus className="w-4 h-4" />
          Agregar Recepcionista
        </Button>

      </div>
    </>
  );
};

export default TableBar;