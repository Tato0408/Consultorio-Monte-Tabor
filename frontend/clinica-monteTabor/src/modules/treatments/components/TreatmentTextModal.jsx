import { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { showSuccess, showError } from "@/lib/alerts";

// Modal generico de un textarea con boton guardar, reutilizado por los
// botones "Actualizar evolución" y "Agregar nota" del panel de tratamiento.
// Ambos son texto libre: solo cambian el titulo, el icono, el placeholder y
// que endpoint se llama al guardar (eso lo decide quien use este modal a
// traves de onSubmit, que solo debe hacer la llamada a la API).
const TreatmentTextModal = ({ isOpen, onClose, icon: Icon, iconBg, title, placeholder, initialValue = "", submitLabel, successMessage, onSubmit }) => {
  const [value, setValue] = useState(initialValue);
  const [loading, setLoading] = useState(false);

  // El componente se queda montado entre aperturas (el padre solo cambia
  // "isOpen"), asi que sin esto el textarea conservaria lo que quedo escrito
  // la ultima vez, en vez de partir del valor actual del paciente cada vez
  // que se vuelve a abrir.
  useEffect(() => {
    if (isOpen) setValue(initialValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const close = () => {
    if (loading) return;
    onClose();
  };

  const handleSubmit = async () => {
    if (loading || !value.trim()) return;
    setLoading(true);
    try {
      await onSubmit(value.trim());
      showSuccess(successMessage);
      close();
    } catch (err) {
      showError(err.message || "No se pudo guardar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl relative my-auto max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={close}
          disabled={loading}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}>
            <Icon className="h-5 w-5" />
          </div>
          <h2 className="text-base font-semibold text-slate-800">{title}</h2>
        </div>

        <fieldset disabled={loading} className="contents">
          <textarea
            rows={5}
            autoFocus
            maxLength={1000}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors resize-none"
          />
          <p className="text-[11px] text-slate-400 text-right mt-1">{value.length}/1000</p>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!value.trim()}
            className="mt-5 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {submitLabel}
          </button>
        </fieldset>
      </div>
    </div>
  );
};

export default TreatmentTextModal;
