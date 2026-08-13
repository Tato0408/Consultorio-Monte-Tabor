import { useNavigate } from "react-router-dom";
import { CalendarPlus, UserPlus, FileSearch, Package, BarChart3, Shield } from "lucide-react";

// Mismos destinos reales que ya existen en el sidebar/rutas del sistema — ningún atajo
// apunta a una pantalla nueva o inventada.
const ACTIONS = [
    { icon: CalendarPlus, label: "Nueva cita",      route: "/calendar/appointments/new" },
    { icon: UserPlus,     label: "Nuevo paciente",  route: "/users/patients" },
    { icon: FileSearch,   label: "Buscar HC",       route: "/reports/records" },
    { icon: Package,      label: "Inventario",      route: "/inventory/products" },
    { icon: BarChart3,    label: "Generar reporte", route: "/reports/appointments" },
    { icon: Shield,       label: "Roles y permisos",route: "/system/privileges" },
];

const QuickActionsSection = () => {
    const navigate = useNavigate();

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-6">
            <h2 className="text-base font-bold text-slate-800 mb-4">Accesos rápidos</h2>
            <div className="grid grid-cols-2 gap-3">
                {ACTIONS.map(({ icon: Icon, label, route }) => (
                    <button
                        key={label}
                        onClick={() => navigate(route)}
                        className="flex flex-col items-start gap-2.5 p-3.5 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all text-left"
                    >
                        <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                            <Icon className="w-4 h-4 text-blue-600" />
                        </div>
                        <span className="text-xs font-semibold text-slate-700 leading-tight">{label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default QuickActionsSection;