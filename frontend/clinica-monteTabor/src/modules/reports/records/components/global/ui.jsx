import { useState } from "react";
import { ArrowRight, ChevronDown } from "lucide-react";

// Etiqueta de estado (ACTIVO, NORMAL, PENDIENTE, etc.).
export function Badge({ children, tone = "gray", className = "" }) {
  const tones = {
    green: "bg-emerald-100 text-emerald-700",
    red: "bg-red-100 text-red-500",
    blue: "bg-blue-50 text-blue-600",
    gray: "bg-slate-100 text-slate-500",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
        tones[tone] || tones.gray
      } ${className}`}
    >
      {children}
    </span>
  );
}

// Enlace Ver todos que aparece en la cabecera de cada tarjeta.
export function VerTodos({ children = "Ver todos", onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
    >
      {children}
      <ArrowRight className="h-3 w-3" />
    </button>
  );
}

// Tarjeta base.
export function Card({ children, className = "" }) {
  return (
    <div className={`rounded-2xl border border-slate-100 bg-white p-4 sm:p-6 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

// Tarjeta con cabecera: título y acción a la derecha. La cabecera envuelve
// en pantallas angostas (flex-wrap) para que la acción nunca se salga del
// borde de la tarjeta cuando no cabe junto al título.
// Con collapsible el título se vuelve un disparador que abre y cierra el
// contenido, con la misma animación de grid-template-rows que usa
// CollapsibleCard (ver el resumen del expediente y las cards de inventario).
export function SectionCard({
  title,
  action,
  children,
  className = "",
  collapsible = false,
  defaultOpen = true,
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const toggle = () => setIsOpen((prev) => !prev);
  const onToggleKeyDown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggle();
    }
  };

  if (!collapsible) {
    return (
      <Card className={className}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <h3 className="text-[15px] font-semibold text-slate-800">{title}</h3>
          {action}
        </div>
        {children}
      </Card>
    );
  }

  // El contenedor NO reutiliza <Card> a propósito: necesita overflow-hidden y
  // flex flex-col para que la animación de grid-template-rows funcione aunque
  // la tarjeta viva en una cuadrícula (ver CollapsibleCard). El padding va en
  // cada sección, no en la raíz, para que la zona colapsable llegue a 0 real.
  return (
    <div
      className={`flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 p-4 sm:px-6 sm:pt-6 sm:pb-4">
        <div
          role="button"
          tabIndex={0}
          onClick={toggle}
          onKeyDown={onToggleKeyDown}
          className="flex flex-1 min-w-0 items-center gap-2 cursor-pointer select-none"
        >
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-300 ease-out ${
              isOpen ? "rotate-180" : ""
            }`}
          />
          <h3 className="text-[15px] font-semibold text-slate-800">{title}</h3>
        </div>
        {action}
      </div>
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-out"
        style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden min-h-0">
          <div
            className={`px-4 pb-4 sm:px-6 sm:pb-6 transition-opacity duration-200 ease-out ${
              isOpen ? "opacity-100 delay-100" : "opacity-0"
            }`}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export const initials = (name = "") =>
  name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();