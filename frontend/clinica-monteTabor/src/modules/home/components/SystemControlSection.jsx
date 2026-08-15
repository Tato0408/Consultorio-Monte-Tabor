import { useNavigate } from "react-router-dom";
import { Shield, ChevronRight } from "lucide-react";

const CARDS = [
    {
        icon: <Shield className="w-5 h-5" />,
        title: "Roles y permisos",
        desc: "Administra roles y permisos de usuarios",
        iconBg: "bg-emerald-100 text-emerald-600",
        route: "/system/privileges",
    },
];

const SystemControlSection = () => {
    const navigate = useNavigate();

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-6 h-full flex flex-col">
            <h2 className="text-base font-bold text-slate-800 mb-4">Control total del sistema</h2>
            <div className="flex flex-col gap-3">
                {CARDS.map((card) => (
                    <button
                        key={card.title}
                        onClick={() => navigate(card.route)}
                        className="rounded-xl border border-slate-100 p-4 flex items-center gap-4 text-left hover:border-blue-200 hover:bg-blue-50/30 transition-all group"
                    >
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${card.iconBg}`}>
                            {card.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-800">{card.title}</p>
                            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{card.desc}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors flex-shrink-0" />
                    </button>
                ))}
            </div>
        </div>
    );
};

export default SystemControlSection;
