import { useFieldArray, useFormContext } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import SectionCard from "./SectionCard";
import { maskClinicalText } from "@/lib/inputMasks";

// Clase del borde de un campo: rojo cuando el campo tiene un error de
// validación pendiente, gris en cualquier otro caso.
const borderClass = (hasError) => (hasError ? "border-red-400" : "border-slate-200");

const PrescriptionCard = ({ readOnly }) => {
    const { control, register, setValue, watch, formState: { errors } } = useFormContext();

    // Aplica la máscara de texto clínico y actualiza react-hook-form. Se reutiliza en
    // todos los inputs de esta tarjeta (medicamentos e indicaciones), que son de texto
    // libre pero sí necesitan números (dosis, frecuencias, días) y puntuación normal,
    // solo se bloquean símbolos sueltos.
    const maskChange = (path, maxLength) => (e) =>
        setValue(path, maskClinicalText(e.target.value, maxLength), { shouldValidate: true });
    const { fields: rows, append, remove } = useFieldArray({
        control,
        name: "prescription.medications",
    });

    return (
        <SectionCard title="Receta y seguimiento - opcional">
            <div className="space-y-3 mb-3">
                {rows.map((row, index) => (
                    <div key={row.id} className="border border-slate-100 rounded-lg p-3">
                        {/* Fila 1: Medicamento y Dosis */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                            <div className="flex flex-col gap-0.5">
                                <label className="text-xs text-slate-500">Medicamento</label>
                                <input
                                    type="text"
                                    placeholder="Ej. Paracetamol 500mg"
                                    maxLength={100}
                                    disabled={readOnly}
                                    {...register(`prescription.medications.${index}.name`, {
                                        required: "El nombre del medicamento es obligatorio",
                                    })}
                                    onChange={maskChange(`prescription.medications.${index}.name`, 100)}
                                    className={`border rounded-lg px-2 py-1.5 text-sm disabled:bg-slate-50 ${borderClass(errors?.prescription?.medications?.[index]?.name)}`}
                                />
                                <span className="self-end text-[11px] text-gray-400">
                                    {watch(`prescription.medications.${index}.name`)?.length ?? 0}/100
                                </span>
                            </div>
                            <div className="flex flex-col gap-0.5">
                                <label className="text-xs text-slate-500">Dosis</label>
                                <input
                                    type="text"
                                    placeholder="Ej. 1 tableta"
                                    maxLength={50}
                                    disabled={readOnly}
                                    {...register(`prescription.medications.${index}.dose`, {
                                        required: "La dosis es obligatoria",
                                    })}
                                    onChange={maskChange(`prescription.medications.${index}.dose`, 50)}
                                    className={`border rounded-lg px-2 py-1.5 text-sm disabled:bg-slate-50 ${borderClass(errors?.prescription?.medications?.[index]?.dose)}`}
                                />
                                <span className="self-end text-[11px] text-gray-400">
                                    {watch(`prescription.medications.${index}.dose`)?.length ?? 0}/50
                                </span>
                            </div>
                        </div>

                        {/* Fila 2: Frecuencia y Duración */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                            <div className="flex flex-col gap-0.5">
                                <label className="text-xs text-slate-500">Frecuencia</label>
                                <input
                                    type="text"
                                    placeholder="Ej. Cada 8 horas"
                                    maxLength={50}
                                    disabled={readOnly}
                                    {...register(`prescription.medications.${index}.frequency`, {
                                        required: "La frecuencia es obligatoria",
                                    })}
                                    onChange={maskChange(`prescription.medications.${index}.frequency`, 50)}
                                    className={`border rounded-lg px-2 py-1.5 text-sm disabled:bg-slate-50 ${borderClass(errors?.prescription?.medications?.[index]?.frequency)}`}
                                />
                                <span className="self-end text-[11px] text-gray-400">
                                    {watch(`prescription.medications.${index}.frequency`)?.length ?? 0}/50
                                </span>
                            </div>
                            <div className="flex flex-col gap-0.5">
                                <label className="text-xs text-slate-500">Duración</label>
                                <input
                                    type="text"
                                    placeholder="Ej. Por 5 días"
                                    maxLength={50}
                                    disabled={readOnly}
                                    {...register(`prescription.medications.${index}.duration`, {
                                        required: "La duración es obligatoria",
                                    })}
                                    onChange={maskChange(`prescription.medications.${index}.duration`, 50)}
                                    className={`border rounded-lg px-2 py-1.5 text-sm disabled:bg-slate-50 ${borderClass(errors?.prescription?.medications?.[index]?.duration)}`}
                                />
                                <span className="self-end text-[11px] text-gray-400">
                                    {watch(`prescription.medications.${index}.duration`)?.length ?? 0}/50
                                </span>
                            </div>
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

            {/* Las órdenes de laboratorio se llenan en su propia pantalla
                ("Generar orden de laboratorio", panel de acciones). */}

            <label className="text-xs text-slate-500 block mb-1">Indicaciones de seguimiento</label>
            <textarea
                rows={2}
                maxLength={500}
                disabled={readOnly}
                placeholder="Ej. Reposo relativo, abundantes líquidos y control en 3 días si no mejora"
                {...register("prescription.indications")}
                onChange={maskChange("prescription.indications", 500)}
                className="w-full border border-slate-200 rounded-lg p-2 text-sm disabled:bg-slate-50"
            />
            <div className="flex justify-end mb-3">
                <span className="text-[11px] text-gray-400">
                    {watch("prescription.indications")?.length ?? 0}/500
                </span>
            </div>

            <label className="text-xs text-slate-500 block mb-1">Próxima cita sugerida</label>
            <input
                type="date"
                placeholder="dd/mm/aaaa"
                min={new Date().toISOString().split("T")[0]}
                max={`${new Date().getFullYear() + 2}-12-31`}
                disabled={readOnly}
                {...register("prescription.next_appointment_suggested", {
                    // El atributo HTML min de arriba no basta: no bloquea el envío ni todos
                    // los navegadores lo respetan. Mismo criterio que follow_up_date en
                    // ProceduresCard.jsx — ambos campos alimentan el mismo
                    // treatment.next_control_date en el backend, así que una fecha pasada acá
                    // generaba una alerta de "control vencido" incorrecta desde que se guardaba.
                    validate: (value) =>
                        !value ||
                        value >= new Date().toISOString().split("T")[0] ||
                        "La fecha no puede ser anterior a hoy",
                })}
                className={`w-full border rounded-lg px-2 py-1.5 text-sm disabled:bg-slate-50 ${borderClass(errors?.prescription?.next_appointment_suggested)}`}
            />
            {errors?.prescription?.next_appointment_suggested && (
                <p className="text-[11px] text-red-500 mt-0.5">{errors.prescription.next_appointment_suggested.message}</p>
            )}
        </SectionCard>
    );
};

export default PrescriptionCard;