import { useState, useEffect } from "react";
import { X, Loader2, Archive } from "lucide-react";
import { showSuccess, showError } from "@/lib/alerts";
import { maskClinicalText } from "@/lib/inputMasks";

const NOTE_MAX = 1000;

// Motivos de cierre de un tratamiento. El valor viaja al backend como
// closed_reason; se distingue el alta médica del abandono y la derivación
// para poder medir cada caso por separado.
const close_options = [
  { key: "finalizado", title: "Tratamiento finalizado", desc: "El paciente completó el tratamiento (alta médica)" },
  { key: "abandono", title: "Abandono", desc: "El paciente dejó de asistir a sus controles" },
  { key: "derivacion", title: "Derivación", desc: "Se remitió a otro especialista u hospital" },
  { key: "otro", title: "Otro motivo", desc: "Especificar en la nota de cierre" },
];

// Modal para cerrar un tratamiento. Pide el motivo y una nota de cierre
// obligatoria. initialReason permite abrirlo con un motivo preseleccionado
// (por ejemplo desde el botón "Derivar").
const CloseTreatmentModal = ({ isOpen, onClose, patientName, initialReason = "finalizado", onSubmit }) => {
  const [reason, setReason] = useState(initialReason);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  // El componente se queda montado entre aperturas, así que se reinicia el
  // formulario cada vez que se vuelve a abrir.
  useEffect(() => {
    if (isOpen) {
      setReason(initialReason);
      setNote("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const close = () => {
    if (loading) return;
    onClose();
  };

  const handleSubmit = async () => {
    if (loading || !note.trim()) return;
    setLoading(true);
    try {
      await onSubmit({ status: "cerrado", closed_reason: reason, closure_note: note.trim() });
      showSuccess("Tratamiento cerrado");
      close();
    } catch (err) {
      showError(err.message || "No se pudo cerrar el tratamiento");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl relative my-auto max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={close}
          disabled={loading}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-40"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
            <Archive className="h-5 w-5" />
          </div>
          <h2 className="text-base font-semibold text-slate-800">Cerrar el tratamiento de {patientName}</h2>
        </div>
        <p className="text-xs text-slate-400 mb-4 ml-[52px]">El motivo queda registrado en la línea de tiempo.</p>

        <fieldset disabled={loading} className="contents">
          <div className="flex flex-col gap-2">
            {close_options.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setReason(opt.key)}
                className={`flex gap-3 items-start p-3 rounded-xl border text-left transition-colors ${
                  reason === opt.key ? "border-blue-500 bg-blue-50/60" : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full flex-shrink-0 mt-0.5 border-[5px] ${
                    reason === opt.key ? "border-blue-600" : "border-slate-300"
                  }`}
                />
                <span>
                  <span className="block text-sm font-semibold text-slate-800">{opt.title}</span>
                  <span className="block text-xs text-slate-500">{opt.desc}</span>
                </span>
              </button>
            ))}
          </div>

          <label className="text-xs font-semibold text-slate-500 block mt-4 mb-1.5">Nota de cierre</label>
          <textarea
            rows={4}
            maxLength={NOTE_MAX}
            value={note}
            onChange={(e) => setNote(maskClinicalText(e.target.value, NOTE_MAX))}
            placeholder="Describe el estado final del paciente y las indicaciones de egreso..."
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 resize-none"
          />
          <p className="text-[11px] text-slate-400 text-right mt-1">{note.length}/{NOTE_MAX}</p>

          <div className="flex justify-end gap-2.5 mt-4">
            <button
              type="button"
              onClick={close}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!note.trim()}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-60"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Cerrar tratamiento
            </button>
          </div>
        </fieldset>
      </div>
    </div>
  );
};

export default CloseTreatmentModal;
