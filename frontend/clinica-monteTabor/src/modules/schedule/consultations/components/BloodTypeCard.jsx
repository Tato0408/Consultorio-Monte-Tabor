import { useState } from "react";
import { Loader2, Check } from "lucide-react";
import apiClient from "@/lib/apiClient";
import { showSuccess, showError } from "@/lib/alerts";
import SectionCard from "./SectionCard";

const BLOOD_TYPES = ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"];

// Tarjeta (no modal) para elegir el tipo de sangre del paciente,
// integrada entre las demás secciones de la consulta. El encabezado
// (PatientHeader.jsx) solo muestra el valor, la edición se hace aquí,
// contra PUT /patients/:id (blood_type).
const BloodTypeCard = ({ patientId, currentValue, onSaved, readOnly }) => {
    const [selected, setSelected] = useState(currentValue || null);
    const [loading, setLoading] = useState(false);

    const handleSelect = async (bt) => {
        if (readOnly || loading || bt === selected) return;
        setSelected(bt);
        setLoading(true);
        try {
            await apiClient(`/patients/${patientId}`, {
                method: "PUT",
                body: { blood_type: bt },
            });
            showSuccess("Tipo de sangre actualizado correctamente");
            onSaved?.(bt);
        } catch (err) {
            showError(err.message || "No se pudo actualizar el tipo de sangre");
            setSelected(currentValue || null);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SectionCard title="Paso 8 - Tipo de sangre - opcional">
            <div className="grid grid-cols-3 gap-2">
                {BLOOD_TYPES.map((bt) => {
                    const active = selected === bt;
                    return (
                        <button
                            key={bt}
                            type="button"
                            disabled={readOnly || loading}
                            onClick={() => handleSelect(bt)}
                            className={`relative rounded-lg border py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed ${
                                active
                                    ? "border-blue-500 bg-blue-50 text-blue-600"
                                    : "border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50 disabled:hover:border-slate-200 disabled:hover:bg-transparent"
                            }`}
                        >
                            {active && loading ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" />
                            ) : active ? (
                                <span className="flex items-center justify-center gap-1">
                                    <Check className="w-3 h-3" strokeWidth={3} /> {bt}
                                </span>
                            ) : (
                                bt
                            )}
                        </button>
                    );
                })}
            </div>
        </SectionCard>
    );
};

export default BloodTypeCard;
