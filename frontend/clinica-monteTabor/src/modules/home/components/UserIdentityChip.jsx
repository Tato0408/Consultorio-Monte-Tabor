import { useNavigate } from "react-router-dom";

const ROLE_LABELS = {
    admin: "Administrador",
    doctor: "Doctor",
    nurse: "Enfermera",
    receptionist: "Recepcionista",
};

// Píldora de identidad del header de cada dashboard: foto de perfil real del usuario en sesión
// (user.image, normalizado por rol en authController.getCurrentUser) con las iniciales como
// respaldo si todavía no ha subido una. Mismo componente para los 4 roles, para que el header
// se vea consistente en todas las interfaces. Es un botón: lleva a "Mi perfil"
// (/system/profile), la misma pantalla para los 4 roles.
const UserIdentityChip = ({ user, userType }) => {
    const navigate = useNavigate();
    const displayName = user
        ? `${user.name || ""} ${user.last_name || ""}`.trim() || user.email
        : ROLE_LABELS[userType] || "Usuario";
    const initial = displayName?.[0]?.toUpperCase() || "?";
    const roleLabel = ROLE_LABELS[userType] || "Usuario";

    return (
        <button
            type="button"
            onClick={() => navigate("/system/profile")}
            className="flex items-center gap-2.5 bg-white border border-slate-100 shadow-sm hover:border-blue-200 hover:shadow-md transition-all pl-2 pr-3.5 py-1.5 rounded-full"
        >
            {user?.image ? (
                <img
                    src={user.image}
                    alt={displayName}
                    className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                />
            ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                    {initial}
                </div>
            )}
            <div className="leading-tight text-left">
                <p className="text-xs font-semibold text-slate-800">{displayName}</p>
                <p className="text-[10px] text-slate-400">{roleLabel}</p>
            </div>
        </button>
    );
};

export default UserIdentityChip;
