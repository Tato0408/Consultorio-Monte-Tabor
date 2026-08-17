import { useFormContext } from "react-hook-form";
import SectionCard from "./SectionCard";

const ReferralCard = ({ readOnly }) => {
    const { register, watch } = useFormContext();

    return (
        <SectionCard title="Referencia - opcional">
            <label className="text-xs text-slate-500 block mb-1">Referido a</label>
            <input
                type="text"
                maxLength={100}
                disabled={readOnly}
                placeholder="Ej. Dr. Pérez, Cardiología"
                {...register("referral.referred_to")}
                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm disabled:bg-slate-50"
            />
            <div className="flex justify-end mb-3">
                <span className="text-[11px] text-gray-400">
                    {watch("referral.referred_to")?.length ?? 0}/100
                </span>
            </div>

            <label className="text-xs text-slate-500 block mb-1">Fecha de referencia</label>
            <input
                type="date"
                placeholder="dd/mm/aaaa"
                min={`${new Date().getFullYear() - 1}-01-01`}
                max={`${new Date().getFullYear() + 1}-12-31`}
                disabled={readOnly}
                {...register("referral.referred_date")}
                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm mb-3 disabled:bg-slate-50"
            />

            <label className="text-xs text-slate-500 block mb-1">
                Motivo de la referencia
            </label>
            <textarea
                rows={2}
                maxLength={500}
                disabled={readOnly}
                placeholder="Ej. Paciente requiere valoración cardiológica por soplo detectado en la auscultación"
                {...register("referral.reason")}
                className="w-full border border-slate-200 rounded-lg p-2 text-sm disabled:bg-slate-50"
            />
            <div className="flex justify-end">
                <span className="text-[11px] text-gray-400">
                    {watch("referral.reason")?.length ?? 0}/500
                </span>
            </div>
        </SectionCard>
    );
};

export default ReferralCard;