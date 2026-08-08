import { Calendar, Filter, X } from "lucide-react";

const STATUS_OPTIONS = [
    { value: "pending, scheduled", label: "Agendados" },
    { value: "", label: "Todos los estados" },
    { value: "pending", label: "Agendado (sin confirmar)" },
    { value: "scheduled", label: "En espera" },
    { value: "completed", label: "Atendido" },
    { value: "cancelled", label: "Cancelado" },
];

const AppointmentFilters = ({ filters, onChange }) => {
    const hasDateFilter = Boolean(filters.dateFrom || filters.dateTo);

    return (
        <div className="flex items-start justify-between mb-4">
            <div>
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                    <Calendar size={16} className="text-[#0b66d6]" />
                    Filtro por fechas
                </div>
                <div className="flex items-end gap-4">
                    <div>
                        <label className="block text-xs text-slate-500 mb-1">Desde</label>
                        <input
                            type="date"
                            value={filters.dateFrom || ""}
                            onChange={(e) => onChange({ dateFrom: e.target.value })}
                            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#0b66d6]"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-slate-500 mb-1">Hasta</label>
                        <input
                            type="date"
                            value={filters.dateTo || ""}
                            onChange={(e) => onChange({ dateTo: e.target.value })}
                            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#0b66d6]"
                        />
                    </div>
                    {/* Solo aparece si hay una fecha puesta — es la única forma de volver a la
                        vista general una vez que se parametrizó el filtro. */}
                    {hasDateFilter && (
                        <button
                            type="button"
                            onClick={() => onChange({ dateFrom: "", dateTo: "" })}
                            className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-red-500 border border-slate-200 hover:border-red-200 rounded-lg px-3 py-1.5 transition-colors"
                        >
                            <X size={14} />
                            Ver todas
                        </button>
                    )}
                </div>
            </div>

            <div className="text-right">
                <div className="flex items-center justify-end gap-2 text-sm font-medium text-slate-700 mb-2">
                    <Filter size={16} className="text-[#0b66d6]" />
                    Filtro por estado
                </div>
                <label className="block text-xs text-slate-500 mb-1">Estado actual</label>
                <select
                    value={filters.status || ""}
                    onChange={(e) => onChange({ status: e.target.value })}
                    className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#0b66d6] min-w-[180px]"
                >
                    {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            </div>
        </div>
    );
};

export default AppointmentFilters;