import { X } from "lucide-react";
import { createPortal } from "react-dom";

/**
 * Modal lateral (drawer) que se abre desde la derecha.
 * Props:
 * title: título mostrado en el header.
 * subtitle: texto pequeño bajo el título (opcional).
 * onClose: función que se invoca al cerrar el modal.
 * children: contenido del modal (formulario, etc.).
 * width: clase de tailwind para el ancho (por defecto "w-[520px]").
 * footer: nodo React con los botones de acción (opcional, queda fijo al fondo).
 * closeDisabled: true mientras el formulario interno está enviando una
 * petición. Bloquea tanto el botón de cerrar como el clic en el fondo,
 * para que no se pueda cerrar el modal y perder el estado, o disparar
 * otra petición, a medio envío.
 */
const Modal = ({ title, subtitle, onClose, children, footer, width = "w-[520px]", closeDisabled = false }) => {
  const handleClose = () => {
    if (closeDisabled) return;
    onClose?.();
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />

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
            onClick={handleClose}
            disabled={closeDisabled}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
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
};

export default Modal;
