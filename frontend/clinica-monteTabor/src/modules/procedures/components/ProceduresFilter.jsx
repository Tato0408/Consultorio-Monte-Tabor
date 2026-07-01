import React from "react";
import { useForm, Controller } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Filter } from "lucide-react";

const ProceduresFilters = ({ onFilterChange }) => {
  const { register, control, handleSubmit } = useForm({
    defaultValues: { search: "", requiresNurse: "all", sort: "a-z" },
  });

  const onSubmit = (data) => {
    if (onFilterChange) onFilterChange(data);
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col md:flex-row items-end md:items-center justify-between gap-3 pb-4"
    >
      <div className="w-full md:max-w-md">
        <Input
          {...register("search")}
          type="text"
          placeholder="Encuentra por nombre, apellido o email"
          className="w-full h-9"
        />
      </div>

      <div className="flex flex-wrap items-end gap-3 w-full md:w-auto">

        <div className="flex flex-col gap-1 flex-1 md:flex-none min-w-[130px]">
          <span className="text-[11px] text-gray-500 font-medium">¿Requiere enfermera?</span>
          <Controller
            name="requiresNurse"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="h-9 w-full md:min-w-[120px]">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent sideOffset={6}>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="yes">Sí</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <button
          type="submit"
          className="flex items-center gap-2 h-9 px-3 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors mt-auto"
        >
          Filtrar
          <Filter className="w-4 h-4 text-gray-400" />
        </button>

        <div className="flex flex-col gap-1 flex-1 md:flex-none min-w-[110px]">
          <span className="text-[11px] text-gray-500 font-medium">Ordenar</span>
          <Controller
            name="sort"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="h-9 w-full md:min-w-[100px]">
                  <SelectValue placeholder="A-Z" />
                </SelectTrigger>
                <SelectContent sideOffset={6}>
                  <SelectItem value="a-z">A-Z</SelectItem>
                  <SelectItem value="z-a">Z-A</SelectItem>
                  <SelectItem value="price-asc">Precio más bajo</SelectItem>
                  <SelectItem value="price-desc">Precio más alto</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>
    </form>
  );
};

export default ProceduresFilters;