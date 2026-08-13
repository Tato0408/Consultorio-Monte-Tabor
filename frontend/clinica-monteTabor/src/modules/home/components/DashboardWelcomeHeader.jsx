import UserIdentityChip from "./UserIdentityChip";

// Header de bienvenida compartido por los 4 dashboards (admin, doctor, enfermera,
// recepcionista): acento decorativo + avatar grande con inicial + saludo, y a la derecha
// la píldora de identidad (foto de perfil real, nombre y rol). Antes cada dashboard tenía
// su propio header simple sin este diseño; ahora todos usan exactamente el mismo.
const DashboardWelcomeHeader = ({ displayName, subtitle, user, userType }) => {
    const initial = displayName?.[0]?.toUpperCase() || "?";

    return (
        <div className="relative overflow-hidden">
            <div
                className="absolute -z-0 rounded-full pointer-events-none"
                style={{
                    width: 420, height: 420, top: -260, left: -80,
                    background: "radial-gradient(circle at center, #3b82f6 0%, #1d4ed8 60%, transparent 75%)",
                    opacity: 0.08,
                }}
            />
            <div className="relative p-4 sm:p-6 pb-2 flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-blue-500/25 flex-shrink-0">
                        {initial}
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800 leading-tight">
                            ¡Bienvenido, {displayName}!
                        </h1>
                        <p className="text-sm text-slate-400">
                            {subtitle}
                        </p>
                    </div>
                </div>
                {/* sm:mt-8 la baja a la misma altura que el botón "Guardar cambios" de Horarios
                    (ver esa misma nota en ScheduleConfig.jsx) — para que no choque con la
                    campana de notificaciones, que ya vive en MainLayout.jsx (fixed top-right,
                    compartida por todas las páginas) y por eso no se repite aquí. */}
                <div className="sm:mt-8">
                    <UserIdentityChip user={user} userType={userType} />
                </div>
            </div>
        </div>
    );
};

export default DashboardWelcomeHeader;
