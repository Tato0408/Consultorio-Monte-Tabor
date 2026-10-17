import { useState, useEffect } from "react";
import { X, Loader2, Info } from "lucide-react";
import apiClient from "@/lib/apiClient";
import { showSuccess, showError } from "@/lib/alerts";
import { maskClinicalText } from "@/lib/inputMasks";

// Modal genérico y compacto para agregar o editar un antecedente
// hereditario o patológico, del mismo tamaño que IncapacidadFormModal y
// ProcedureModal (tres campos: a, b y tipo, sin scroll).
// La prop bodyKey vale new_hereditary o new_pathological, el nombre que
// espera el PUT de creación del paciente. La prop fields es una lista de
// objetos con key, label y placeholder de ese tipo, en el mismo orden que
// las columnas a, b y tipo de AntecedentesTable (el tercer campo siempre
// corresponde a Tipo).
// Sin editEntry agrega uno nuevo (PUT al paciente). Con editEntry (la
// fila ya formateada por useRecords.js, con id, a, b y tipo) edita ese
// antecedente puntual, mediante un PUT a la ruta de hereditary o
// pathological del paciente según corresponda, mismo patrón que usa
// VitalSignsFormModal.jsx: el segmento de la ruta sale de bodyKey
// quitándole el prefijo new_.
// El máximo de 30 caracteres por campo (parentesco, condición,
// enfermedad, diagnóstico, tipo) evita que alguien pegue un párrafo
// entero en un campo pensado para dos o tres palabras cortas.
const MAX_FIELD_LENGTH = 30;

// Texto de historia clínica: letras, números (Diabetes tipo 2, COVID-19)
// y puntuación de oración, sin símbolos como + o * (ver maskClinicalText).
const maskText = (raw) => maskClinicalText(raw, MAX_FIELD_LENGTH);

const AntecedentFormModal = ({ isOpen, onClose, patientId, title, editTitle, bodyKey, fields, editEntry, onSaved }) => {
  const emptyValues = Object.fromEntries(fields.map((f) => [f.key, ""]));
  const [values, setValues] = useState(emptyValues);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // El componente se queda montado entre aperturas, el padre solo cambia
  // isOpen, así que sin este efecto el formulario conservaría lo último
  // escrito o no se precargaría con el antecedente a editar.
  useEffect(() => {
    if (!isOpen) return;
    setErrors({});
    if (editEntry) {
      setValues({
        [fields[0].key]: editEntry.a !== "—" ? editEntry.a : "",
        [fields[1].key]: editEntry.b !== "—" ? editEntry.b : "",
        [fields[2].key]: editEntry.tipo !== "—" ? editEntry.tipo : "",
      });
    } else {
      setValues(emptyValues);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editEntry?.id]);

  if (!isOpen) return null;

  const close = () => {
    if (loading) return;
    onClose();
  };

  const handleSave = async () => {
    if (loading) return;
    const hasSomething = fields.some((f) => values[f.key]?.trim());
    if (!hasSomething) return;

    // Si un campo viene lleno, tiene que tener al menos 2 caracteres reales
    // y no solo espacios. Un campo vacío sigue siendo válido, porque no
    // todos son obligatorios a la vez.
    const nextErrors = {};
    fields.forEach((f) => {
      const value = values[f.key]?.trim() || "";
      if (value && value.length < 2) {
        nextErrors[f.key] = "Debe tener al menos 2 caracteres";
      }
    });
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    setErrors({});

    setLoading(true);
    try {
      if (editEntry) {
        const resource = bodyKey.replace("new_", "");
        await apiClient(`/patients/${patientId}/${resource}/${editEntry.id}`, {
          method: "PUT",
          body: values,
        });
        showSuccess("Antecedente actualizado correctamente");
      } else {
        await apiClient(`/patients/${patientId}`, {
          method: "PUT",
          body: { [bodyKey]: values },
        });
        showSuccess("Antecedente registrado correctamente");
      }
      onSaved?.();
      close();
    } catch (err) {
      showError(err.message || "No se pudo guardar el antecedente");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl relative my-auto max-h-[90vh] overflow-y-auto">
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
          <h2 className="text-base font-semibold text-slate-800">{editEntry ? (editTitle || title) : title}</h2>
        </div>

        <fieldset disabled={loading} className="contents">
          <div className="flex flex-col gap-3">
            {fields.map((f) => (
              <div key={f.key} className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500">{f.label}</label>
                <input
                  type="text"
                  maxLength={MAX_FIELD_LENGTH}
                  placeholder={f.placeholder}
                  value={values[f.key]}
                  onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: maskText(e.target.value) }))}
                  className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none transition-colors ${
                    errors[f.key] ? "border-red-300 focus:border-red-400" : "border-slate-200 focus:border-blue-500"
                  }`}
                />
                <div className="flex items-start justify-between gap-2">
                  {errors[f.key] ? <p className="text-[11px] text-red-500">{errors[f.key]}</p> : <span />}
                  <span className="text-[11px] text-gray-400 ml-auto">{values[f.key].length}/{MAX_FIELD_LENGTH}</span>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleSave}
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

export default AntecedentFormModal;
