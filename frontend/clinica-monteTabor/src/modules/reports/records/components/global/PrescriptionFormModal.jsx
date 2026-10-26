import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { X, Loader2, Pill, Plus, Trash2 } from "lucide-react";
import apiClient from "@/lib/apiClient";
import { showSuccess, showError } from "@/lib/alerts";

const EMPTY_MED = { name: "", dose: "", frequency: "", duration: "" };
const EMPTY = { medications: [EMPTY_MED], post_operative_instructions: "" };

// Modal para editar una receta ya emitida (Prescriptions), desde la
// pestaña de Documentos del expediente. No existe una variante de
// "crear": una receta solo nace al finalizar una consulta (ver
// ResumenTab.jsx, botón Agregar que lleva al formulario de consulta), acá
// solo se corrige lo que ya se guardó.
// entry es la fila que arma usePatientRecordDetail.js (con id, medicationsRaw,
// instructionsRaw).
const PrescriptionFormModal = ({ isOpen, onClose, entry, onSaved }) => {
  const [loading, setLoading] = useState(false);
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ defaultValues: EMPTY });
  const { fields, append, remove } = useFieldArray({ control, name: "medications" });

  useEffect(() => {
    if (!isOpen) return;
    reset({
      medications: entry?.medicationsRaw?.length
        ? entry.medicationsRaw.map((m) => ({
            name: m.name || "",
            dose: m.dose || "",
            frequency: m.frequency || "",
            duration: m.duration || "",
          }))
        : [EMPTY_MED],
      post_operative_instructions: entry?.instructionsRaw || "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, entry?.id]);

  if (!isOpen) return null;

  const close = () => {
    reset(EMPTY);
    onClose();
  };

  const onSubmit = async (data) => {
    if (loading) return;
    setLoading(true);
    try {
      await apiClient(`/prescriptions/${entry.id}`, {
        method: "PUT",
        body: {
          medications: data.medications.filter((m) => m.name.trim()),
          post_operative_instructions: data.post_operative_instructions,
        },
      });
      showSuccess("Receta actualizada correctamente");
      onSaved?.();
      close();
    } catch (err) {
      showError(err.message || "Ocurrió un error al guardar la receta");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (hasError) =>
    `w-full px-2 py-1.5 text-sm border rounded-lg focus:outline-none transition-colors ${
      hasError ? "border-red-400 focus:border-red-500" : "border-slate-200 focus:border-blue-500"
    }`;

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

        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <Pill className="h-5 w-5" />
          </div>
          <h2 className="text-base font-semibold text-slate-800">Editar receta</h2>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <fieldset disabled={loading} className="contents">
            <div className="flex flex-col gap-2.5">
              {fields.map((row, index) => (
                <div key={row.id} className="rounded-lg border border-slate-100 p-3">
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-slate-500">Medicamento</label>
                      <input
                        type="text"
                        placeholder="Ej. Paracetamol 500mg"
                        maxLength={100}
                        {...register(`medications.${index}.name`, {
                          required: "Requerido", pattern: { value: /\S/, message: "Requerido" },
                        })}
                        className={inputClass(errors?.medications?.[index]?.name)}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-slate-500">Dosis</label>
                      <input
                        type="text"
                        placeholder="Ej. 1 tableta"
                        maxLength={50}
                        {...register(`medications.${index}.dose`)}
                        className={inputClass(false)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-slate-500">Frecuencia</label>
                      <input
                        type="text"
                        placeholder="Ej. Cada 8 horas"
                        maxLength={50}
                        {...register(`medications.${index}.frequency`)}
                        className={inputClass(false)}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-slate-500">Duración</label>
                      <input
                        type="text"
                        placeholder="Ej. Por 5 días"
                        maxLength={50}
                        {...register(`medications.${index}.duration`)}
                        className={inputClass(false)}
                      />
                    </div>
                  </div>
                  {fields.length > 1 && (
                    <div className="mt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="text-slate-400 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => append(EMPTY_MED)}
                className="flex items-center gap-1 self-start text-xs font-medium text-blue-600 hover:underline"
              >
                <Plus className="h-3.5 w-3.5" /> Agregar medicamento
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500">Indicaciones de seguimiento</label>
              <textarea
                rows={2}
                maxLength={500}
                placeholder="Ej. Reposo relativo, abundantes líquidos"
                {...register("post_operative_instructions")}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Guardar cambios
            </button>
          </fieldset>
        </form>
      </div>
    </div>
  );
};

export default PrescriptionFormModal;
