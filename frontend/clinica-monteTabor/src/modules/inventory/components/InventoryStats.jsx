import { Package, TrendingDown, Activity, DollarSign } from "lucide-react";
import { LineChart, Line, ResponsiveContainer } from "recharts";

const sparkData = [
  [5,8,6,9,7,10,8,11,9,12,10,13],
  [3,5,4,6,5,7,6,8,7,6,8,7],
  [10,15,12,18,14,20,16,22,18,24,20,22],
  [100,120,110,130,125,140,135,145,150,148,152,155],
].map((d) => d.map((v, i) => ({ v, i })));

const CARDS = [
  { title: "Productos en stock",    sub: "Total disponible",          icon: Package,     color: "bg-blue-100 text-blue-600",    line: "#3b82f6", sparkIdx: 0 },
  { title: "Bajo inventario",       sub: "Requieren reposición",      icon: TrendingDown, color: "bg-orange-100 text-orange-500", line: "#f97316", sparkIdx: 1 },
  { title: "Utilizados hoy",        sub: "En tratamiento",            icon: Activity,    color: "bg-purple-100 text-purple-600", line: "#a855f7", sparkIdx: 2 },
  { title: "Valor aproximado",      sub: "Costo total del inventario", icon: DollarSign, color: "bg-green-100 text-green-600",  line: "#22c55e", sparkIdx: 3 },
];

const fmt = (key, val) => {
  if (key === "Valor aproximado") return `$${Number(val || 0).toLocaleString()}`;
  return val ?? "—";
};

const InventoryStats = ({ stats }) => {
  const values = [
    stats?.total ?? "—",
    stats?.bajoStock ?? "—",
    stats?.utilizadosHoy ?? "—",
    stats?.valorTotal ?? "—",
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-5">
      {CARDS.map((card, i) => (
        <div key={i} className="bg-white rounded-xl border border-slate-100 shadow-sm p-3 sm:p-5 flex flex-col gap-2 sm:gap-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] sm:text-sm text-slate-500 leading-tight">{card.title}</p>
              <h2 className="text-xl sm:text-3xl font-bold text-slate-900 mt-0.5 truncate">{fmt(card.title, values[i])}</h2>
              <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 leading-tight">{card.sub}</p>
            </div>
            <div className={`p-2 sm:p-2.5 rounded-lg flex-shrink-0 ${card.color}`}>
              <card.icon className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="h-8 sm:h-10">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparkData[card.sparkIdx]}>
                <Line type="monotone" dataKey="v" stroke={card.line} strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ))}
    </div>
  );
};

export default InventoryStats;
