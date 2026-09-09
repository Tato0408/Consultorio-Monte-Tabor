import { useState, useEffect } from "react";
import { X, Loader2, FileEdit } from "lucide-react";
import { showSuccess, showError } from "@/lib/alerts";
import { maskClinicalText, maskDigitsOnly } from "@/lib/inputMasks";

const OBJECTIVE_MAX = 300;
const PLAN_MAX = 500;
// Dos años hacia adelante como tope de la fecha estimada de finalización,
// mismo criterio que la "próxima cita sugerida" del formulario de consulta.
const maxEndDate = () => `${new Date().getFullYear() + 2}-12-31`;
const todayISO = () => new Date().toISOString().split("T")[0];

// Modal para editar la definición del plan de tratamiento: objetivo,
// descripción del plan, número de sesiones y fecha estimada de alta. Cada
// guardado deja una entrada "cambio_plan" en la línea de tiempo (lo hace
// el backend). initial trae los valores actuales del tratamiento.
const EditPlanModal = ({ isOpen, onClose, initial, onSubmit }) => {
  const [objective, setObjective] = useState("");
  const [plan, setPlan] = useState("");
  const [sessions, setSessions] = useState("");
  const [end_date, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setObjective(initial?.objective || "");
      setPlan(initial?.plan_description || "");
      setSessions(initial?.total_sessions ? String(initial.total_sessions) : "");
      setEndDate(initial?.estimated_end_date_iso || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const close = () => {
    if (loading) return;
    onClose();
  };

  const handleSubmit = async () => {
    if (loading || !objective.trim() || !plan.trim()) return;
    const session_count = sessions ? Number(sessions) : null;
    if (session_count !== null && (session_count < 1 || session_count > 365)) {
      showError("El número de sesiones debe estar entre 1 y 365.");
      return;
    }
    setLoading(true);
    try {
      await onSubmit({
        objective: objective.trim(),
        plan_description: plan.trim(),
        total_sessions: session_count,
        estimated_end_date: end_date || null,
      });
      showSuccess("Plan actualizado");
      close();
    } catch (err) {
      showError(err.message || "No se pudo actualizar el plan");
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
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-40"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <FileEdit className="h-5 w-5" />
          </div>
          <h2 className="text-base font-semibold text-slate-800">Editar el plan</h2>
        </div>

        <fieldset disabled={loading} className="contents">
          <label className="text-xs font-semibold text-slate-500 block mb-1.5">Objetivo</label>
          <textarea
            rows={2}
            maxLength={OBJECTIVE_MAX}
            value={objective}
            onChange={(e) => setObjective(maskClinicalText(e.target.value, OBJECTIVE_MAX))}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 resize-none"
          />
          <p className="text-[11px] text-slate-400 text-right mt-1 mb-3">{objective.length}/{OBJECTIVE_MAX}</p>

          <label className="text-xs font-semibold text-slate-500 block mb-1.5">Plan</label>
          <textarea
            rows={3}
            maxLength={PLAN_MAX}
            value={plan}
            onChange={(e) => setPlan(maskClinicalText(e.target.value, PLAN_MAX))}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 resize-none"
          />
          <p className="text-[11px] text-slate-400 text-right mt-1 mb-3">{plan.length}/{PLAN_MAX}</p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1.5">N.º de sesiones</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={3}
                placeholder="Ej. 10"
                value={sessions}
                onChange={(e) => setSessions(maskDigitsOnly(e.target.value, 3))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1.5">Fecha estimada de finalización</label>
              <input
                type="date"
                min={todayISO()}
                max={maxEndDate()}
                value={end_date}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!objective.trim() || !plan.trim()}
            className="mt-5 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Guardar cambios
          </button>
        </fieldset>
      </div>
    </div>
  );
};

export default EditPlanModal;
