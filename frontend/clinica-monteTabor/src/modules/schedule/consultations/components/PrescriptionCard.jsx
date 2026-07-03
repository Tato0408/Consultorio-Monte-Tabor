import { useFieldArray, useFormContext } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import SectionCard from "./SectionCard";

const PrescriptionCard = ({ readOnly }) => {
    const { control, register } = useFormContext();
    const { fields: rows, append, remove } = useFieldArray({
        control,
        name: "prescription.medications",
    });

    return (
        <SectionCard title="Receta y Seguimiento">
            <div className="space-y-3 mb-3">
                {rows.map((row, index) => (
                    <div key={row.id} className="border border-slate-100 rounded-lg p-3">
                        {/* Fila 1: Medicamento y Dosis */}
                        <div className="grid grid-cols-2 gap-2 mb-2">
                            <input
                                type="text"
                                placeholder="Medicamento"
                                disabled={readOnly}
                                {...register(`prescription.medications.${index}.name`)}
                                className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm disabled:bg-slate-50"
                            />
                            <input
                                type="text"
                                placeholder="Dosis"
                                disabled={readOnly}
                                {...register(`prescription.medications.${index}.dose`)}
                                className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm disabled:bg-slate-50"
                            />
                        </div>

                        {/* Fila 2: Frecuencia y Duración */}
                        <div className="grid grid-cols-2 gap-2 mb-2">
                            <input
                                type="text"
                                placeholder="Frecuencia"
                                disabled={readOnly}
                                {...register(`prescription.medications.${index}.frequency`)}
                                className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm disabled:bg-slate-50"
                            />
                            <input
                                type="text"
                                placeholder="Duración"
                                disabled={readOnly}
                                {...register(`prescription.medications.${index}.duration`)}
                                className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm disabled:bg-slate-50"
                            />
                        </div>

                        {/* Fila 3: Botón eliminar al final a la derecha */}
                        {!readOnly && (
                            <div className="flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => remove(index)}
                                    className="text-slate-400 hover:text-red-500"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {!readOnly && (
                <button
                    type="button"
                    onClick={() => append({ name: "", dose: "", frequency: "", duration: "" })}
                    className="flex items-center gap-1 text-xs text-[#0b66d6] font-medium mb-4"
                >
                    <Plus size={14} /> Agregar medicamento
                </button>
            )}

            <label className="text-xs text-slate-500 block mb-1">Indicaciones de seguimiento</label>
            <textarea
                rows={2}
                disabled={readOnly}
                {...register("prescription.indications")}
                className="w-full border border-slate-200 rounded-lg p-2 text-sm mb-3 disabled:bg-slate-50"
            />

            <label className="text-xs text-slate-500 block mb-1">Próxima cita sugerida</label>
            <input
                type="date"
                disabled={readOnly}
                {...register("prescription.next_appointment_suggested")}
                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm disabled:bg-slate-50"
            />
        </SectionCard>
    );
};

export default PrescriptionCard;