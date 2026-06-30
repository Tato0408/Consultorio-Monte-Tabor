import { useState } from "react";
import { Download, Calendar, ChevronDown } from "lucide-react";

const DATE_RANGES = [
  "1 Abr 2026 – 1 May 2026",
  "1 Mar 2026 – 1 Abr 2026",
  "1 Ene 2026 – 1 Mar 2026",
  "Último año",
];

const ReportHeader = ({ title, subtitle, breadcrumb }) => {
  const [dateRange, setDateRange] = useState(DATE_RANGES[0]);
  const [showPicker, setShowPicker] = useState(false);

  return (
    <div className="space-y-4">
      {/* Breadcrumb + título + exportar */}
      <div className="flex items-start justify-between">
        <div>
          {breadcrumb && (
            <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
              <span>Reportes</span>
              <span className="text-gray-300">›</span>
              <span className="text-gray-700 font-medium">{breadcrumb}</span>
            </div>
          )}
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-slate-400 mt-1">{subtitle}</p>}
        </div>

        <button
          type="button"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-colors"
        >
          <Download className="w-4 h-4" />
          Exportar
        </button>
      </div>

      {/* Selector de rango de fechas */}
      <div className="flex justify-end">
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowPicker((p) => !p)}
            className="flex items-center gap-2 border border-slate-200 rounded-xl px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            {dateRange}
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${showPicker ? "rotate-180" : ""}`} />
          </button>

          {showPicker && (
            <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-10 min-w-[220px] overflow-hidden">
              {DATE_RANGES.map((range) => (
                <button
                  key={range}
                  type="button"
                  onClick={() => { setDateRange(range); setShowPicker(false); }}
                  className={`w-full text-left px-4 py-2.5 text-xs font-medium transition-colors ${
                    dateRange === range
                      ? "bg-blue-50 text-blue-600"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportHeader;