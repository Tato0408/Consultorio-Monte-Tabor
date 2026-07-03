import { X } from "lucide-react";
import { createPortal } from "react-dom";

/**
 * Modal lateral (drawer) que se abre desde la derecha.
 * Props:
 *   title    — título en el header
 *   subtitle — texto pequeño bajo el título (opcional)
 *   onClose  — función para cerrar
 *   children — contenido (formulario, etc.)
 *   width    — clase tailwind de ancho (default "w-[520px]")
 *   footer   — nodo React para los botones de acción (opcional, sticky al fondo)
 */
const Modal = ({ title, subtitle, onClose, children, footer, width = "w-[520px]" }) =>
  createPortal(
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Panel lateral derecho */}
      <div
        className={`
          relative bg-white ${width} max-w-full
          h-full flex flex-col shadow-2xl
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{title}</h2>
            {subtitle && (
              <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Contenido scrollable */}
        <div className="overflow-y-auto flex-1 px-6 py-5">
          {children}
        </div>

        {/* Footer sticky */}
        {footer && (
          <div className="shrink-0 px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3 bg-white">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );

export default Modal;
