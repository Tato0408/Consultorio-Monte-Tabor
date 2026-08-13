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
        // h-full: para que, cuando el contenedor padre lo estire (ver AdminDashboard.jsx,
        // donde reemplaza a "Estado del sistema" y absorbe el espacio sobrante para que su
        // borde inferior quede alineado con el de la columna de Reportes y estadísticas), la
        // card ocupe toda esa altura en vez de quedarse con su alto natural de contenido.
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-6 h-full flex flex-col">
            {/* mb-2.5 (antes mb-4): la card ahora solo tiene la mitad del alto de la barra
                lateral (repartido con Agenda del día, ver AdminDashboard.jsx) — menos margen
                aquí le deja más aire real a la grilla de botones de abajo. */}
            <h2 className="text-sm font-bold text-slate-800 mb-2.5">Accesos rápidos</h2>
            {/* Botones e íconos más chicos (antes p-3.5/w-9 h-9/w-4 h-4/text-xs) para que las 3
                filas quepan sin cortarse dentro de esa mitad de alto — con el tamaño anterior el
                contenido de cada botón (ícono + texto) era más alto que la celda que le tocaba
                por fila, y se veía cortado. */}
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