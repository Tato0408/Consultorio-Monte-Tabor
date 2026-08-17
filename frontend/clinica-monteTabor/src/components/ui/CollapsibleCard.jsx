import { useState } from "react";
import { ChevronDown } from "lucide-react";

/*
 * Card con encabezado clickeable que despliega u oculta su contenido, con el mismo mecanismo
 * de animación (grid-template-rows) que ReportsSection.jsx, pero como componente reutilizable
 * para cualquier lista de cards apiladas (ej. InventoryAlerts.jsx).
 *
 * className es opcional y sirve para casos como InventoryAlertsRow.jsx, donde dos cards
 * viven en la misma fila de un grid y conviene que se estiren a la misma altura (h-full). No
 * se aplica por defecto porque en otros usos (ej. QuickActionsCard dentro de una columna flex
 * ya estirada por una tabla larga) "h-full" la hacía intentar llenar el 100% de esa columna
 * gigante, aplastando a las cards vecinas que comparten ese mismo contenedor flex.
 *
 * subtitle y actions son opcionales, para cards que además de un título llevan una
 * descripción (ej. secciones de Horarios) o un botón de acción propio (ej. "Agregar
 * descanso") que debe seguir siendo clickeable sin activar el toggle.
 *
 * El disparador del toggle es un <div role="button"> y no un <button>, porque estas cards se
 * usan dentro de <fieldset disabled> en Horarios (ver ScheduleConfig.jsx) para bloquear la
 * edición mientras la página está en modo de solo lectura. Un <button> real quedaría
 * deshabilitado por ese fieldset y el usuario no podría ni expandir ni colapsar la card para
 * verla, que es una acción puramente visual, no de edición.
 */
const CollapsibleCard = ({ title, subtitle, actions, defaultOpen = true, children, className = "" }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const toggle = () => setIsOpen((p) => !p);
  const onToggleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggle();
    }
  };

  return (
    <div className={`bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden flex flex-col ${className}`}>
      {/* items-start (no items-center): así el chevron y las actions quedan a la misma
          altura en todas las cards, sin importar si el subtítulo de cada una ocupa una o dos
          líneas. Centrarlos verticalmente los bajaba más en las cards con subtítulo largo. */}
      <div className="w-full flex items-start gap-3 px-5 py-4">
        <div
          role="button"
          tabIndex={0}
          onClick={toggle}
          onKeyDown={onToggleKeyDown}
          className="flex-1 min-w-0 text-left cursor-pointer select-none"
        >
          <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>

        {actions}

        <div
          role="button"
          tabIndex={0}
          onClick={toggle}
          onKeyDown={onToggleKeyDown}
          className="p-1 -m-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 cursor-pointer flex-shrink-0 transition-colors"
        >
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-300 ease-out ${isOpen ? "rotate-180" : ""}`}
          />
        </div>
      </div>

      <div
        className="grid transition-[grid-template-rows] duration-300 ease-out"
        style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden min-h-0">
          <div
            className={`px-5 pb-5 transition-opacity duration-200 ease-out ${
              isOpen ? "opacity-100 delay-100" : "opacity-0"
            }`}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollapsibleCard;
