import { useFormContext } from "react-hook-form";
import SectionCard from "./SectionCard";

const ReferralCard = ({ readOnly }) => {
    const { register } = useFormContext();

    return (
        <SectionCard title="Referencia">
            <label className="text-xs text-slate-500 block mb-1">Referido a</label>
            <input
                type="text"
                disabled={readOnly}
                placeholder="Especialista o unidad de destino"
                {...register("referral.referred_to")}
                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm mb-3 disabled:bg-slate-50"
            />

            <label className="text-xs text-slate-500 block mb-1">Fecha de referencia</label>
            <input
                type="date"
                disabled={readOnly}
                {...register("referral.referred_date")}
                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm mb-3 disabled:bg-slate-50"
            />

            <label className="text-xs text-slate-500 block mb-1">
                Motivo de la referencia
            </label>
            <textarea
                rows={2}
                disabled={readOnly}
                placeholder="Indica la justificación clínica para la referencia"
                {...register("referral.reason")}
                className="w-full border border-slate-200 rounded-lg p-2 text-sm disabled:bg-slate-50"
            />
        </SectionCard>
    );
};

export default ReferralCard;