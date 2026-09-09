import { useFormContext } from "react-hook-form";
import SectionCard from "./SectionCard";
import { maskAlnum, maskClinicalText, maskPhone } from "@/lib/inputMasks";

const ReferralCard = ({ readOnly }) => {
    const { register, setValue, watch } = useFormContext();

    // Aplica una máscara al valor y lo sincroniza con react-hook-form. maskAlnum
    // deja solo letras, números y espacios (dirección, FC, FR); maskClinicalText
    // deja además la puntuación normal de una frase (referido a, motivo). Ningún
    // input de la referencia acepta símbolos sueltos.
    const maskChange = (path, mask, maxLength) => (e) =>
        setValue(path, mask(e.target.value, maxLength), { shouldValidate: true });

    return (
        <SectionCard title="Referencia - opcional">
            <label className="text-xs text-slate-500 block mb-1">Referido a</label>
            <input
                type="text"
                maxLength={100}
                disabled={readOnly}
                placeholder="Ej. Dr. Pérez, Cardiología"
                {...register("referral.referred_to")}
                onChange={maskChange("referral.referred_to", maskClinicalText, 100)}
                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm disabled:bg-slate-50"
            />
            <div className="flex justify-end mb-3">
                <span className="text-[11px] text-gray-400">
                    {watch("referral.referred_to")?.length ?? 0}/100
                </span>
            </div>

            {/* Datos de contacto del medico al que se refiere al paciente. Van
                justo despues de "Referido a". Direccion solo letras y numeros
                (maskAlnum), telefono con formato XXXX-XXXX (maskPhone). */}
            <label className="text-xs text-slate-500 block mb-1">Dirección del doctor referido</label>
            <input
                type="text"
                maxLength={200}
                disabled={readOnly}
                placeholder="Ej. Hospital de Diagnóstico Colonia Médica San Salvador"
                {...register("referral.referred_doctor_address")}
                onChange={maskChange("referral.referred_doctor_address", maskAlnum, 200)}
                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm mb-3 disabled:bg-slate-50"
            />

            <label className="text-xs text-slate-500 block mb-1">Teléfono del doctor referido</label>
            <input
                type="text"
                inputMode="numeric"
                maxLength={9}
                disabled={readOnly}
                placeholder="Ej. 2222-3333"
                {...register("referral.referred_doctor_phone")}
                onChange={maskChange("referral.referred_doctor_phone", maskPhone)}
                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm mb-3 disabled:bg-slate-50"
            />

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

            {/* El telefono del paciente no se pide aqui: sale del propio
                paciente de la referencia. FC/FR van como texto libre porque
                no estan en el triage. */}
            <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                    <label className="text-xs text-slate-500 block mb-1">Frec. cardíaca</label>
                    <input
                        type="text"
                        maxLength={20}
                        disabled={readOnly}
                        placeholder="Ej. 78 lpm"
                        {...register("referral.heart_rate")}
                        onChange={maskChange("referral.heart_rate", maskAlnum, 20)}
                        className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm disabled:bg-slate-50"
                    />
                </div>
                <div>
                    <label className="text-xs text-slate-500 block mb-1">Frec. respiratoria</label>
                    <input
                        type="text"
                        maxLength={20}
                        disabled={readOnly}
                        placeholder="Ej. 16 rpm"
                        {...register("referral.respiratory_rate")}
                        onChange={maskChange("referral.respiratory_rate", maskAlnum, 20)}
                        className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm disabled:bg-slate-50"
                    />
                </div>
            </div>

            <label className="text-xs text-slate-500 block mb-1">
                Motivo de la referencia
            </label>
            <textarea
                rows={2}
                maxLength={500}
                disabled={readOnly}
                placeholder="Ej. Paciente requiere valoración cardiológica por soplo detectado en la auscultación"
                {...register("referral.reason")}
                onChange={maskChange("referral.reason", maskClinicalText, 500)}
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
