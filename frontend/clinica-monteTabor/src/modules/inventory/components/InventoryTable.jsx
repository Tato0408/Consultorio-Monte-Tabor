import { useState, useEffect, useCallback } from "react";
import { Search, Filter, Pencil, MoreVertical, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { getInsumos, deleteInsumo } from "../../../services/insumosService";

const CATEGORIAS = ["Todas", "Curación", "Protección", "Desinfección", "Procedimiento", "EPI", "Limpieza"];
const ESTADOS    = ["Todos", "Disponible", "Bajo", "Crítico"];

const statusStyle = {
  Disponible: "bg-green-100 text-green-600",
  Bajo:       "bg-orange-100 text-orange-500",
  Crítico:    "bg-red-100 text-red-500",
};

const getStatus = (item) => {
  if (item.stock <= 0) return "Crítico";
  if (item.stock <= item.min_stock) return "Bajo";
  return "Disponible";
};

const fmtDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-SV", { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
};

const InventoryTable = ({ onEdit, onRefresh, refreshTrigger }) => {
  const [items, setItems]       = useState([]);
  const [total, setTotal]       = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage]         = useState(1);
  const [search, setSearch]     = useState("");
  const [category, setCategory] = useState("Todas");
  const [status, setStatus]     = useState("Todos");
  const [loading, setLoading]   = useState(false);
  const [openMenu, setOpenMenu] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 8 };
      if (search)                params.search   = search;
      if (category !== "Todas")  params.category = category;
      if (status   !== "Todos")  params.status   = status;
      const data = await getInsumos(params);
      setItems(data.insumos);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, category, status, refreshTrigger]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, category, status]);

  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar este producto?")) return;
    await deleteInsumo(id);
    onRefresh?.();
    load();
    setOpenMenu(null);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
      {/* toolbar */}
      <div className="p-4 flex flex-wrap gap-3 items-center border-b border-slate-100">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Buscar producto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-1">
          <span className="text-xs text-slate-400 mr-1">Categoría</span>
          <select
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-1">
          <span className="text-xs text-slate-400 mr-1">Estado</span>
          <select
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {ESTADOS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>

        <button className="flex items-center gap-1.5 text-sm border border-slate-200 rounded-lg px-3 py-2 hover:bg-slate-50">
          <Filter className="w-4 h-4 text-slate-400" />
          Filtros
        </button>
      </div>

      {/* table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left text-xs text-slate-400 font-normal px-4 py-3">Producto</th>
              <th className="text-left text-xs text-slate-400 font-normal px-4 py-3">Categoría</th>
              <th className="text-left text-xs text-slate-400 font-normal px-4 py-3">Stock actual</th>
              <th className="text-left text-xs text-slate-400 font-normal px-4 py-3">Estado</th>
              <th className="text-left text-xs text-slate-400 font-normal px-4 py-3">Último uso</th>
              <th className="text-left text-xs text-slate-400 font-normal px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} className="text-center py-10 text-slate-400">Cargando...</td></tr>
            )}
            {!loading && items.length === 0 && (
              <tr><td colSpan={6} className="text-center py-10 text-slate-400">Sin resultados</td></tr>
            )}
            {!loading && items.map((item) => {
              const st = getStatus(item);
              return (
                <tr key={item._id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 text-xs overflow-hidden flex-shrink-0">
                        {item.image
                          ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                          : "📦"}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800 leading-tight">{item.name}</p>
                        <p className="text-xs text-slate-400">{item.description || item.supplier || ""}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{item.category}</td>
                  <td className="px-4 py-3">
                    <span className="font-semibold text-slate-800">{item.stock}</span>
                    <span className="text-slate-400 ml-1 text-xs">{item.unit_measure}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyle[st]}`}>{st}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{fmtDate(item.last_used)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 relative">
                      <button
                        onClick={() => onEdit?.(item)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setOpenMenu(openMenu === item._id ? null : item._id)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>
                      {openMenu === item._id && (
                        <div className="absolute right-0 top-8 z-20 bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-32">
                          <button
                            onClick={() => handleDelete(item._id)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Eliminar
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* pagination */}
      <div className="px-4 py-3 flex items-center justify-between border-t border-slate-100">
        <span className="text-xs text-slate-400">
          Mostrando {items.length > 0 ? (page - 1) * 8 + 1 : 0} a {Math.min(page * 8, total)} de {total} productos
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`w-8 h-8 rounded-lg text-sm ${p === page ? "bg-blue-600 text-white" : "border border-slate-200 hover:bg-slate-50 text-slate-600"}`}
            >
              {p}
            </button>
          ))}
          {totalPages > 5 && <span className="text-slate-400 text-sm">...</span>}
          {totalPages > 5 && (
            <button onClick={() => setPage(totalPages)} className="w-8 h-8 rounded-lg text-sm border border-slate-200 hover:bg-slate-50 text-slate-600">
              {totalPages}
            </button>
          )}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default InventoryTable;
