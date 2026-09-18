import { useEffect, useState } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { Plus } from "lucide-react";
import SectionCard from "./SectionCard";
import ProcedureRow from "./ProcedureRow";
import useInventory from "@/modules/inventory/hooks/useInventory";
import useProcedures from "@/modules/procedures/hooks/useProcedures";
import apiClient from "@/lib/apiClient";

// Orquesta la lista de procedimientos, cada fila (con su propio
// manejo de materiales) vive en ProcedureRow.
const ProceduresCard = ({ readOnly }) => {
    const { control, register, formState: { errors } } = useFormContext();
    const { fields: rows, append, remove } = useFieldArray({
        control,
        name: "procedure",
    });

    // Antes cada ProcedureRow traía su propio inventario, catálogo de procedimientos y
    // catálogo de doctores por separado: una consulta con 4 procedimientos disparaba 4
    // peticiones idénticas a cada endpoint (hasta 1000 insumos cada vez). Se traen una
    // sola vez acá y se pasan como props a cada fila.
    const { inventory, isLoading: isLoadingInventory } = useInventory();
    const { procedures, loading: isLoadingProcedures, getProcedureById } = useProcedures();
    const [doctors, setDoctors] = useState([]);
    const [isLoadingDoctors, setIsLoadingDoctors] = useState(true);

    useEffect(() => {
        apiClient("/doctors/catalog")
            .then(setDoctors)
            .catch(() => setDoctors([]))
            .finally(() => setIsLoadingDoctors(false));
    }, []);

    return (
        <SectionCard title="Paso 5 - Procedimientos realizados - opcional">
            <div className="space-y-4 mb-3">
                {rows.map((row, index) => (
                    <ProcedureRow
                        key={row.id}
                        index={index}
                        onRemove={() => remove(index)}
                        readOnly={readOnly}
                        inventory={inventory}
                        isLoadingInventory={isLoadingInventory}
                        procedures={procedures}
                        isLoadingProcedures={isLoadingProcedures}
                        getProcedureById={getProcedureById}
                        doctors={doctors}
                        isLoadingDoctors={isLoadingDoctors}
                    />
                ))}

                {rows.length === 0 && (
                    <p className="text-xs text-slate-400">
                        No se han registrado procedimientos para esta consulta.
                    </p>
                )}
            </div>

            {!readOnly && (
                <button
                    type="button"
                    onClick={() =>
                        append({ procedure_id: "", doctor_id: "", notes: "", material_used: [] })
                    }
                    className="flex items-center gap-1 text-xs text-[#0b66d6] font-medium"
                >
                    <Plus size={14} /> Agregar procedimiento
                </button>
            )}

            {/* No depende de rows.length: un médico que abre un plan de tratamiento sin
                procedimientos también debe poder fijar la próxima fecha de control. */}
            <div className="mt-4 pt-3 border-t border-slate-100 max-w-xs">
                    <label className="text-xs text-slate-500 block mb-1">
                        Fecha del próximo control
                    </label>
                    <input
                        type="date"
                        disabled={readOnly}
                        placeholder="dd/mm/aaaa"
                        min={new Date().toISOString().split("T")[0]}
                        {...register("follow_up_date", {
                            validate: (value) =>
                                !value ||
                                value >= new Date().toISOString().split("T")[0] ||
                                "La fecha no puede ser anterior a hoy",
                        })}
                        className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm disabled:bg-slate-50"
                    />
                    {errors?.follow_up_date && (
                        <p className="text-[11px] text-red-500 mt-0.5">{errors.follow_up_date.message}</p>
                    )}
                    <p className="text-[11px] text-slate-400 mt-1">
                        Si se define, el paciente queda en seguimiento hasta esa fecha.
                    </p>
                </div>
        </SectionCard>
    );
};

export default ProceduresCard;