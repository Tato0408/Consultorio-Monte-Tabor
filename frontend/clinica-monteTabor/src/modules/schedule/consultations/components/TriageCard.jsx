import { useFormContext } from "react-hook-form";
import SectionCard from "./SectionCard";

// Rango fisiológico razonable por campo, evita valores absurdos (por
// ejemplo, SPO2 de 300%) sin bloquear casos clínicos extremos reales.
const FIELDS = [
    { key: "blood_pressure", label: "Presión arterial", placeholder: "120/80", isBloodPressure: true, required: true },
    { key: "glucose", label: "Glucosa (mg/dL)", placeholder: "mg/dL", min: 0, max: 999 },
    { key: "weight", label: "Peso (kg)", placeholder: "kg", min: 0, max: 500 },
    { key: "height", label: "Talla (cm)", placeholder: "cm", min: 0, max: 300 },
    { key: "temperature", label: "Temperatura (°C)", placeholder: "°C", min: 30, max: 45, required: true },
    { key: "oxygen_saturation", label: "Saturación O2 (%)", placeholder: "%", min: 0, max: 100 },
];

const TriageCard = ({ readOnly }) => {
    const { register, setValue, formState: { errors } } = useFormContext();

    // Máscara de presión arterial: solo dígitos y una barra, tope de
    // 3 dígitos por lado. Mismo criterio que las máscaras de teléfono
    // y DUI del resto del sistema (limpiar todo lo que no corresponda
    // al formato en vez de solo validar al final).
    const handleBloodPressureMask = (e) => {
        const raw = e.target.value.replace(/[^0-9/]/g, "");
        const [systolicRaw, ...rest] = raw.split("/");
        const systolic = systolicRaw.slice(0, 3);
        const masked = rest.length > 0 ? `${systolic}/${rest.join("").slice(0, 3)}` : systolic;
        setValue("clinical_data.triage.blood_pressure", masked, { shouldValidate: true });
    };

    // Máscara numérica: solo dígitos y un único punto decimal.
    const handleDecimalMask = (key) => (e) => {
        const raw = e.target.value.replace(/[^0-9.]/g, "");
        const firstDot = raw.indexOf(".");
        const masked = firstDot === -1 ? raw : raw.slice(0, firstDot + 1) + raw.slice(firstDot + 1).replace(/\./g, "");
        setValue(`clinical_data.triage.${key}`, masked, { shouldValidate: true });
    };

    return (
        <SectionCard title="Paso 2 - Triage (signos vitales)">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {FIELDS.map((field) => (
                    <div key={field.key}>
                        <label className="text-xs text-slate-500 block mb-1">
                            {field.label}{field.required && <span className="text-red-500"> *</span>}
                        </label>
                        {field.isBloodPressure ? (
                            <input
                                type="text"
                                inputMode="numeric"
                                placeholder={field.placeholder}
                                disabled={readOnly}
                                {...register("clinical_data.triage.blood_pressure", {
                                    required: field.required ? "La presión arterial es obligatoria" : false,
                                    pattern: { value: /^\d{2,3}\/\d{2,3}$/, message: "Formato: sistólica/diastólica, ej. 120/80" },
                                })}
                                onChange={handleBloodPressureMask}
                                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm disabled:bg-slate-50"
                            />
                        ) : (
                            <input
                                type="text"
                                inputMode="decimal"
                                placeholder={field.placeholder}
                                disabled={readOnly}
                                {...register(`clinical_data.triage.${field.key}`, {
                                    required: field.required ? `${field.label} es obligatoria` : false,
                                    validate: (value) => {
                                        if (!value) return true;
                                        const num = Number(value);
                                        if (Number.isNaN(num)) return "Solo se permiten números";
                                        if (num < field.min || num > field.max) return `Debe estar entre ${field.min} y ${field.max}`;
                                        return true;
                                    },
                                })}
                                onChange={handleDecimalMask(field.key)}
                                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm disabled:bg-slate-50"
                            />
                        )}
                        {errors?.clinical_data?.triage?.[field.key] && (
                            <p className="text-[11px] text-red-500 mt-0.5">{errors.clinical_data.triage[field.key].message}</p>
                        )}
                    </div>
                ))}
            </div>
        </SectionCard>
    );
};

export default TriageCard;
