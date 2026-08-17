import { useFieldArray, useFormContext } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import SectionCard from "./SectionCard";

const AntecedentsCard = ({ title, name, fields, readOnly }) => {
    const { control, register, watch } = useFormContext();

    // useFieldArray maneja agregar y quitar filas sin necesidad de
    // manipular arrays a mano con setState.
    const { fields: rows, append, remove } = useFieldArray({ control, name });

    // Valores vacíos para la fila nueva: uno por cada columna definida.
    const emptyRow = Object.fromEntries(fields.map((f) => [f.key, ""]));

    return (
        <SectionCard title={title}>
            <div className="space-y-2 mb-3">
                {rows.map((row, index) => (
                    <div key={row.id} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                        {fields.map((field) => (
                            <div key={field.key} className="flex flex-col gap-0.5">
                                <input
                                    type="text"
                                    placeholder={field.label}
                                    maxLength={field.maxLength || 100}
                                    disabled={readOnly}
                                    {...register(`${name}.${index}.${field.key}`)}
                                    className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm disabled:bg-slate-50"
                                />
                                <span className="self-end text-[11px] text-gray-400">
                                    {watch(`${name}.${index}.${field.key}`)?.length ?? 0}/{field.maxLength || 100}
                                </span>
                            </div>
                        ))}
                        {/* Botón de borrar fila, se oculta en modo lectura */}
                        {!readOnly && (
                            <button
                                type="button"
                                onClick={() => remove(index)}
                                className="text-slate-400 hover:text-red-500"
                            >
                                <Trash2 size={16} />
                            </button>
                        )}
                    </div>
                ))}

                {rows.length === 0 && (
                    <p className="text-xs text-slate-400">
                        No se han registrado antecedentes de este tipo.
                    </p>
                )}
            </div>

            {!readOnly && (
                <button
                    type="button"
                    onClick={() => append(emptyRow)}
                    className="flex items-center gap-1 text-xs text-[#0b66d6] font-medium"
                >
                    <Plus size={14} /> Agregar antecedente
                </button>
            )}
        </SectionCard>
    );
};

export default AntecedentsCard;