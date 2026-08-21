import { useState } from "react";
import { X, Loader2, FileText } from "lucide-react";
import { showError } from "@/lib/alerts";

// Modal del botón "Generar incapacidad". Solo pide los días de
// reposo, el resto de los datos (paciente, diagnóstico, doctor) ya
// están disponibles en la consulta abierta.
const IncapacidadModal = ({ isOpen, onClose, onSubmit }) => {
    const [days, setDays] = useState("");
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const close = () => {
        if (loading) return;
        setDays("");
        onClose();
    };

    const handleSubmit = async () => {
        const value = Number(days);
        if (!days || value < 1) return;
        setLoading(true);
        try {
            await onSubmit(value);
            close();
        } catch (err) {
            showError(err.message || "No se pudo generar la incapacidad");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl relative my-auto max-h-[90vh] overflow-y-auto">
                <button
                    type="button"
                    onClick={close}
                    disabled={loading}
                    className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                >
                    <X className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-3 mb-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                        <FileText className="h-5 w-5" />
                    </div>
                    <h2 className="text-base font-semibold text-slate-800">Generar incapacidad</h2>
                </div>

                <fieldset disabled={loading} className="contents">
                    <label className="text-xs font-semibold text-slate-500 block mb-1.5">
                        Días de reposo
                    </label>
                    <input
                        type="number"
                        autoFocus
                        min={1}
                        step={1}
                        placeholder="Ej. 3"
                        value={days}
                        onChange={(e) => setDays(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                    />

                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={!days || Number(days) < 1}
                        className="mt-5 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                        Generar PDF
                    </button>
                </fieldset>
            </div>
        </div>
    );
};

export default IncapacidadModal;
