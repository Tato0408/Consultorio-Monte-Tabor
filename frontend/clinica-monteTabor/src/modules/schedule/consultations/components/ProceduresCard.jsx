// src/features/consultations/components/ProceduresCard.jsx
import { useFieldArray, useFormContext } from "react-hook-form";
import { Plus } from "lucide-react";
import SectionCard from "./SectionCard";
import ProcedureRow from "./ProcedureRow";

// Ahora solo orquesta la lista de procedimientos; cada fila (con su propio
// manejo de materiales) vive en ProcedureRow.
const ProceduresCard = ({ readOnly }) => {
    const { control } = useFormContext();
    const { fields: rows, append, remove } = useFieldArray({
        control,
        name: "procedure",
    });

    return (
        <SectionCard title="Procedimientos Realizados">
            <div className="space-y-4 mb-3">
                {rows.map((row, index) => (
                    <ProcedureRow
                        key={row.id}
                        index={index}
                        onRemove={() => remove(index)}
                        readOnly={readOnly}
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
        </SectionCard>
    );
};

export default ProceduresCard;