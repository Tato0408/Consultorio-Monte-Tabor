import { useFieldArray, useFormContext } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { maskClinicalText } from "@/lib/inputMasks";

// Clase del borde de un campo: rojo cuando el campo tiene un error de
// validación pendiente, gris en cualquier otro caso.
const borderClass = (hasError) => (hasError ? "border-red-400" : "border-slate-200");

// inventory/procedures/doctors llegan como props desde ProceduresCard.jsx (traídos una
// sola vez ahí, no por cada fila): antes cada fila tenía su propia copia de estos 3
// hooks/fetches, así que una consulta con 4 procedimientos disparaba 4 peticiones
// idénticas a cada endpoint.
const ProcedureRow = ({
    index, onRemove, readOnly,
    inventory, isLoadingInventory,
    procedures, isLoadingProcedures, getProcedureById,
    doctors, isLoadingDoctors,
}) => {
    const { control, register, setValue, getValues, watch, formState: { errors } } = useFormContext();

    const {
        fields: materials,
        append: appendMaterial,
        remove: removeMaterial,
        replace: replaceMaterials,
    } = useFieldArray({
        control,
        name: `procedure.${index}.material_used`,
    });

    const selectedProcedureId = watch(`procedure.${index}.procedure_id`);
    const selectedProcedure = getProcedureById(selectedProcedureId);

    const handleProcedureChange = (procedureId) => {
        setValue(`procedure.${index}.procedure_id`, procedureId, { shouldValidate: true });
        const procedure = getProcedureById(procedureId);
        if (procedure) {
            setValue(`procedure.${index}._procedure_name`, procedure.name);
        }

        // Autocompleta los materiales que el catálogo de Procedimientos
        // declaró para este procedimiento (Procedures.materials), en vez de
        // dejar que el doctor tenga que volver a elegir cada insumo y
        // cantidad a mano. Si lo olvidaba, la fila quedaba sin
        // inventory_id, sanitizeProcedureRows la descartaba en silencio al
        // guardar, y el inventario nunca se descontaba — justo lo contrario
        // de lo que promete el propio formulario de Procedimientos ("Los
        // materiales serán descontados del inventario al asignar el
        // procedimiento."). Solo se autocompleta si esta fila todavía no
        // tiene ningún material elegido a mano, para no pisar una edición
        // que el doctor ya haya hecho.
        const yaTieneMaterialesElegidos = (getValues(`procedure.${index}.material_used`) || [])
            .some((m) => m?.inventory_id);
        if (procedure?.materials?.length && !yaTieneMaterialesElegidos) {
            replaceMaterials(
                procedure.materials
                    .filter((m) => m?.insumo?._id)
                    .map((m) => ({ inventory_id: m.insumo._id, quantity: m.quantity || 1 }))
            );
        }
    };

    return (
        <div className="border border-slate-100 rounded-lg p-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                <div>
                    <label className="text-xs text-slate-500 block mb-1">
                        Procedimiento <span className="text-red-500">*</span>
                    </label>
                    <select
                        disabled={readOnly || isLoadingProcedures}
                        {...register(`procedure.${index}.procedure_id`, {
                            required: "Selecciona un procedimiento",
                        })}
                        value={selectedProcedureId ?? ""}
                        onChange={(e) => handleProcedureChange(e.target.value)}
                        className={`w-full border rounded-lg px-2 py-1.5 text-sm disabled:bg-slate-50 ${borderClass(errors?.procedure?.[index]?.procedure_id)}`}
                    >
                        <option value="">
                            {isLoadingProcedures ? "Cargando procedimientos..." : "Selecciona un procedimiento"}
                        </option>
                        {procedures.map((proc) => (
                            <option key={proc._id} value={proc._id}>
                                {proc.name}
                            </option>
                        ))}
                    </select>
                    {selectedProcedure?.price != null && (
                        <p className="text-[11px] text-slate-400 mt-1">
                            Precio referencia: ${selectedProcedure.price}
                        </p>
                    )}
                </div>

                <div>
                    <label className="text-xs text-slate-500 block mb-1">
                        Médico ejecutante <span className="text-red-500">*</span>
                    </label>
                    <select
                        disabled={readOnly || isLoadingDoctors}
                        {...register(`procedure.${index}.doctor_id`, {
                            required: "Selecciona el médico que ejecutó el procedimiento",
                        })}
                        className={`w-full border rounded-lg px-2 py-1.5 text-sm disabled:bg-slate-50 ${borderClass(errors?.procedure?.[index]?.doctor_id)}`}
                    >
                        <option value="">
                            {isLoadingDoctors ? "Cargando médicos..." : "Selecciona un médico"}
                        </option>
                        {doctors.map((doc) => (
                            <option key={doc._id} value={doc._id}>
                                {doc.name} {doc.last_name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <label className="text-xs text-slate-500 block mb-1">Notas del procedimiento</label>
            <textarea
                rows={2}
                maxLength={500}
                disabled={readOnly}
                placeholder="Ej. Procedimiento realizado sin complicaciones, buena tolerancia"
                {...register(`procedure.${index}.notes`)}
                onChange={(e) => setValue(`procedure.${index}.notes`, maskClinicalText(e.target.value, 500), { shouldValidate: true })}
                className="w-full border border-slate-200 rounded-lg p-2 text-sm disabled:bg-slate-50"
            />
            <div className="flex justify-end mb-3">
                <span className="text-[11px] text-gray-400">
                    {watch(`procedure.${index}.notes`)?.length ?? 0}/500
                </span>
            </div>

            <label className="text-xs text-slate-500 block mb-1">Material utilizado</label>
            <div className="space-y-2 mb-2">
                {materials.map((material, materialIndex) => (
                    <div key={material.id} className="grid grid-cols-1 sm:grid-cols-[1fr_90px_auto] gap-2 sm:items-end">
                        <div className="flex flex-col gap-0.5">
                            <label className="text-[11px] text-slate-500">Insumo</label>
                            <select
                                disabled={readOnly || isLoadingInventory}
                                {...register(`procedure.${index}.material_used.${materialIndex}.inventory_id`, {
                                    required: "Selecciona un insumo",
                                })}
                                className={`border rounded-lg px-2 py-1.5 text-sm disabled:bg-slate-50 ${borderClass(errors?.procedure?.[index]?.material_used?.[materialIndex]?.inventory_id)}`}
                            >
                                <option value="">
                                    {isLoadingInventory ? "Cargando insumos..." : "Selecciona un insumo"}
                                </option>
                                {inventory.map((item) => (
                                    <option key={item._id} value={item._id}>
                                        {item.name} (stock: {item.stock} {item.unit_measure})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex flex-col gap-0.5">
                            <label className="text-[11px] text-slate-500">Cantidad</label>
                            <input
                                type="number"
                                min={1}
                                step={1}
                                placeholder="Ej. 2"
                                disabled={readOnly}
                                // Los <input type="number"> nativos igual dejan escribir e, +, - y
                                // el punto (no son dígitos pero sí caracteres válidos de notación
                                // numérica), se bloquean explícitamente para que solo entren
                                // enteros positivos.
                                onKeyDown={(e) => { if (["e", "E", "+", "-", "."].includes(e.key)) e.preventDefault(); }}
                                {...register(`procedure.${index}.material_used.${materialIndex}.quantity`, {
                                    valueAsNumber: true,
                                    required: "La cantidad es obligatoria",
                                    min: { value: 1, message: "Debe ser al menos 1" },
                                })}
                                className={`border rounded-lg px-2 py-1.5 text-sm disabled:bg-slate-50 ${borderClass(errors?.procedure?.[index]?.material_used?.[materialIndex]?.quantity)}`}
                            />
                        </div>

                        {!readOnly && (
                            <button type="button" onClick={() => removeMaterial(materialIndex)} className="text-slate-400 hover:text-red-500">
                                <Trash2 size={16} />
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {!readOnly && (
                <button
                    type="button"
                    onClick={() => appendMaterial({ inventory_id: "", quantity: 1 })}
                    className="flex items-center gap-1 text-xs text-[#0b66d6] font-medium"
                >
                    <Plus size={14} /> Agregar material
                </button>
            )}

            {!readOnly && (
                <button type="button" onClick={onRemove} className="flex items-center gap-1 text-xs text-red-500 mt-3">
                    <Trash2 size={14} /> Quitar procedimiento
                </button>
            )}
        </div>
    );
};

export default ProcedureRow;