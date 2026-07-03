import { Controller, useFormContext } from "react-hook-form";
import SectionCard from "./SectionCard";

const EvolutionCard = ({ readOnly }) => {
    const { control } = useFormContext();

    return (
        <SectionCard title="Evolución Clínica">
            <p className="text-xs text-slate-400 mb-2">
                Resumen de evolución y padecimiento actual
            </p>
            <Controller
                name="clinical_data.evolution"
                control={control}
                render={({ field }) => (
                    <textarea
                        {...field}
                        rows={4}
                        disabled={readOnly}
                        placeholder="Describe brevemente la evolución del paciente"
                        className="w-full border border-slate-200 rounded-lg p-2 text-sm disabled:bg-slate-50 disabled:text-slate-500"
                    />
                )}
            />
        </SectionCard>
    );
};

export default EvolutionCard;