import { useState, useEffect } from "react";
import { X, Loader2, CalendarPlus } from "lucide-react";
import { showSuccess, showError } from "@/lib/alerts";

// Modal del botón "Programar control" — elige/reprograma la fecha del próximo control del
// tratamiento actual. Es la única acción que mueve a un paciente entre "En tratamiento" y
// "Requiere revisión" (ver treatmentsController.getFollowUp): con fecha futura queda activo, si
// se deja vencer sin reprogramar pasa a requerir revisión.
const ScheduleControlModal = ({ isOpen, onClose, initialValue = "", onSubmit }) => {
  const [date, setDate] = useState(initialValue);
  const [loading, setLoading] = useState(false);

  // El componente se queda montado entre aperturas (el padre solo cambia "isOpen"); sin esto la
  // fecha elegida la última vez se quedaría pegada en vez de partir del control actual del
  // paciente cada vez que se abre de nuevo.
  useEffect(() => {
    if (isOpen) setDate(initialValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const close = () => {
    if (loading) return;
    onClose();
  };

  const handleSubmit = async () => {
    if (loading || !date) return;
    setLoading(true);
    try {
      await onSubmit(date);
      showSuccess("Control programado");
      close();
    } catch (err) {
      showError(err.message || "No se pudo programar el control");
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
            <CalendarPlus className="h-5 w-5" />
          </div>
          <h2 className="text-base font-semibold text-slate-800">Programar control</h2>
        </div>

        <fieldset disabled={loading} className="contents">
          <label className="text-xs font-semibold text-slate-500 block mb-1.5">Fecha del próximo control</label>
          <input
            type="date"
            autoFocus
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
          />

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!date}
            className="mt-5 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Guardar control
          </button>
        </fieldset>
      </div>
    </div>
  );
};

export default ScheduleControlModal;
