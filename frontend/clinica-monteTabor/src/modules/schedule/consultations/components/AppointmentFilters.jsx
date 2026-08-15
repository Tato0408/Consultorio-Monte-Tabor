import { useState } from "react";
import { Calendar, Filter, Search, X } from "lucide-react";

// Límite amplio pero real, evita años absurdos (5 o más dígitos) al
// escribir a mano en el filtro de fechas, sin restringir la búsqueda
// a un rango demasiado corto.
const MIN_DATE_STR = "2000-01-01";
const MAX_DATE_STR = `${new Date().getFullYear() + 5}-12-31`;

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

    // Texto del buscador, separado del filtro real, solo se aplica con
    // el botón (o Enter), igual que el buscador de AppointmentsGrid. El
    // backend ya resuelve el parámetro search contra nombre y apellido
    // tanto del paciente como del doctor (ver
    // appointmentsController.getAppointments).
    const [searchInput, setSearchInput] = useState(filters.search || "");

    const handleSearch = () => {
        onChange({ search: searchInput.trim() || undefined });
    };

    const clearSearch = () => {
        setSearchInput("");
        onChange({ search: undefined });
    };

    return (
        <div className="mb-4">
            <div className="mb-4">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                    <Search size={16} className="text-[#0b66d6]" />
                    Buscar por paciente o doctor
                </div>
                <div className="flex items-center gap-3">
                    {/* El botón de búsqueda vive dentro del input (a la derecha), la
                        clase pr-10 reserva ese espacio para que el texto escrito nunca
                        lo toque. El input nativo ya hace scroll del texto hacia la
                        izquierda por su cuenta. */}
                    <div className="relative max-w-md w-full">
                        <input
                            type="text"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSearch(); } }}
                            placeholder="Nombre del paciente o del doctor..."
                            className="w-full border border-slate-200 rounded-lg pl-3 pr-10 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#0b66d6]"
                        />
                        <button
                            type="button"
                            onClick={handleSearch}
                            aria-label="Buscar"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 flex items-center justify-center rounded-md text-slate-400 hover:text-[#0b66d6] hover:bg-slate-100 transition-colors"
                        >
                            <Search size={15} />
                        </button>
                    </div>
                    {filters.search && (
                        <button
                            type="button"
                            onClick={clearSearch}
                            className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-red-500 border border-slate-200 hover:border-red-200 rounded-lg px-3 py-1.5 transition-colors"
                        >
                            <X size={14} />
                            Limpiar
                        </button>
                    )}
                </div>
            </div>

            <div className="flex items-start justify-between">
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
                            min={MIN_DATE_STR}
                            max={MAX_DATE_STR}
                            value={filters.dateFrom || ""}
                            onChange={(e) => onChange({ dateFrom: e.target.value })}
                            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#0b66d6]"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-slate-500 mb-1">Hasta</label>
                        <input
                            type="date"
                            min={MIN_DATE_STR}
                            max={MAX_DATE_STR}
                            value={filters.dateTo || ""}
                            onChange={(e) => onChange({ dateTo: e.target.value })}
                            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#0b66d6]"
                        />
                    </div>
                    {/* Solo aparece si hay una fecha puesta, es la única forma de volver
                        a la vista general una vez que se parametrizó el filtro. */}
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
        </div>
    );
};

export default AppointmentFilters;