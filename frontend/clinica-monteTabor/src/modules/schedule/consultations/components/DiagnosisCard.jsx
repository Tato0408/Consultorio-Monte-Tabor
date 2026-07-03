import { useFormContext } from "react-hook-form";
import SectionCard from "./SectionCard";

const DiagnosisCard = ({ readOnly }) => {
    const { register } = useFormContext();

    return (
        <SectionCard title="Impresión Diagnóstica">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div>
                    <label className="text-xs text-slate-500 block mb-1">CIE-10</label>
                    <input
                        type="text"
                        placeholder="Ej. J00"
                        disabled={readOnly}
                        {...register("clinical_data.ICD_10_diagnosis")}
                        className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm disabled:bg-slate-50"
                    />
                </div>
                <div>
                    <label className="text-xs text-slate-500 block mb-1">Nombre del diagnóstico</label>
                    <input
                        type="text"
                        disabled={readOnly}
                        {...register("clinical_data.diagnosis")}
                        className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm disabled:bg-slate-50"
                    />
                </div>
            </div>

            <label className="text-xs text-slate-500 block mb-1">
                Descripción / Observaciones diagnósticas
            </label>
            <textarea
                rows={2}
                disabled={readOnly}
                {...register("clinical_data.diagnosis_description")}
                className="w-full border border-slate-200 rounded-lg p-2 text-sm disabled:bg-slate-50"
            />
        </SectionCard>
    );
};

export default DiagnosisCard;