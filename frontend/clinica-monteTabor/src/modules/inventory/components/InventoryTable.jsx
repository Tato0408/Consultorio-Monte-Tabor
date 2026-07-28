import { useState, useEffect, useCallback } from "react";
import { Clock, Package, MoreVertical, Edit2, Trash2, Pencil } from "lucide-react";
import useInsumos from "../hooks/useInsumos";
import GenericTable from "@/components/ui/GenericTable";

const statusStyle = {
  Disponible: "bg-green-50 text-green-700",
  Bajo:       "bg-orange-50 text-orange-600",
  Crítico:    "bg-red-50 text-red-700",
};

const getStatus = (item) => {
  if (item.stock <= 0) return "Crítico";
  if (item.stock <= item.min_stock) return "Bajo";
  return "Disponible";
};

const fmtDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-SV", { 
    month: "short", 
    day: "2-digit", 
    hour: "2-digit", 
    minute: "2-digit" 
  });
};

const InventoryTable = ({ onEdit, onRefresh, refreshTrigger, canUpdate = true, canDelete = true }) => {
  const { getInsumos, deleteInsumo } = useInsumos();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState(null);

 
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: 1, limit: 100 }; 
      const data = await getInsumos(params);
      setItems(data.insumos || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [refreshTrigger]); 

  useEffect(() => { 
    load(); 
  }, [load]);

  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar este producto?")) return;
    await deleteInsumo(id);
    onRefresh?.();
    load();
    setActiveMenuId(null);
  };

  const columns = [
    {
      header: "Producto",
      render: (item) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 text-xs overflow-hidden flex-shrink-0">
            {item.image ? (
              <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
            ) : (
              "📦"
            )}
          </div>
          <div>
            <p className="font-medium text-slate-900 leading-tight">{item.name}</p>
            <p className="text-xs text-slate-400 mt-0.5">{item.description || item.supplier || "Sin descripción"}</p>
          </div>
        </div>
      ),
    },
    {
      header: "Categoría",
      render: (item) => <span className="text-slate-600">{item.category}</span>,
    },
    {
      header: "Stock actual",
      render: (item) => (
        <div>
          <span className="font-semibold text-slate-800">{item.stock}</span>
          <span className="text-slate-400 ml-1 text-xs">{item.unit_measure || "uds"}</span>
        </div>
      ),
    },
    {
      header: "Estado",
      render: (item) => {
        const st = getStatus(item);
        return (
          <span className={`inline-flex items-center gap-1.5 font-medium px-2.5 py-1 rounded-full text-xs ${statusStyle[st]}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              st === "Disponible" ? "bg-green-500" : st === "Bajo" ? "bg-orange-500" : "bg-red-500"
            }`} />
            {st}
          </span>
        );
      },
    },
    {
      header: "Último uso",
      render: (item) => <span className="text-slate-500 text-xs">{fmtDate(item.last_used)}</span>,
    },
    ...(canUpdate || canDelete
      ? [
          {
            header: "Acciones",
            align: "right",
            render: (item, index, openUpwards) => {
              const isMenuOpen = activeMenuId === item._id;

              return (
                <div className="flex items-center justify-end gap-1 relative">
                  {canUpdate && (
                    <button
                      type="button"
                      onClick={() => onEdit?.(item)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenuId(isMenuOpen ? null : item._id);
                    }}
                    className={`p-1.5 rounded-lg hover:bg-gray-100 transition-colors ${
                      isMenuOpen ? "bg-gray-100 text-gray-900" : "text-gray-400"
                    }`}
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {isMenuOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(null);
                        }}
                      />
                      <div
                        className={`absolute w-36 bg-white border border-gray-100 rounded-xl shadow-xl py-1.5 z-30 text-left right-2 ${
                          openUpwards ? "bottom-full mb-1" : "top-full mt-1"
                        } animate-in fade-in slide-in-from-bottom-1 duration-100`}
                      >
                        {canUpdate && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(null);
                              if (onEdit) onEdit(item);
                            }}
                            className="w-full px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-gray-400" />
                            Editar Completo
                          </button>
                        )}

                        {canUpdate && canDelete && <div className="border-t border-gray-50 my-1" />}

                        {canDelete && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(null);
                              handleDelete(item._id);
                            }}
                            className="w-full px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50/60 flex items-center gap-2 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                            Eliminar
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            },
          },
        ]
      : []),
  ];

  return (
    <GenericTable
      title="Inventario de insumos clínicos"
      placeholderSearch="Buscar insumo o producto..."
      data={items}
      columns={columns}
      loading={loading}
      searchFields={["name", "category", "description"]}
    />
  );
};

export default InventoryTable;