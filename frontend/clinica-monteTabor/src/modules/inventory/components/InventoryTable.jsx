import { useState, useEffect, useCallback, useRef } from "react";
import useInsumos from "../hooks/useInsumos";
import GenericTable from "@/components/ui/GenericTable";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { getExpiryDays, getExpiryStatus } from "../utils/expiry";
import { getStockStatus, STOCK_STATUS_STYLE, STOCK_STATUS_DOT } from "../utils/stockStatus";

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

const fmtDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-SV", { 
    month: "short", 
    day: "2-digit", 
    hour: "2-digit", 
    minute: "2-digit" 
  });
};

const InventoryTable = ({ refreshTrigger, onTableOffsetChange, onSelectItem, onItemsChange, extraRows, onItemsPerPageChange }) => {
  const { getInsumos } = useInsumos();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  // GET /inventory ya soporta category y status como query params (ver
  // inventoryController.getAll), pero antes esta tabla nunca los mandaba: eran
  // filtros del backend sin ninguna forma de usarlos desde la interfaz.
  const [category, setCategory] = useState("Todas");
  const [status, setStatus] = useState("Todos");
  const [expiry, setExpiry] = useState("Todas");
  // Cancela la petición anterior si seguía en curso: sin esto, cambiar de filtro rápido
  // (Categoría/Caducidad/Estado) antes de que la carga previa respondiera podía dejar la
  // tabla mostrando el resultado de un filtro VIEJO si esa respuesta vieja llegaba
  // después que la más reciente (orden de red no garantizado) — mismo patrón que
  // useAppointment.js.
  const abortControllerRef = useRef(null);

  const load = useCallback(async () => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    try {
      const params = {
        page: 1,
        limit: 100,
        category: category !== "Todas" ? category : undefined,
        status: status !== "Todos" ? status : undefined,
        expiry: expiry !== "Todas" ? expiry : undefined,
      };
      const data = await getInsumos(params, controller.signal);
      setItems(data.insumos || []);
      onItemsChange?.(data.insumos || []);
    } catch (err) {
      if (err?.name === "AbortError") return;
      setItems([]);
      onItemsChange?.([]);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [refreshTrigger, category, status, expiry]);

  useEffect(() => {
    load();
  }, [load]);

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
        const st = getStockStatus(item);
        return (
          <span className={`inline-flex items-center gap-1.5 font-medium px-2.5 py-1 rounded-full text-xs ${STOCK_STATUS_STYLE[st]}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${STOCK_STATUS_DOT[st]}`} />
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
    // Sin columna de Acciones: editar/eliminar viven ahora en ProductDetailCard.jsx,
    // sobre el producto seleccionado (mismo criterio que la gestión de usuarios:
    // DoctorProfileCard.jsx, PatientProfileCard.jsx, etc.).
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
      placeholderSearch="Buscar"
      data={items}
      columns={columns}
      loading={loading}
      searchFields={["name", "category", "description"]}
      onTableOffsetChange={onTableOffsetChange}
      onRowClick={onSelectItem}
      extraRows={extraRows}
      onItemsPerPageChange={onItemsPerPageChange}
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