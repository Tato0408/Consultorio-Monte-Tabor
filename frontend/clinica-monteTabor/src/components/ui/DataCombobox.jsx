import { Combobox, ComboboxContent, ComboboxItem, ComboboxTrigger } from "@/components/ui/combobox";
import { cn } from "@/lib/utils";

// Selector de datos con buscador integrado: un <select> que además filtra la lista al
// escribir. Reemplaza a los <select>/SelectField que eligen una entidad de una lista
// traída de la base de datos (paciente, doctor, enfermera, procedimiento, insumo...).
// Misma API que los SelectField locales del sistema para que la migración sea mecánica:
//
//   <DataCombobox label="Paciente" value={id} onChange={setId}
//                 options={[{ value, label }]} placeholder="..." disabled error="..." />
//
// El value es el id crudo (string), igual que guardaban los <select>. Envuelve el
// Combobox base (components/ui/combobox.jsx).
const SIZES = {
  default: "h-[42px] text-sm",
  sm: "h-[34px] text-xs",
};

const DataCombobox = ({
  label,
  value,
  onChange,
  options = [],
  placeholder = "Seleccione una opción",
  disabled = false,
  error,
  size = "default",
  className = "",
  labelClassName = "text-xs font-semibold text-slate-500 uppercase tracking-wider",
  triggerClassName = "",
}) => (
  <div className={cn("flex flex-col gap-1.5", className)}>
    {label && <label className={labelClassName}>{label}</label>}
    <Combobox value={value ?? ""} onValueChange={(v) => onChange(v ?? "")} disabled={disabled}>
      {/* size="lg" en el trigger: desactiva el alto compacto por defecto del combobox para
          que lo fije la clase de SIZES y así igualar a los <select> del sistema. */}
      <ComboboxTrigger
        size="lg"
        placeholder={placeholder}
        className={cn(
          "min-w-0 rounded-xl bg-white px-3",
          SIZES[size] || SIZES.default,
          error
            ? "border-red-300 focus-within:border-red-400 focus-within:ring-red-100"
            : "border-slate-200 focus-within:border-blue-400 focus-within:ring-blue-100",
          triggerClassName,
        )}
      />
      <ComboboxContent className="max-h-72">
        {options.map((o) => (
          <ComboboxItem key={o.value} value={o.value}>
            {o.label}
          </ComboboxItem>
        ))}
      </ComboboxContent>
    </Combobox>
    {error && <span className="text-[11px] text-red-500 font-medium px-1">{error}</span>}
  </div>
);

export default DataCombobox;
