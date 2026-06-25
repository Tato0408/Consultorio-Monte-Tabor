import React from "react";
import Modal from "@/components/ui/Modal"; // Ajusta la ruta de tu Modal global
import ProcedureForm from "./ProceduresForm";

const EditProcedureModal = ({ isOpen, onClose, procedureData, onUpdate, isSubmitting }) => {
  if (!isOpen || !procedureData) return null;

  return (
    <Modal
      title="Editar procedimiento"
      subtitle="Modifique la información del procedimiento médico seleccionado en el sistema."
      onClose={onClose}
      width="w-[600px]" // Un poco más ancho para que los campos dinámicos se acomoden perfectamente
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            form="edit-procedure-form" // Vincula el botón del footer al formulario nativo de HTML
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? "Actualizando..." : "Guardar cambios"}
          </button>
        </>
      }
    >
      {/* Incrustamos el ProcedureForm dentro del cuerpo scrollable del modal.
        Le inyectamos un id para que responda al botón de submit que se encuentra fuera en el footer.
      */}
      <div id="edit-procedure-form-container" className="pr-1">
        <div className="block-form-wrapper" id="edit-procedure-form">
          <ProcedureForm 
            initialData={procedureData} 
            onSubmit={(data) => onUpdate(procedureData._id, data)}
            isSubmitting={isSubmitting}
          />
        </div>
      </div>
    </Modal>
  );
};

export default EditProcedureModal;