import { useFormContext } from "react-hook-form";
import SectionCard from "./SectionCard";

const FIELDS = [
    { key: "general", label: "Estado general" },
    { key: "skin", label: "Piel" },
    { key: "cardiopulmonary", label: "Cardiopulmonar" },
    { key: "abdomen", label: "Abdomen" },
    { key: "neorulogical", label: "Neurológico" },
    { key: "musculoskeletal", label: "Musculoesquelético" },
];

const PhysicalExamCard = ({ readOnly }) => {
    const { register } = useFormContext();

    return (
        <SectionCard title="Examen físico">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                {FIELDS.map((field) => (
                    <div key={field.key}>
                        <label className="text-xs text-slate-500 block mb-1">{field.label}</label>
                        <input
                            type="text"
                            maxLength={150}
                            disabled={readOnly}
                            {...register(`physical_exam.${field.key}`)}
                            className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm disabled:bg-slate-50"
                        />
                    </div>
                ))}
            </div>

            <label className="text-xs text-slate-500 block mb-1">Notas adicionales</label>
            <textarea
                rows={2}
                maxLength={500}
                disabled={readOnly}
                {...register("physical_exam.notes")}
                className="w-full border border-slate-200 rounded-lg p-2 text-sm disabled:bg-slate-50"
            />
        </SectionCard>
    );
};

export default PhysicalExamCard;