import { Users, UserCheck, UserX, UserPlus } from "lucide-react";

const PatientStatCards = ({ patients, loading }) => {
  const total = patients.length;
  // is_active === undefined cuenta como activo en el resto del sistema
  // (default:true del schema), no como inactivo.
  const active = patients.filter((p) => p.is_active !== false).length;
  const inactive = total - active;

  const now = new Date();
  const newThisMonth = patients.filter((p) => {
    if (!p.createdAt) return false;
    const created = new Date(p.createdAt);
    return created.getFullYear() === now.getFullYear() && created.getMonth() === now.getMonth();
  }).length;

  const cards = [
    { key: "total", label: "Pacientes", value: total, icon: Users, iconBg: "bg-blue-100", iconColor: "text-blue-600" },
    { key: "active", label: "Activos", value: active, icon: UserCheck, iconBg: "bg-emerald-100", iconColor: "text-emerald-600" },
    { key: "inactive", label: "Inactivos", value: inactive, icon: UserX, iconBg: "bg-red-100", iconColor: "text-red-600" },
    { key: "new", label: "Nuevos este mes", value: newThisMonth, icon: UserPlus, iconBg: "bg-violet-100", iconColor: "text-violet-600" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(({ key, label, value, icon: Icon, iconBg, iconColor }) => (
        <div key={key} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
            <Icon className={`w-6 h-6 ${iconColor}`} strokeWidth={2} />
          </div>
          {/* min-w-0: mismo motivo que NurseStatCards.jsx — sin esto una etiqueta larga
              ("Nuevos este mes") no se encoge junto al ícono en un celular angosto y se
              sale por el borde derecho de la card en vez de envolver. */}
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium text-gray-400">{label}</p>
            {loading ? (
              <div className="h-7 w-10 bg-gray-100 rounded animate-pulse mt-1" />
            ) : (
              <p className="text-2xl font-bold text-gray-900">{value}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default PatientStatCards;
