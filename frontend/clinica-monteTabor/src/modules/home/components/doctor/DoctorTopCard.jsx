import { Activity } from "lucide-react";

const DoctorTopCard = ({ topDisease }) => {
    const name  = topDisease?.name  || null;
    const count = topDisease?.count || 0;

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <Activity className="w-4 h-4 text-indigo-600" />
                </div>
                <p className="text-xs font-semibold text-slate-500 leading-tight">
                    Enfermedad más frecuente
                </p>
            </div>

            {name ? (
                <>
                    <p className="text-2xl font-bold text-slate-800 leading-tight">{name}</p>
                    <p className="text-sm font-semibold text-indigo-500">
                        ({count.toLocaleString()}) Casos
                    </p>
                </>
            ) : (
                <p className="text-sm text-slate-300 mt-2">Sin datos de diagnóstico</p>
            )}
        </div>
    );
};

export default DoctorTopCard;
