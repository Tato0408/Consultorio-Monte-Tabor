import { useState } from "react";
import { X, Loader2, Info } from "lucide-react";
import apiClient from "@/lib/apiClient";
import { showSuccess, showError } from "@/lib/alerts";

// Modal genérico y compacto para agregar UN antecedente hereditario o patológico — mismo tamaño
// que IncapacidadFormModal/ProcedureModal (2 campos, sin scroll). `bodyKey` es "new_hereditary" o
// "new_pathological" (lo que ya acepta PUT /patients/:id), `fields` = [{key,label}] de ese tipo.
const AntecedentFormModal = ({ isOpen, onClose, patientId, title, bodyKey, fields, onSaved }) => {
  const emptyValues = Object.fromEntries(fields.map((f) => [f.key, ""]));
  const [values, setValues] = useState(emptyValues);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const close = () => {
    if (loading) return;
    setValues(emptyValues);
    onClose();
  };

  const handleSave = async () => {
    if (loading) return;
    const hasSomething = fields.some((f) => values[f.key]?.trim());
    if (!hasSomething) return;
    setLoading(true);
    try {
      await apiClient(`/patients/${patientId}`, {
        method: "PUT",
        body: { [bodyKey]: values },
      });
      showSuccess("Antecedente registrado correctamente");
      onSaved?.();
      close();
    } catch (err) {
      showError(err.message || "No se pudo registrar el antecedente");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl relative">
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
            <Info className="h-5 w-5" />
          </div>
          <h2 className="text-base font-semibold text-slate-800">{title}</h2>
        </div>

        <fieldset disabled={loading} className="contents">
          <div className="flex flex-col gap-3">
            {fields.map((f) => (
              <div key={f.key} className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500">{f.label}</label>
                <input
                  type="text"
                  value={values[f.key]}
                  onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            ))}
          </div>

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

export default AntecedentFormModal;
