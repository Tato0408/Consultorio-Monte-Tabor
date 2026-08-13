import { useState } from "react";
import {
  ChevronDown,
  Calendar, Clipboard, Stethoscope, Users, Activity,
  BarChart2, UserRound, ShieldCheck, Package, ClipboardCheck, PlusCircle,
} from "lucide-react";
import StatusBadge from "./StatusBadge";

const SECTION_ICONS = {
  calendar:    Calendar,
  clipboard:   Clipboard,
  stethoscope: Stethoscope,
  users:       Users,
  activity:    Activity,
  chart:       BarChart2,
  user:        UserRound,
  shield:      ShieldCheck,
  package:         Package,
  clipboardCheck:  ClipboardCheck,
  plusCircle:      PlusCircle,
};

const VariacionCell = ({ value }) => {
  if (!value || value === "—") return <span className="text-slate-300">—</span>;
  const isPositive = value.startsWith("+");
  const isNegative = value.startsWith("-");
  return (
    <span
      className={`font-semibold text-sm ${
        isPositive ? "text-emerald-600" : isNegative ? "text-red-500" : "text-slate-500"
      }`}
    >
      {value}
    </span>
  );
};

const ReportSection = ({ section, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const Icon = SECTION_ICONS[section.icon] || Activity;

  return (
    <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white">
      {/* Header colapsable */}
      <button
        type="button"
        onClick={() => setIsOpen((p) => !p)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50/60 transition-colors duration-200"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
            <Icon className="w-4 h-4 text-blue-500" strokeWidth={2.2} />
          </div>
          <span className="font-bold text-sm text-slate-800">{section.title}</span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform duration-300 ease-out ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Cuerpo con animación grid-template-rows */}
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-out"
        style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden min-h-0">
          <div
            className={`transition-opacity duration-200 ease-out ${
              isOpen ? "opacity-100 delay-100" : "opacity-0"
            }`}
          >
            {/* Cabecera de tabla */}
            <div className="grid grid-cols-4 gap-x-4 px-6 py-2 bg-slate-50 border-t border-slate-100">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide text-center">
                Proceso a comparar
              </span>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide text-center">
                Actual
              </span>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide text-center">
                Período anterior
              </span>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide text-center">
                Variación
              </span>
            </div>

            {/* Filas */}
            {section.rows.map((row, i) => (
              <div
                key={i}
                className={`grid grid-cols-4 gap-x-4 px-6 py-3.5 items-center border-t border-slate-50 ${
                  i % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                }`}
              >
                <div className="flex items-center justify-center gap-2 flex-wrap text-center">
                  <span className="text-sm text-slate-700">{row.proceso}</span>
                  {row.badge && <StatusBadge label={row.badge.label} color={row.badge.color} />}
                </div>
                <span className="text-sm font-semibold text-slate-800 text-center">{row.actual}</span>
                <span className="text-sm text-slate-400 text-center">{row.anterior}</span>
                <div className="text-center">
                  <VariacionCell value={row.variacion} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportSection;