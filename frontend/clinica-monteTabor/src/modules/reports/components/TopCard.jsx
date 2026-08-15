import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import { ExternalLink } from "lucide-react";
import { chartColor } from "../chartColors";
import { useAuth } from "@/context/AuthContext";

// El backend manda el mismo linkLabel literal para cada reporte (reportsController.js), y cada
// uno en realidad apunta a OTRO módulo del sistema, no al del propio reporte — por eso el enlace
// solo debe verse/funcionar cuando el usuario tiene permiso de "Ver" en ese módulo relacionado
// (mismo criterio que MODULE_VIEW_DEPENDENCIES usa para el Expediente, pero aquí el enlace
// entero se oculta en vez de solo advertir).
const LINK_TARGETS = {
  "Ver todos los pacientes": { to: "/users/patients", moduleKey: "users.patients" },
  "Ver todos los doctores": { to: "/users/doctors", moduleKey: "users.doctors" },
  "Ver inventario": { to: "/inventory/products", moduleKey: "inventory.products" },
  "Ver el inventario": { to: "/inventory/products", moduleKey: "inventory.products" },
};

const LINE_COLOR = "#3b82f6";
const PIE_COLORS = ["#3b82f6", "#a855f7", "#22c55e", "#f97316", "#94a3b8"];

const ChartCard = ({ card }) => {
  const toggleKeys = Object.keys(card.chartData);
  const [activeToggle, setActiveToggle] = useState(toggleKeys[0]);
  const data = card.chartData[activeToggle];

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-800">{card.title}</span>
        {toggleKeys.length > 1 && (
          <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5">
            {toggleKeys.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setActiveToggle(k)}
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-md transition-all ${
                  activeToggle === k
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                {k}
              </button>
            ))}
          </div>
        )}
      </div>

      {card.stat && (
        <div>
          <p className="text-2xl font-bold text-slate-900">{card.stat}</p>
          {card.statLabel && <p className="text-xs text-slate-400 mt-0.5">{card.statLabel}</p>}
          {card.statDiff && <p className="text-[11px] text-blue-500 mt-0.5">{card.statDiff}</p>}
        </div>
      )}

      <ResponsiveContainer width="100%" height={140}>
        {card.chartType === "bar" ? (
          <BarChart data={data} barSize={14}>
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e2e8f0" }} />
            <Bar dataKey="total" radius={[4, 4, 0, 0]}>
              {data.map((_, i) => (
                <Cell key={i} fill={chartColor(i)} />
              ))}
            </Bar>
          </BarChart>
        ) : (
          <LineChart data={data}>
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e2e8f0" }} />
            <Line type="monotone" dataKey="total" stroke={LINE_COLOR} strokeWidth={2} dot={false} />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
};

const PieCard = ({ card }) => {
  const total = card.pieData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-800">{card.title}</span>
      </div>

      <div className="flex items-center gap-4 mt-1">
        <div className="relative flex-shrink-0">
          <ResponsiveContainer width={130} height={130}>
            <PieChart>
              <Pie
                data={card.pieData}
                cx="50%"
                cy="50%"
                innerRadius={42}
                outerRadius={60}
                dataKey="value"
                strokeWidth={2}
              >
                {card.pieData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-lg font-bold text-slate-800">{total}</span>
            <span className="text-[10px] text-slate-400">{card.statLabel || "Total"}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 flex-1 min-w-0">
          {card.pieData.map((d, i) => (
            <div key={d.name} className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
              />
              <span className="text-xs text-slate-600 flex-1 truncate">{d.name}</span>
              <span className="text-xs text-slate-400 flex-shrink-0">{d.pct}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const ListCard = ({ card }) => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const target = card.linkLabel ? LINK_TARGETS[card.linkLabel] : null;
  const canFollowLink = target && hasPermission(target.moduleKey, "view");

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 flex flex-col gap-3">
      <div>
        <span className="text-sm font-semibold text-slate-800">{card.title}</span>
        {card.subtitle && (
          <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{card.subtitle}</p>
        )}
      </div>

      <ol className="flex flex-col gap-2 flex-1">
        {card.listItems.map((item, i) => (
          <li key={i} className="flex items-center gap-2.5">
            <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
              {i + 1}
            </span>
            <span className="text-xs text-slate-700 leading-snug">{item}</span>
          </li>
        ))}
      </ol>

      {/* El enlace solo se muestra cuando el usuario tiene permiso de ver el módulo al que
          apunta — si no, ni siquiera aparece (a diferencia del Expediente, que sí se muestra
          pero con una advertencia). */}
      {canFollowLink && (
        <button
          type="button"
          onClick={() => navigate(target.to)}
          className="flex items-center gap-1.5 text-[11px] text-blue-600 font-semibold hover:underline mt-auto"
        >
          {card.linkLabel}
          <ExternalLink className="w-3 h-3" />
        </button>
      )}
    </div>
  );
};

// Actúa como router: según la forma del `card` recibido, elige qué variante renderizar
const TopCard = ({ card }) => {
  if (card.listItems) return <ListCard card={card} />;
  if (card.chartType === "pie") return <PieCard card={card} />;
  return <ChartCard card={card} />;
};

export default TopCard;