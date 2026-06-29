import { useFormContext } from "react-hook-form";
import SectionCard from "./SectionCard";

const FIELDS = [
    { key: "blood_pressure", label: "Presión arterial", placeholder: "120/80mmHg" },
    { key: "glucose", label: "Glucosa", placeholder: "mg/dL", type: "number" },
    { key: "weight", label: "Peso", placeholder: "kg", type: "number" },
    { key: "height", label: "Talla", placeholder: "cm", type: "number" },
    { key: "temperature", label: "Temperatura", placeholder: "°C", type: "number" },
    { key: "oxygen_saturation", label: "Saturación O2", placeholder: "%", type: "number" },
];

const TriageCard = ({ readOnly }) => {
    const { register } = useFormContext();

    return (
        <SectionCard title="Triage (Signos Vitales)">
            <div className="grid grid-cols-3 gap-3">
                {FIELDS.map((field) => (
                    <div key={field.key}>
                        <label className="text-xs text-slate-500 block mb-1">{field.label}</label>
                        <input
                            type={field.type ?? "text"}
                            placeholder={field.placeholder}
                            disabled={readOnly}
                            // register() devuelve {name, onChange, onBlur, ref} y los esparcimos
                            {...register(`clinical_data.triage.${field.key}`)}
                            className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm disabled:bg-slate-50"
                        />
                    </div>
                ))}
            </div>
        </SectionCard>
    );
};

export default TriageCard;