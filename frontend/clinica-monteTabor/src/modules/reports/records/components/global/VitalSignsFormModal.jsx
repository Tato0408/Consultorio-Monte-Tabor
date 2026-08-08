import { useState } from "react";
import { X, Loader2, HeartPulse } from "lucide-react";
import apiClient from "@/lib/apiClient";
import { showSuccess, showError } from "@/lib/alerts";

const EMPTY = { blood_pressure: "", glucose: "", weight: "", height: "", temperature: "", oxygen_saturation: "" };

// Máscara de presión arterial: solo dígitos y una "/", tope de 3 dígitos por lado — mismo
// criterio que TriageCard.jsx (la misma acción, ver comentario en RecordsHistoricalClinical.jsx
// y RecordsVitalSigns.jsx: este modal es compartido entre esos dos botones).
const maskBloodPressure = (raw) => {
  const cleaned = raw.replace(/[^0-9/]/g, "");
  const [systolicRaw, ...rest] = cleaned.split("/");
  const systolic = systolicRaw.slice(0, 3);
  return rest.length > 0 ? `${systolic}/${rest.join("").slice(0, 3)}` : systolic;
};

// Máscara numérica: solo dígitos y un único punto decimal.
const maskDecimal = (raw) => {
  const cleaned = raw.replace(/[^0-9.]/g, "");
  const firstDot = cleaned.indexOf(".");
  return firstDot === -1 ? cleaned : cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, "");
};

// Modal compacto para registrar una toma de signos vitales — comparte esta única forma el botón
// "Actualizar" de Historia Clínica y el botón "Agregar" de Signos Vitales, ya que ambos piden
// exactamente lo mismo (ver análisis de la interfaz del Expediente). Guarda con PUT /patients/:id
// (new_vital_signs), que ya existe y ya soporta esto — no hizo falta backend nuevo.
const VitalSignsFormModal = ({ isOpen, onClose, patientId, onSaved }) => {
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const close = () => {
    if (loading) return;
    setForm(EMPTY);
    onClose();
  };

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const weight = form.weight ? Number(form.weight) : undefined;
      // Se captura en cm (más natural para digitar) y se convierte a metros, que es la unidad
      // que usa el resto del expediente (ver useRecords.js: `${height} m`).
      const heightM = form.height ? Number(form.height) / 100 : undefined;
      const imc = weight && heightM ? Math.round((weight / (heightM * heightM)) * 10) / 10 : undefined;

      await apiClient(`/patients/${patientId}`, {
        method: "PUT",
        body: {
          new_vital_signs: {
            blood_pressure: form.blood_pressure || undefined,
            glucosa_mgdl: form.glucose ? Number(form.glucose) : undefined,
            weight,
            height: heightM,
            imc,
            temperature: form.temperature ? Number(form.temperature) : undefined,
            spo2: form.oxygen_saturation ? Number(form.oxygen_saturation) : undefined,
            last_date_taken: new Date().toISOString(),
          },
        },
      });
      showSuccess("Signos vitales registrados correctamente");
      onSaved?.();
      close();
    } catch (err) {
      showError(err.message || "No se pudieron registrar los signos vitales");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors";

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
            <HeartPulse className="h-5 w-5" />
          </div>
          <h2 className="text-base font-semibold text-slate-800">Registrar signos vitales</h2>
        </div>

        <fieldset disabled={loading} className="contents">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500">Presión arterial</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="120/80"
                value={form.blood_pressure}
                onChange={(e) => set("blood_pressure", maskBloodPressure(e.target.value))}
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500">Glucosa (mg/dL)</label>
              <input
                type="text"
                inputMode="decimal"
                value={form.glucose}
                onChange={(e) => set("glucose", maskDecimal(e.target.value))}
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500">Peso (kg)</label>
              <input
                type="text"
                inputMode="decimal"
                value={form.weight}
                onChange={(e) => set("weight", maskDecimal(e.target.value))}
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500">Talla (cm)</label>
              <input
                type="text"
                inputMode="decimal"
                value={form.height}
                onChange={(e) => set("height", maskDecimal(e.target.value))}
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500">Temperatura (°C)</label>
              <input
                type="text"
                inputMode="decimal"
                value={form.temperature}
                onChange={(e) => set("temperature", maskDecimal(e.target.value))}
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500">Saturación O2 (%)</label>
              <input
                type="text"
                inputMode="decimal"
                value={form.oxygen_saturation}
                onChange={(e) => set("oxygen_saturation", maskDecimal(e.target.value))}
                className={inputClass}
              />
            </div>
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

export default VitalSignsFormModal;
