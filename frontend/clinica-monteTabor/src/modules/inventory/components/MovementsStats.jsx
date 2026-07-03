import { ArrowLeftRight, PackagePlus, Activity, ClipboardList } from "lucide-react";

const MovementsStats = ({ movements, loading }) => {
  const countByType = (type) => movements.filter((m) => m.type === type).length;

  const cards = [
    {
      title: "Total de movimientos",
      value: loading ? "..." : movements.length,
      icon: ArrowLeftRight,
      color: "text-slate-700",
    },
    {
      title: "Entradas de stock",
      value: loading ? "..." : countByType("Stock entry"),
      icon: PackagePlus,
      color: "text-green-600",
    },
    {
      title: "Usos registrados",
      value: loading ? "..." : countByType("Treatment use") + countByType("Manual use"),
      icon: Activity,
      color: "text-blue-600",
    },
    {
      title: "Ajustes realizados",
      value: loading ? "..." : countByType("Inventory adjustment"),
      icon: ClipboardList,
      color: "text-orange-500",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-5">
      {cards.map((card, index) => (
        <div
          key={index}
          className="bg-white rounded-xl border border-slate-100 shadow-sm p-3 sm:p-5 flex items-center gap-3 sm:gap-4"
        >
          <card.icon className={`w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0 ${card.color}`} />
          <div className="min-w-0">
            <p className="text-[11px] sm:text-sm text-slate-500 leading-tight">{card.title}</p>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 truncate">{card.value}</h2>
          </div>
        </div>
      ))}
    </div>
  );
};

export default MovementsStats;
