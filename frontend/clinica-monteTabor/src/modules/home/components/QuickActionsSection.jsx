import { useNavigate } from "react-router-dom";
import { CalendarPlus, UserPlus, FileSearch, Package, BarChart3, Shield } from "lucide-react";

// Los accesos apuntan a los mismos destinos reales que ya existen en
// el menú lateral y las rutas del sistema. Ningún atajo lleva a una
// pantalla nueva o inventada.
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
        // La clase h-full hace que, cuando el contenedor padre la estire (ver
        // AdminDashboard.jsx, donde absorbe el espacio sobrante para que su borde
        // inferior quede alineado con el de la columna de Reportes y estadísticas),
        // la tarjeta ocupe toda esa altura en vez de quedarse con su alto natural
        // de contenido.
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-6 h-full flex flex-col">
            {/* La clase mb-2.5 deja un margen menor porque la tarjeta solo tiene
                la mitad del alto de la barra lateral, repartida con Agenda del
                día (ver AdminDashboard.jsx). Eso le da más aire a la grilla de
                botones de abajo. */}
            <h2 className="text-sm font-bold text-slate-800 mb-2.5">Accesos rápidos</h2>
            {/* Los botones y los íconos son pequeños para que las tres filas
                quepan sin cortarse dentro de esa mitad de alto de la tarjeta. */}
            <div className="grid grid-cols-2 grid-rows-3 gap-2 flex-1">
                {ACTIONS.map(({ icon: Icon, label, route }) => (
                    <button
                        key={label}
                        onClick={() => navigate(route)}
                        className="flex flex-col items-start justify-center gap-1 p-2 rounded-lg border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all text-left overflow-hidden"
                    >
                        <div className="w-6 h-6 rounded-md bg-blue-50 flex items-center justify-center flex-shrink-0">
                            <Icon className="w-3 h-3 text-blue-600" />
                        </div>
                        <span className="text-[11px] font-semibold text-slate-700 leading-tight">{label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default QuickActionsSection;