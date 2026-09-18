import { useState, useEffect, useCallback } from "react";
import { MoreVertical, Edit2, Trash2, Pencil } from "lucide-react";
import useInsumos from "../hooks/useInsumos";
import GenericTable from "@/components/ui/GenericTable";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { showError, confirmDelete } from "@/lib/alerts";
import { getExpiryDays, getExpiryStatus } from "../utils/expiry";

const statusStyle = {
  Disponible: "bg-green-50 text-green-700",
  Bajo:       "bg-orange-50 text-orange-600",
  Crítico:    "bg-red-50 text-red-700",
};

const expiryStyle = {
  Vigente:            "bg-green-50 text-green-700",
  "Próximo a vencer":  "bg-orange-50 text-orange-600",
  Caduco:             "bg-red-50 text-red-700",
};

// Mismo catálogo que ProductAddMode.jsx (no se comparte en un módulo aparte, sigue el
// mismo criterio que ese archivo: es una lista corta y fija, no vale la pena una fuente
// de verdad compartida para esto).
const CATEGORIAS = ["Curación", "Protección", "Desinfección", "Procedimiento", "EPI", "Limpieza"];
const ESTADOS = ["Disponible", "Bajo", "Crítico"];
const CADUCIDADES = ["Vigente", "Próximo a vencer", "Caduco"];

// El filtro por estado de stock vive como tabs sobre la tabla, mismo
// criterio que Tratamientos y Consultas, en vez del dropdown que tenía antes.
const ESTADO_TABS = [{ key: "Todos", label: "Todos" }, ...ESTADOS.map((e) => ({ key: e, label: e }))];

// Determina el estado del insumo según su stock actual comparado
// con el stock mínimo definido.
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

const InventoryTable = ({ onEdit, onRefresh, refreshTrigger, canUpdate = true, canDelete = true, onTableOffsetChange }) => {
  const { getInsumos, deleteInsumo } = useInsumos();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState(null);
  // GET /inventory ya soporta category y status como query params (ver
  // inventoryController.getAll), pero antes esta tabla nunca los mandaba: eran
  // filtros del backend sin ninguna forma de usarlos desde la interfaz.
  const [category, setCategory] = useState("Todas");
  const [status, setStatus] = useState("Todos");
  const [expiry, setExpiry] = useState("Todas");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: 1,
        limit: 100,
        category: category !== "Todas" ? category : undefined,
        status: status !== "Todos" ? status : undefined,
        expiry: expiry !== "Todas" ? expiry : undefined,
      };
      const data = await getInsumos(params);
      setItems(data.insumos || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [refreshTrigger, category, status, expiry]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (id, name) => {
    // Era el único botón de eliminar de Inventario sin el aviso estándar de "acción
    // irreversible" (confirm() nativo del navegador, sin poder personalizar el mensaje
    // con el nombre del producto).
    const confirmed = await confirmDelete({
      title: "¿Eliminar este producto?",
      text: name ? `Se eliminará "${name}". Esta acción no se puede deshacer.` : "Esta acción no se puede deshacer.",
    });
    if (!confirmed) return;
    try {
      await deleteInsumo(id);
      onRefresh?.();
      load();
    } catch (err) {
      showError(err.message || "No se pudo eliminar el producto.");
    } finally {
      setActiveMenuId(null);
    }
  };

  const columns = [
    {
      header: "Producto",
      render: (item) => (
        <div>
          <p className="font-medium text-slate-900 leading-tight">{item.name}</p>
          <p className="text-xs text-slate-400 mt-0.5">{item.description || item.supplier || "Sin descripción"}</p>
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
      header: "Caducidad",
      render: (item) => {
        if (!item.expiration_date) return <span className="text-slate-400 text-xs">—</span>;
        const days = getExpiryDays(item.expiration_date);
        const est = getExpiryStatus(item.expiration_date);
        const label = days <= 0 ? "Vencido" : est === "Próximo a vencer" ? `${days} días` : "Vigente";
        return (
          <span className={`inline-flex items-center gap-1.5 font-medium px-2.5 py-1 rounded-full text-xs ${expiryStyle[est]}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              est === "Vigente" ? "bg-green-500" : est === "Próximo a vencer" ? "bg-orange-500" : "bg-red-500"
            }`} />
            {label}
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
                            Editar completo
                          </button>
                        )}

                        {canUpdate && canDelete && <div className="border-t border-gray-50 my-1" />}

                        {canDelete && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(null);
                              handleDelete(item._id, item.name);
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

  const tabsRow = (
    <div className="flex items-center gap-1 border-b border-slate-100 overflow-x-auto">
      {ESTADO_TABS.map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={() => setStatus(t.key)}
          className={`px-3 py-2 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
            status === t.key
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );

  return (
    <GenericTable
      title="Inventario de insumos clínicos"
      placeholderSearch="Buscar insumo o producto..."
      data={items}
      columns={columns}
      loading={loading}
      searchFields={["name", "category", "description"]}
      onTableOffsetChange={onTableOffsetChange}
      tabsRow={tabsRow}
      headerLeft={
        <>
          <h2 className="text-base font-semibold text-slate-800 whitespace-nowrap flex-shrink-0">
            Productos / Insumos
          </h2>
          <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-xl px-3 h-[38px]">
            <span className="text-xs text-gray-400 font-normal whitespace-nowrap">Categoría</span>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-7 border-none bg-transparent p-0 shadow-none focus:ring-0 gap-1 text-gray-800 font-semibold text-xs min-w-[80px]">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent sideOffset={6}>
                <SelectItem value="Todas">Todas</SelectItem>
                {CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-xl px-3 h-[38px]">
            <span className="text-xs text-gray-400 font-normal whitespace-nowrap">Caducidad</span>
            <Select value={expiry} onValueChange={setExpiry}>
              <SelectTrigger className="h-7 border-none bg-transparent p-0 shadow-none focus:ring-0 gap-1 text-gray-800 font-semibold text-xs min-w-[90px]">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent sideOffset={6}>
                <SelectItem value="Todas">Todas</SelectItem>
                {CADUCIDADES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </>
      }
    />
  );
};

export default InventoryTable;