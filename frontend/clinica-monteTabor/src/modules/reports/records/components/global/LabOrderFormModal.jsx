import { useEffect, useState } from "react";
import { X, Loader2, FlaskConical } from "lucide-react";
import apiClient from "@/lib/apiClient";
import { showSuccess, showError } from "@/lib/alerts";
import { maskClinicalText } from "@/lib/inputMasks";
import {
  LAB_ORDER_CATALOG,
  testKey,
  countSelectedTests,
  PREGNANCY_OPTIONS,
  ANTIBIOTIC_OPTIONS,
} from "@/modules/schedule/consultations/lab/labOrderCatalog";

const OTHER_TESTS_MAX = 300;

// Modal para editar una orden de laboratorio ya finalizada, desde la
// pestaña de Documentos del expediente (PUT /lab-orders/:id). No existe
// variante de "crear": una orden solo nace dentro de una consulta (ver
// ResumenTab.jsx, botón Agregar que lleva al formulario de consulta).
// entry es la fila de patient.laboratorios (usePatientRecordDetail.js),
// con id y labOrder (el documento crudo).
const LabOrderFormModal = ({ isOpen, onClose, entry, onSaved }) => {
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const [pregnancy, setPregnancy] = useState("");
  const [antibioticTreatment, setAntibioticTreatment] = useState("");
  const [otherTests, setOtherTests] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    const labOrder = entry?.labOrder || {};
    setSelected(new Set(labOrder.tests || []));
    setPregnancy(labOrder.pregnancy || "");
    setAntibioticTreatment(labOrder.antibiotic_treatment || "");
    setOtherTests(labOrder.other_tests || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, entry?.id]);

  if (!isOpen) return null;

  const close = () => onClose();

  const toggleTest = (fullKey) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(fullKey)) next.delete(fullKey);
      else next.add(fullKey);
      return next;
    });
  };

  const togglePanel = (panel, allChecked) => {
    setSelected((prev) => {
      const next = new Set(prev);
      panel.tests.forEach((test) => {
        const fullKey = testKey(panel.key, test.key);
        if (allChecked) next.delete(fullKey);
        else next.add(fullKey);
      });
      return next;
    });
  };

  const selectedCount = countSelectedTests([...selected]);

  const handleSubmit = async () => {
    if (loading) return;
    if (selectedCount === 0 && !otherTests.trim()) {
      showError("Marca al menos un examen (o escribe algo en «Otros») antes de guardar.");
      return;
    }
    setLoading(true);
    try {
      await apiClient(`/lab-orders/${entry.id}`, {
        method: "PUT",
        body: {
          tests: [...selected],
          pregnancy,
          antibiotic_treatment: antibioticTreatment,
          other_tests: otherTests,
        },
      });
      showSuccess("Orden de laboratorio actualizada correctamente");
      onSaved?.();
      close();
    } catch (err) {
      showError(err.message || "Ocurrió un error al guardar la orden de laboratorio");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-4xl p-6 shadow-2xl relative my-auto max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={close}
          disabled={loading}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-40"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
            <FlaskConical className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-800">Editar orden de laboratorio</h2>
            <p className="text-xs text-slate-400">
              {selectedCount} {selectedCount === 1 ? "examen marcado" : "exámenes marcados"}
            </p>
          </div>
        </div>

        <fieldset disabled={loading} className="contents">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500">Embarazo</label>
              <select
                value={pregnancy}
                onChange={(e) => setPregnancy(e.target.value)}
                className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm"
              >
                {PREGNANCY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500">Tratamiento antibiótico</label>
              <select
                value={antibioticTreatment}
                onChange={(e) => setAntibioticTreatment(e.target.value)}
                className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm"
              >
                {ANTIBIOTIC_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[45vh] overflow-y-auto pr-1">
            {LAB_ORDER_CATALOG.map((panel) => {
              const checkedCount = panel.tests.filter((t) => selected.has(testKey(panel.key, t.key))).length;
              const allChecked = checkedCount === panel.tests.length;
              return (
                <div key={panel.key} className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-blue-600">{panel.title}</p>
                    <button
                      type="button"
                      onClick={() => togglePanel(panel, allChecked)}
                      className="text-[11px] text-slate-400 hover:text-blue-600"
                    >
                      {allChecked ? "Quitar todos" : "Marcar todos"}
                    </button>
                  </div>
                  <div className="space-y-1">
                    {panel.tests.map((test) => {
                      const fullKey = testKey(panel.key, test.key);
                      const checked = selected.has(fullKey);
                      return (
                        <label
                          key={test.key}
                          className="flex items-start gap-2 text-sm rounded-md px-1 py-0.5 cursor-pointer hover:bg-white"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleTest(fullKey)}
                            className="mt-0.5 accent-blue-600"
                          />
                          <span className={checked ? "text-slate-800 font-medium" : "text-slate-600"}>
                            {test.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4">
            <label className="text-xs font-semibold text-slate-500 block mb-1">Otros</label>
            <textarea
              rows={2}
              maxLength={OTHER_TESTS_MAX}
              value={otherTests}
              placeholder="Otros exámenes o indicaciones para el laboratorio"
              onChange={(e) => setOtherTests(maskClinicalText(e.target.value, OTHER_TESTS_MAX))}
              className="w-full border border-slate-200 rounded-lg p-2 text-sm"
            />
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Guardar cambios
          </button>
        </fieldset>
      </div>
    </div>
  );
};

export default LabOrderFormModal;
