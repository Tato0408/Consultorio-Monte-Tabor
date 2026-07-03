import { ClipboardList, CalendarClock, Users, CheckCircle2 } from "lucide-react";

const TreatmentsStats = ({ stats, loading }) => {
  const cards = [
    {
      title: "Tratamientos activos",
      value: loading ? "..." : stats?.activeTreatments ?? "—",
      sub: "Pacientes en tratamiento",
      icon: ClipboardList,
      color: "bg-green-50 text-green-600",
    },
    {
      title: "Próximos controles",
      value: loading ? "..." : stats?.upcomingControls ?? "—",
      sub: "En los próximos 7 días",
      icon: CalendarClock,
      color: "bg-blue-50 text-blue-600",
    },
    {
      title: "Pacientes en seguimiento",
      value: loading ? "..." : stats?.patientsInFollowUp ?? "—",
      sub: "Con evolución registrada",
      icon: Users,
      color: "bg-purple-50 text-purple-600",
    },
    {
      title: "Tratamientos finalizados",
      value: loading ? "..." : stats?.finishedTreatments ?? "—",
      sub: "Este mes",
      icon: CheckCircle2,
      color: "bg-slate-100 text-slate-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-5">
      {cards.map((card, i) => (
        <div key={i} className="bg-white rounded-xl border border-slate-100 shadow-sm p-3 sm:p-5 flex flex-col gap-2 sm:gap-3">
          <div className="flex items-start justify-between gap-2">
            <div className={`p-2 sm:p-2.5 rounded-lg flex-shrink-0 ${card.color}`}>
              <card.icon className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] sm:text-sm text-slate-500 leading-tight">{card.title}</p>
            <h2 className="text-xl sm:text-3xl font-bold text-slate-900 mt-0.5 truncate">{card.value}</h2>
            <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 leading-tight">{card.sub}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TreatmentsStats;
