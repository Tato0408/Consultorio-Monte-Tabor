import { useFormContext } from "react-hook-form";
import SectionCard from "./SectionCard";

const FIELDS = [
    { key: "general", label: "Estado general", placeholder: "Ej. Buen estado general, consciente y orientado" },
    { key: "skin", label: "Piel", placeholder: "Ej. Piel normocrómica, sin lesiones visibles" },
    { key: "cardiopulmonary", label: "Cardiopulmonar", placeholder: "Ej. Ruidos cardíacos rítmicos, buena entrada de aire" },
    { key: "abdomen", label: "Abdomen", placeholder: "Ej. Blando, depresible, sin dolor a la palpación" },
    { key: "neorulogical", label: "Neurológico", placeholder: "Ej. Reflejos conservados, sin signos de focalización" },
    { key: "musculoskeletal", label: "Musculoesquelético", placeholder: "Ej. Sin limitación de movimiento, fuerza conservada" },
];

const PhysicalExamCard = ({ readOnly }) => {
    const { register, watch } = useFormContext();

    return (
        <SectionCard title="Paso 3 - Examen físico - opcional">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                {FIELDS.map((field) => (
                    <div key={field.key}>
                        <label className="text-xs text-slate-500 block mb-1">{field.label}</label>
                        <input
                            type="text"
                            maxLength={150}
                            disabled={readOnly}
                            placeholder={field.placeholder}
                            {...register(`physical_exam.${field.key}`)}
                            className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm disabled:bg-slate-50"
                        />
                        <span className="block text-right text-[11px] text-gray-400 mt-0.5">
                            {watch(`physical_exam.${field.key}`)?.length ?? 0}/150
                        </span>
                    </div>
                ))}
            </div>

            <label className="text-xs text-slate-500 block mb-1">Notas adicionales</label>
            <textarea
                rows={2}
                maxLength={500}
                disabled={readOnly}
                placeholder="Ej. Cualquier hallazgo adicional relevante para el diagnóstico"
                {...register("physical_exam.notes")}
                className="w-full border border-slate-200 rounded-lg p-2 text-sm disabled:bg-slate-50"
            />
            <div className="flex justify-end">
                <span className="text-[11px] text-gray-400">
                    {watch("physical_exam.notes")?.length ?? 0}/500
                </span>
            </div>
        </SectionCard>
    );
};

export default PhysicalExamCard;