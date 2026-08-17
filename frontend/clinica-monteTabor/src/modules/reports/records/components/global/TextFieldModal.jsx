import { useState } from "react";
import { X, Loader2, NotebookText } from "lucide-react";
import apiClient from "@/lib/apiClient";
import { showSuccess, showError } from "@/lib/alerts";

// Modal minúsculo para editar un solo campo de texto libre del
// expediente (por ejemplo, antecedentes no patológicos, que en
// Patients.clinical_history es un único string, no una lista). Usa un
// textarea, sin scroll vertical adicional. La prop bodyKey es el nombre
// del campo que espera el PUT del paciente (por ejemplo,
// non_pathological).
const TextFieldModal = ({ isOpen, onClose, patientId, title, bodyKey, currentValue, onSaved }) => {
  const [value, setValue] = useState(currentValue || "");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const close = () => {
    if (loading) return;
    onClose();
  };

  const handleSave = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await apiClient(`/patients/${patientId}`, {
        method: "PUT",
        body: { [bodyKey]: value },
      });
      showSuccess("Guardado correctamente");
      onSaved?.();
      close();
    } catch (err) {
      showError(err.message || "No se pudo guardar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
        <button
          type="button"
          onClick={close}
          disabled={loading}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <NotebookText className="h-5 w-5" />
          </div>
          <h2 className="text-base font-semibold text-slate-800">{title}</h2>
        </div>

        <fieldset disabled={loading} className="contents">
          <textarea
            rows={5}
            maxLength={1000}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Escribe aquí..."
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors resize-none"
          />
          <p className="text-[11px] text-slate-400 text-right mt-1">{value.length}/1000</p>

          <button
            type="button"
            onClick={handleSave}
            className="mt-5 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Guardar
          </button>
        </fieldset>
      </div>
    </div>
  );
};

export default TextFieldModal;
