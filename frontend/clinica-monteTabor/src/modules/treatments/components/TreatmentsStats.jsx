import { ClipboardList, CalendarClock, AlertTriangle, Archive } from "lucide-react";

// Tarjetas de resumen de la parte superior de la pantalla de tratamientos.
// Los valores los calcula el backend (treatmentsController.list).
const TreatmentsStats = ({ stats, loading }) => {
  const cards = [
    {
      title: "Tratamientos activos",
      value: loading ? "..." : stats?.activos ?? "—",
      sub: "En curso ahora",
      icon: ClipboardList,
      color: "bg-green-50 text-green-600",
    },
    {
      title: "Controles esta semana",
      value: loading ? "..." : stats?.controlesSemana ?? "—",
      sub: "En los próximos 7 días",
      icon: CalendarClock,
      color: "bg-blue-50 text-blue-600",
    },
    {
      title: "Requieren control",
      value: loading ? "..." : stats?.requierenControl ?? "—",
      sub: "Control vencido, sin visita",
      icon: AlertTriangle,
      color: "bg-orange-50 text-orange-600",
    },
    {
      title: "Cerrados este mes",
      value: loading ? "..." : stats?.cerradosMes ?? "—",
      sub: "Altas, abandonos y derivaciones",
      icon: Archive,
      color: "bg-slate-100 text-slate-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-5">
      {cards.map((card, i) => (
        <div key={i} className="bg-white rounded-xl border border-slate-100 shadow-sm p-3 sm:p-5 flex flex-col gap-2 sm:gap-3">
          <div className={`p-2 sm:p-2.5 rounded-lg flex-shrink-0 self-start ${card.color}`}>
            <card.icon className="w-4 h-4 sm:w-5 sm:h-5" />
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
