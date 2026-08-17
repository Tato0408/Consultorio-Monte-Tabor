import React from "react";
import Modal from "@/components/ui/Modal";
import ProcedureForm from "./ProceduresForm";

const EditProcedureModal = ({ isOpen, onClose, procedureData, onUpdate, isSubmitting }) => {
  if (!isOpen || !procedureData) return null;

  return (
    <Modal
      title="Editar procedimiento"
      subtitle="Modifique la información del procedimiento médico seleccionado en el sistema."
      onClose={onClose}
      width="w-full md:w-[600px]"
      closeDisabled={isSubmitting}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-semibold border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
          <button
            form="edit-procedure-form"
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? "Actualizando..." : "Guardar cambios"}
          </button>
        </>
      }
    >
      <div className="pr-1">
        <ProcedureForm
          formId="edit-procedure-form"
          initialData={procedureData}
          onSubmit={(data) => onUpdate(procedureData._id, data)}
          isSubmitting={isSubmitting}
        />
      </div>
    </Modal>
  );
};

export default EditProcedureModal;