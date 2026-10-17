import { useState, useEffect, useMemo } from "react";
import { X, Loader2, HeartPulse } from "lucide-react";
import apiClient from "@/lib/apiClient";
import { showSuccess, showError } from "@/lib/alerts";

const EMPTY = { blood_pressure: "", glucose: "", weight: "", height: "", temperature: "", oxygen_saturation: "" };

// Máscara de presión arterial: permite solo dígitos y una barra diagonal,
// con un tope de 3 dígitos por lado, mismo criterio que usa TriageCard.jsx.
// Este modal es compartido entre el botón de Historia clínica y el de
// Signos vitales, y también entre los modos de agregar y editar.
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

// Mismo formato que exige TriageCard.jsx para la presión arterial de una consulta.
const BP_PATTERN = /^\d{2,3}\/\d{2,3}$/;

// Mismos rangos fisiológicos razonables que usa TriageCard.jsx, que el
// backend también exige en validators.js, en la función
// getVitalSignsError. Evitan valores absurdos (por ejemplo, un SPO2 de
// 300%) sin bloquear casos clínicos extremos reales. La talla se valida
// en centímetros aquí, que es lo que digita el usuario. El backend valida
// la misma talla ya convertida a metros.
const RANGES = {
  glucose: { min: 0, max: 999, label: "Glucosa" },
  weight: { min: 0, max: 500, label: "Peso" },
  height: { min: 0, max: 300, label: "Talla" },
  temperature: { min: 30, max: 45, label: "Temperatura" },
  oxygen_saturation: { min: 0, max: 100, label: "Saturación de O2" },
};

// Devuelve un mensaje de error por campo, no uno solo genérico, mismo
// criterio que usa TriageCard.jsx, que muestra el mínimo y el máximo
// permitido justo debajo del input que falló, en vez de un aviso suelto
// al final del formulario.
const getFieldErrors = (form) => {
  const errors = {};
  if (form.blood_pressure && !BP_PATTERN.test(form.blood_pressure)) {
    errors.blood_pressure = "Formato inválido, debe ser sistólica/diastólica (ej. 120/80)";
  }
  for (const [key, range] of Object.entries(RANGES)) {
    const value = form[key];
    if (!value) continue;
    const num = Number(value);
    if (num < range.min || num > range.max) {
      errors[key] = `Debe estar entre ${range.min} y ${range.max}`;
    }
  }
  return errors;
};

// Devuelve un error por cada campo vacío o con un número inválido (por
// ejemplo un punto suelto, que la máscara permite al escribir decimales).
// Todos los campos son obligatorios: una toma con campos en blanco aparecía
// vacía en la gráfica y en la tabla del expediente.
const getMissingErrors = (form) => {
  const errors = {};
  for (const key of Object.keys(EMPTY)) {
    const value = String(form[key] ?? "").trim();
    if (!value) errors[key] = "Requerido";
    else if (key !== "blood_pressure" && Number.isNaN(Number(value))) errors[key] = "Número inválido";
  }
  return errors;
};

