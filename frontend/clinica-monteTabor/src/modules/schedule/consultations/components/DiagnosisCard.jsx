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
        <SectionCard title="Impresión diagnóstica">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div>
                    <label className="text-xs text-slate-500 block mb-1">
                        CIE-10 <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        placeholder="Ej. J00"
                        disabled={readOnly}
                        {...register("clinical_data.icd_diagnosis", {
                            required: "El código CIE-10 es obligatorio",
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
                    <label className="text-xs text-slate-500 block mb-1">
                        Nombre del diagnóstico <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        maxLength={100}
                        disabled={readOnly}
                        {...register("clinical_data.diagnosis", {
                            required: "El nombre del diagnóstico es obligatorio",
                        })}
                        className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm disabled:bg-slate-50"
                    />
                    {errors?.clinical_data?.diagnosis && (
                        <p className="text-[11px] text-red-500 mt-0.5">{errors.clinical_data.diagnosis.message}</p>
                    )}
                </div>
            </div>

            <label className="text-xs text-slate-500 block mb-1">
                Descripción / Observaciones diagnósticas <span className="text-red-500">*</span>
            </label>
            <textarea
                rows={2}
                maxLength={500}
                disabled={readOnly}
                {...register("clinical_data.diagnosis_description", {
                    required: "La descripción del diagnóstico es obligatoria",
                })}
                className="w-full border border-slate-200 rounded-lg p-2 text-sm disabled:bg-slate-50"
            />
            {errors?.clinical_data?.diagnosis_description && (
                <p className="text-[11px] text-red-500 mt-0.5">{errors.clinical_data.diagnosis_description.message}</p>
            )}
        </SectionCard>
    );
};

export default DiagnosisCard;