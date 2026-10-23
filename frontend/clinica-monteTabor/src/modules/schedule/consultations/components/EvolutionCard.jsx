import { Controller, useFormContext } from "react-hook-form";
import SectionCard from "./SectionCard";
import { maskClinicalText } from "@/lib/inputMasks";

const EvolutionCard = ({ readOnly }) => {
    const { control, watch, formState: { errors } } = useFormContext();

    return (
        <SectionCard title="Paso 1 - Evolución clínica">
            <p className="text-xs text-slate-400 mb-2">
                Resumen de evolución y padecimiento actual
            </p>
            <Controller
                name="clinical_data.evolution"
                control={control}
                rules={{ required: "Describe los síntomas o la evolución del paciente", pattern: { value: /\S/, message: "Describe los síntomas o la evolución del paciente" } }}
                render={({ field }) => (
                    <textarea
                        {...field}
                        onChange={(e) => field.onChange(maskClinicalText(e.target.value, 500))}
                        rows={4}
                        maxLength={500}
                        disabled={readOnly}
                        placeholder="Describe brevemente la evolución del paciente"
                        className="w-full border border-slate-200 rounded-lg p-2 text-sm disabled:bg-slate-50 disabled:text-slate-500"
                    />
                )}
            />
            <div className="flex items-start justify-between gap-2">
                {errors?.clinical_data?.evolution ? (
                    <p className="text-[11px] text-red-500 mt-0.5">{errors.clinical_data.evolution.message}</p>
                ) : <span />}
                <span className="text-[11px] text-gray-400 mt-0.5 ml-auto">
                    {(watch("clinical_data.evolution") || "").length}/500
                </span>
            </div>
        </SectionCard>
    );
};

export default EvolutionCard;