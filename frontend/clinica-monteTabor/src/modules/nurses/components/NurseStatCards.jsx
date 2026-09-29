import { Users, ClipboardList, CalendarCheck, Stethoscope } from "lucide-react";

const STAT_CONFIG = [
  {
    key: "nurses",
    label: "Enfermeras",
    icon: Users,
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
  },
  {
    key: "notes",
    label: "Notas de enfermería",
    icon: ClipboardList,
    iconBg: "bg-indigo-100",
    iconColor: "text-indigo-600",
  },
  {
    key: "appointments",
    label: "Citas atendidas",
    icon: CalendarCheck,
    iconBg: "bg-sky-100",
    iconColor: "text-sky-600",
  },
  {
    key: "procedures",
    label: "Procedimientos",
    icon: Stethoscope,
    iconBg: "bg-violet-100",
    iconColor: "text-violet-600",
  },
];

const NurseStatCards = ({ stats, loading }) => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
    {STAT_CONFIG.map(({ key, label, icon: Icon, iconBg, iconColor }) => (
      <div
        key={key}
        className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex items-center gap-4"
      >
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
          <Icon className={`w-6 h-6 ${iconColor}`} strokeWidth={2} />
        </div>
        {/* min-w-0: sin esto, el texto (sobre todo etiquetas largas como "Notas de
            enfermería") no se encogía para caber junto al ícono en un celular angosto — al
            no poder envolver, la palabra se salía por el borde derecho de la card. */}
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium text-gray-400">{label}</p>
          {loading ? (
            <div className="h-7 w-10 bg-gray-100 rounded animate-pulse mt-1" />
          ) : (
            <p className="text-2xl font-bold text-gray-900">{stats[key] ?? 0}</p>
          )}
        </div>
      </div>
    ))}
  </div>
);

export default NurseStatCards;