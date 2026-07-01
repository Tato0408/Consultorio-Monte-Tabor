import { useState } from "react";
import { Search, Filter, Plus, MoreVertical } from "lucide-react";

const StatusBadge = ({ active }) => (
  <span
    className={`inline-block text-[11px] font-semibold px-3 py-0.5 rounded-full border ${
      active
        ? "bg-green-50 text-green-700 border-green-200"
        : "bg-red-50 text-red-600 border-red-200"
    }`}
  >
    {active ? "Activo" : "Inactivo"}
  </span>
);

const SkeletonRow = () => (
  <tr className="border-b border-gray-50">
    {[1, 2, 3, 4].map((i) => (
      <td key={i} className="px-4 py-3">
        <div className="h-3 bg-gray-100 rounded animate-pulse w-3/4" />
      </td>
    ))}
    <td className="px-4 py-3">
      <div className="h-5 w-14 bg-gray-100 rounded-full animate-pulse" />
    </td>
    <td className="px-4 py-3" />
  </tr>
);

const NurseTable = ({ nurses, loading, selectedNurse, onSelect, onAdd }) => {
  const [search, setSearch]   = useState("");
  const [filterActive, setFilterActive] = useState(null); // null = todos

  const filtered = nurses.filter((n) => {
    const fullName = `${n.name} ${n.last_name}`.toLowerCase();
    const matchSearch = fullName.includes(search.toLowerCase()) || (n.dui || "").includes(search);
    const matchFilter = filterActive === null ? true : n.is_active === filterActive;
    return matchSearch && matchFilter;
  });

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm flex flex-col">
      {/* Header de la tabla */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
        <h3 className="font-bold text-gray-900 text-sm">Administración de enfermeras</h3>
      </div>

      {/* Barra de búsqueda y acciones */}
      <div className="flex items-center gap-3 px-5 py-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar enfermera..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400 transition-colors"
          />
        </div>

        {/* Filtro rápido activo/inactivo */}
        <div className="relative group">
          <button
            type="button"
            className="flex items-center gap-1.5 border border-gray-200 text-gray-600 text-xs font-semibold px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <Filter className="w-3.5 h-3.5" />
            {filterActive === null ? "Filtrar" : filterActive ? "Activos" : "Inactivos"}
          </button>
          <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 min-w-[130px] overflow-hidden hidden group-focus-within:block hover:block">
            {[
              { label: "Todos", value: null },
              { label: "Activos", value: true },
              { label: "Inactivos", value: false },
            ].map((opt) => (
              <button
                key={String(opt.value)}
                type="button"
                onClick={() => setFilterActive(opt.value)}
                className={`w-full text-left px-4 py-2.5 text-xs font-medium transition-colors ${
                  filterActive === opt.value ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-colors shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          Añadir Enfermera
        </button>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              {["Nombre", "Apellido", "DUI", "Teléfono", "Status", "Acción"].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? [0, 1, 2, 3, 4, 5].map((i) => <SkeletonRow key={i} />)
              : filtered.length === 0
              ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-400">
                    No se encontraron enfermeras
                  </td>
                </tr>
              )
              : filtered.map((nurse) => {
                  const isSelected = selectedNurse?._id === nurse._id;
                  return (
                    <tr
                      key={nurse._id}
                      onClick={() => onSelect(nurse)}
                      className={`border-b border-gray-50 cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-blue-50/70"
                          : "hover:bg-gray-50/60"
                      }`}
                    >
                      <td className="px-4 py-3 font-medium text-gray-800">{nurse.name}</td>
                      <td className="px-4 py-3 text-gray-600">{nurse.last_name}</td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">{nurse.dui || "—"}</td>
                      <td className="px-4 py-3 text-gray-500">{nurse.phone || "—"}</td>
                      <td className="px-4 py-3">
                        <StatusBadge active={nurse.is_active} />
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={(e) => e.stopPropagation()}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default NurseTable;