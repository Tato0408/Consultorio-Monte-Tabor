import { useFormContext } from "react-hook-form";
import SectionCard from "./SectionCard";

const DiagnosisCard = ({ readOnly }) => {
    const { register, setValue, formState: { errors } } = useFormContext();

    // Máscara de CIE-10: solo letras/números/punto, en mayúsculas (ej. "J00", "E11.9") — mismo
    // criterio de "limpiar mientras se escribe" que las demás máscaras del sistema.
    const handleIcdMask = (e) => {
        const masked = e.target.value.toUpperCase().replace(/[^A-Z0-9.]/g, "").slice(0, 8);
        setValue("clinical_data.icd_diagnosis", masked, { shouldValidate: true });
    };

    return (
        <SectionCard title="Impresión Diagnóstica">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div>
                    <label className="text-xs text-slate-500 block mb-1">CIE-10</label>
                    <input
                        type="text"
                        placeholder="Ej. J00"
                        disabled={readOnly}
                        {...register("clinical_data.icd_diagnosis", {
                            pattern: { value: /^[A-Z0-9.]*$/, message: "Solo letras, números y punto" },
                        })}
                        onChange={handleIcdMask}
                        className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm disabled:bg-slate-50"
                    />
                    {errors?.clinical_data?.icd_diagnosis && (
                        <p className="text-[11px] text-red-500 mt-0.5">{errors.clinical_data.icd_diagnosis.message}</p>
                    )}
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