// Modal compacto para registrar o editar una toma de signos vitales.
// Comparte esta misma forma el botón Actualizar de Historia clínica, el
// botón Agregar de Signos vitales y el botón de editar de la tabla de
// Signos vitales (pasando la prop editEntry).
// Sin editEntry agrega una toma nueva (PUT a patients por id, con
// new_vital_signs). Con editEntry (la fila ya formateada por useRecords.js,
// con id, presion, glucosa, peso, altura, temp y spo2) edita esa toma
// puntual (PUT a la ruta de vital signs del paciente).
const VitalSignsFormModal = ({ isOpen, onClose, patientId, onSaved, editEntry }) => {
  const [form, setForm] = useState(EMPTY);
  // Error general (por ejemplo, cuando no se completó ningún campo, o lo
  // que rechace el backend). No apunta a un input puntual, así que se
  // muestra aparte de los errores por campo.
  const [generalError, setGeneralError] = useState(null);
  const [loading, setLoading] = useState(false);
  // Se activa al intentar guardar, para mostrar "Requerido" en los campos
  // vacíos solo desde ese momento y no al abrir el formulario.
  const [submitted, setSubmitted] = useState(false);

  // Se recalcula con cada tecla, no solo al enviar, para que el label rojo
  // aparezca o desaparezca al instante debajo del input que corresponde,
  // igual que en TriageCard.jsx.
  const fieldErrors = useMemo(
    () => ({ ...(submitted ? getMissingErrors(form) : {}), ...getFieldErrors(form) }),
    [form, submitted]
  );
  const hasFieldErrors = Object.keys(fieldErrors).length > 0;

  // El componente se queda montado entre aperturas, el padre solo cambia
  // isOpen, así que sin este efecto el formulario conservaría lo último
  // escrito o no se precargaría con la toma a editar.
  useEffect(() => {
    if (!isOpen) return;
    setGeneralError(null);
    setSubmitted(false);
    if (editEntry) {
      setForm({
        blood_pressure: editEntry.presion !== "—" ? String(editEntry.presion) : "",
        glucose: editEntry.glucosa !== "—" ? String(editEntry.glucosa) : "",
        weight: editEntry.peso !== "—" ? String(editEntry.peso) : "",
        // La tabla y el modelo guardan la talla en metros, el formulario la
        // captura en centímetros.
        height: editEntry.altura !== "—" ? String(Math.round(Number(editEntry.altura) * 100)) : "",
        temperature: editEntry.temp !== "—" ? String(editEntry.temp) : "",
        oxygen_saturation: editEntry.spo2 !== "—" ? String(editEntry.spo2) : "",
      });
    } else {
      setForm(EMPTY);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editEntry?.id]);

  if (!isOpen) return null;

  const close = () => {
    if (loading) return;
    onClose();
  };

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (loading) return;
    setSubmitted(true);
    if (hasFieldErrors || Object.keys(getMissingErrors(form)).length > 0) {
      setGeneralError("Completa todos los signos vitales con valores válidos");
      return;
    }
    setGeneralError(null);
    setLoading(true);
    try {
      const weight = form.weight ? Number(form.weight) : undefined;
      // Se captura en centímetros, más natural para digitar, y se convierte a
      // metros, que es la unidad que usa el resto del expediente (ver
      // useRecords.js).
      const heightM = form.height ? Number(form.height) / 100 : undefined;
      const imc = weight && heightM ? Math.round((weight / (heightM * heightM)) * 10) / 10 : undefined;

      const vitals = {
        blood_pressure: form.blood_pressure || undefined,
        glucosa_mgdl: form.glucose ? Number(form.glucose) : undefined,
        weight,
        height: heightM,
        imc,
        temperature: form.temperature ? Number(form.temperature) : undefined,
        spo2: form.oxygen_saturation ? Number(form.oxygen_saturation) : undefined,
      };

      if (editEntry) {
        await apiClient(`/patients/${patientId}/vital-signs/${editEntry.id}`, {
          method: "PUT",
          body: vitals,
        });
        showSuccess("Signos vitales actualizados correctamente");
      } else {
        await apiClient(`/patients/${patientId}`, {
          method: "PUT",
          body: { new_vital_signs: { ...vitals, last_date_taken: new Date().toISOString() } },
        });
        showSuccess("Signos vitales registrados correctamente");
      }
      onSaved?.();
      close();
    } catch (err) {
      // Si el backend rechaza algo que el frontend no cachó (ej. llamada directa a la API),
      // el mensaje de getVitalSignsError cae aquí igual, como error general.
      showError(err.message || "No se pudieron guardar los signos vitales");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (hasError) =>
    `w-full px-3 py-2 text-sm border rounded-lg focus:outline-none transition-colors ${
      hasError ? "border-red-300 focus:border-red-400" : "border-slate-200 focus:border-blue-500"
    }`;

  const FIELDS = [
    { key: "blood_pressure", label: "Presión arterial", placeholder: "120/80", inputMode: "numeric", onChange: (v) => set("blood_pressure", maskBloodPressure(v)) },
    { key: "glucose", label: "Glucosa (mg/dL)", inputMode: "decimal", onChange: (v) => set("glucose", maskDecimal(v)) },
    { key: "weight", label: "Peso (kg)", inputMode: "decimal", onChange: (v) => set("weight", maskDecimal(v)) },
    { key: "height", label: "Talla (cm)", inputMode: "decimal", onChange: (v) => set("height", maskDecimal(v)) },
    { key: "temperature", label: "Temperatura (°C)", inputMode: "decimal", onChange: (v) => set("temperature", maskDecimal(v)) },
    { key: "oxygen_saturation", label: "Saturación O2 (%)", inputMode: "decimal", onChange: (v) => set("oxygen_saturation", maskDecimal(v)) },
  ];

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
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <HeartPulse className="h-5 w-5" />
          </div>
          <h2 className="text-base font-semibold text-slate-800">
            {editEntry ? "Editar signos vitales" : "Registrar signos vitales"}
          </h2>
        </div>

        <fieldset disabled={loading} className="contents">
          <div className="grid grid-cols-2 gap-3">
            {FIELDS.map((field) => (
              <div key={field.key} className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500">{field.label}</label>
                <input
                  type="text"
                  inputMode={field.inputMode}
                  placeholder={field.placeholder}
                  value={form[field.key]}
                  onChange={(e) => field.onChange(e.target.value)}
                  className={inputClass(!!fieldErrors[field.key])}
                />
                {fieldErrors[field.key] && (
                  <p className="text-[11px] text-red-500">{fieldErrors[field.key]}</p>
                )}
              </div>
            ))}
          </div>

          {generalError && <p className="text-[11px] text-red-500 mt-3">{generalError}</p>}

          <button
            type="button"
            onClick={handleSave}
            disabled={hasFieldErrors}
            className="mt-5 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {editEntry ? "Guardar cambios" : "Guardar"}
          </button>
        </fieldset>
      </div>
    </div>
  );
};

export default VitalSignsFormModal;
