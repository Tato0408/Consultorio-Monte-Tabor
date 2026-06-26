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
      width="w-[600px]"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          {/*
            form="edit-procedure-form" vincula este botón al <form> real.
            El id tiene que vivir en el elemento <form> del HTML, no en un div
            contenedor — ese era el bug que impedía que el submit funcionara.
          */}
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
        {/*
          El id "edit-procedure-form" se pasa como prop a ProcedureForm
          para que lo coloque directamente en el elemento <form>,
          que es el único lugar válido para que form="edit-procedure-form" funcione.
        */}
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