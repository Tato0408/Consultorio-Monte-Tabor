import { useNavigate } from "react-router-dom";
import { Stethoscope, Users, Activity, FileText, ChevronRight } from "lucide-react";

const DoctorSummaryCard = ({ summary = {} }) => {
    const navigate = useNavigate();

    const rows = [
        { icon: <Stethoscope className="w-4 h-4 text-blue-500" />,   bg: "bg-blue-50",   label: "Consultas este mes",     value: summary.consultationsThisMonth ?? 0 },
        { icon: <Users        className="w-4 h-4 text-emerald-500" />, bg: "bg-emerald-50", label: "Pacientes activos",       value: summary.activePatients          ?? 0 },
        { icon: <Activity     className="w-4 h-4 text-violet-500" />, bg: "bg-violet-50", label: "Procedimientos médicos",  value: summary.proceduresThisMonth     ?? 0 },
        { icon: <FileText     className="w-4 h-4 text-orange-500" />, bg: "bg-orange-50", label: "Consultas totales",       value: summary.totalConsultations      ?? 0 },
    ];

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-4">
            <p className="text-sm font-bold text-slate-800">Resumen general</p>

            <div className="flex flex-col gap-3 flex-1">
                {rows.map((row, i) => (
                    <div key={i} className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg ${row.bg} flex items-center justify-center flex-shrink-0`}>
                            {row.icon}
                        </div>
                        <p className="text-sm text-slate-600 flex-1">{row.label}</p>
                        <p className="text-sm font-bold text-slate-800 tabular-nums">
                            {row.value.toLocaleString()}
                        </p>
                    </div>
                ))}
            </div>

            <button
                onClick={() => navigate("/reports/appointments")}
                className="flex items-center gap-1 text-xs text-blue-600 font-semibold hover:underline mt-auto"
            >
                Ver más estadísticas <ChevronRight className="w-3.5 h-3.5" />
            </button>
        </div>
    );
};

export default DoctorSummaryCard;
