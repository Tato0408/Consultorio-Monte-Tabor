import { ArrowRight } from "lucide-react";

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
    <div className={`rounded-2xl border border-slate-100 bg-white p-6 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

// Tarjeta con cabecera: título y acción a la derecha.
export function SectionCard({ title, action, children, className = "" }) {
  return (
    <Card className={className}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-[15px] font-semibold text-slate-800">{title}</h3>
        {action}
      </div>
      {children}
    </Card>
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