import { useState, useEffect, useCallback, useLayoutEffect, useRef } from "react";
import { Download, Plus } from "lucide-react";
import useInsumos from "../hooks/useInsumos";
import { showError, confirmDelete } from "@/lib/alerts";

import InventoryStats    from "../components/InventoryStats";
import InventoryTable    from "../components/InventoryTable";
import InventoryAlertsRow from "../components/InventoryAlertsRow";
import QuickActionsCard  from "../components/QuickActionsCard";
import ProductDetailCard from "../components/ProductDetailCard";
import TreatmentUsage    from "../components/TreatmentUsage";
import InventoryCharts   from "../components/InventoryCharts";
import RecentMovements   from "../components/RecentMovements";
import ModalAgregarProducto from "../components/ProductAddMode";
import ModalStockEntry   from "../components/ModalStockEntry";
import ModalManualUsage  from "../components/ModalManualUsage";
import ModalAdjustStock  from "../components/ModalAdjustStock";
import { useAuth } from "@/context/AuthContext";

const InventoryDashboard = () => {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission("inventory.products", "create");
  const canUpdate = hasPermission("inventory.products", "update");
  const canDelete = hasPermission("inventory.products", "delete");
  // Movimientos de inventario: entrada de stock y uso manual son "crear",
  // el ajuste de stock es "editar" (ver inventory.js).
  const canCreateMovement = hasPermission("inventory.movements", "create");
  const canUpdateMovement = hasPermission("inventory.movements", "update");
  // Las tarjetas de estadísticas/gráficas y la tabla de movimientos
  // recientes viven en esta misma pantalla pero piden datos de otros dos
  // módulos aparte de inventory.products (ver MODULE_VIEW_DEPENDENCIES en
  // rolesConfig.js): sin estos permisos, GET /inventory/stats,
  // /inventory/charts y /inventory/movements devuelven 403. Antes esto se
  // pedía siempre, sin importar el permiso, y el 403 silencioso dejaba las
  // tarjetas en $NaN/guiones y la tabla de movimientos sin cargar nunca.
  const canViewReports = hasPermission("inventory.reports", "view");
  const canViewMovements = hasPermission("inventory.movements", "view");
  // "Insumos utilizados por tratamiento" pide GET /procedures, un cuarto
  // módulo aparte de los otros tres (ver TreatmentUsage.jsx).
  const canViewProcedures = hasPermission("procedures", "view");

  const { getStats, deleteInsumo } = useInsumos();
  const [stats, setStats]           = useState(null);
  const [refresh, setRefresh]       = useState(0);
  // Puede ser add, edit, stock, usage o adjust.
  const [modal, setModal]           = useState(null);
  const [editItem, setEditItem]     = useState(null);
  // Distancia en píxeles entre el inicio de InventoryTable y el
  // inicio real de su tabla interna (después de la fila de título y
  // búsqueda), reportada en vivo por GenericTable. Sirve para bajar
  // el bloque de acciones rápidas la misma distancia, de modo que
  // quede alineado con la tabla y no con esos controles superiores.
  const [tableOffset, setTableOffset] = useState(0);
  // Productos cargados en InventoryTable, reportados hacia arriba (mismo
  // criterio que tableOffset) para poder seleccionar uno por defecto y
  // mostrar su detalle en ProductDetailCard, arriba de las Acciones rápidas.
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  // Filas extra para que la tabla rellene el espacio en blanco que deja debajo cuando
  // el panel derecho (detalle de producto + acciones rápidas) queda más alto que ella —
  // por ejemplo al desplegar el bloque de Acciones rápidas. Al retraerse ese bloque el
  // panel vuelve a bajar y esto recalcula el valor a 0. Mismo mecanismo que
  // InventoryMovementsPage.jsx.
  const [extraRows, setExtraRows] = useState(0);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const leftColRef  = useRef(null);
  const rightColRef = useRef(null);
  const ROW_HEIGHT_ESTIMATE = 57;
  const recalcRef = useRef(() => {});

  // Selecciona automáticamente el primer producto al cargar (o si el
  // seleccionado ya no está en la lista, ej. tras un filtro o eliminación),
  // mismo patrón que MovementDetailCard en InventoryMovementsPage.jsx.
  useEffect(() => {
    if (products.length > 0) {
      const exists = products.find((p) => p._id === selectedProduct?._id);
      if (!exists) setSelectedProduct(products[0]);
    } else {
      setSelectedProduct(null);
    }
    setHasLoadedOnce(true);
  }, [products, selectedProduct]);

  useLayoutEffect(() => {
    if (!hasLoadedOnce) return;
    const left = leftColRef.current;
    const right = rightColRef.current;
    if (!left || !right) return;

    const recalc = () => {
      setExtraRows((prevExtra) => {
        const naturalBottom = left.getBoundingClientRect().bottom - prevExtra * ROW_HEIGHT_ESTIMATE;
        const diff = right.getBoundingClientRect().bottom - naturalBottom;
        return diff > ROW_HEIGHT_ESTIMATE / 2 ? Math.ceil(diff / ROW_HEIGHT_ESTIMATE) : 0;
      });
    };
    recalcRef.current = recalc;
    recalc();
    const ro = new ResizeObserver(recalc);
    ro.observe(right);
    return () => ro.disconnect();
  }, [hasLoadedOnce, products, selectedProduct]);

  const handleItemsPerPageChange = useCallback(() => {
    requestAnimationFrame(() => recalcRef.current());
  }, []);

  const loadStats = useCallback(() => {
    if (!canViewReports) { setStats(null); return; }
    getStats().then(setStats).catch(() => {});
  }, [refresh, canViewReports]);

  useEffect(() => { loadStats(); }, [loadStats]);

  const triggerRefresh = () => setRefresh((r) => r + 1);

  const handleDeleteProduct = async (product) => {
    const confirmed = await confirmDelete({
      title: "¿Eliminar este producto?",
      text: product?.name ? `Se eliminará "${product.name}". Esta acción no se puede deshacer.` : "Esta acción no se puede deshacer.",
    });
    if (!confirmed) return;
    try {
      await deleteInsumo(product._id);
      setSelectedProduct(null);
      triggerRefresh();
    } catch (err) {
      showError(err.message || "No se pudo eliminar el producto.");
    }
  };

  return (
    <div className="p-4 sm:p-8 bg-white min-h-screen w-full font-sans text-slate-700">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Inventario</h1>
          <p className="text-sm text-slate-400 mt-1">Gestiona los insumos médicos y el stock de tu clínica</p>
        </div>
        {/* La clase sm:mt-8 baja este bloque a la misma altura que el
            botón Guardar cambios de Horarios, para que no choque con
            la campana de notificaciones (fixed, ver MainLayout.jsx). */}
        <div className="flex items-center gap-3 sm:flex-shrink-0 sm:mt-8">
          <button className="flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 font-medium">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Exportar reporte</span>
            <span className="sm:hidden">Exportar</span>
          </button>
          {canCreate && (
            <button
              onClick={() => setModal("add")}
              className="flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Agregar producto</span>
              <span className="sm:hidden">Agregar</span>
            </button>
          )}
        </div>
      </div>

      <InventoryStats stats={stats} canView={canViewReports} />

      {/* La clase items-start hace que cada columna tome su propia
          altura de contenido en vez de estirarse a la más alta. Esto
          es necesario para que la medición de arriba sea real. */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6 items-start">
        <div className="lg:col-span-8" ref={leftColRef}>
          <InventoryTable
            refreshTrigger={refresh}
            onTableOffsetChange={setTableOffset}
            onItemsChange={setProducts}
            onSelectItem={setSelectedProduct}
            extraRows={extraRows}
            onItemsPerPageChange={handleItemsPerPageChange}
          />
        </div>
        {/* Detalle del producto seleccionado primero, y debajo Acciones rápidas
            (retraída por defecto): al desplegarla, este panel derecho crece y
            extraRows hace que la tabla de la izquierda se rellene con más filas
            hasta alcanzar la misma altura, en vez de dejar espacio en blanco
            debajo — mismo mecanismo que InventoryMovementsPage.jsx. */}
        <div className="lg:col-span-4 flex flex-col gap-5" style={{ marginTop: tableOffset }} ref={rightColRef}>
          <ProductDetailCard
            product={selectedProduct}
            onEdit={(item) => { setEditItem(item); setModal("edit"); }}
            onDelete={handleDeleteProduct}
            canUpdate={canUpdate}
            canDelete={canDelete}
          />
          <QuickActionsCard
            onStockEntry={() => setModal("stock")}
            onManualUsage={() => setModal("usage")}
            onAdjust={() => setModal("adjust")}
            canCreateMovement={canCreateMovement}
            canUpdateMovement={canUpdateMovement}
            defaultOpen={false}
          />
        </div>
      </div>

      {/* A todo el ancho de la pantalla (no solo el ancho de la tabla), y ambas del mismo
          largo (CollapsibleCard ya se estira con h-full para igualar la más alta). */}
      <div className="mt-6">
        <InventoryAlertsRow stats={stats} canView={canViewReports} />
      </div>

      <div className="mt-6">
        <TreatmentUsage canView={canViewProcedures} />
      </div>

      <div className="mt-6">
        <InventoryCharts refreshTrigger={refresh} canView={canViewReports} />
      </div>

      <div className="mt-6">
        <RecentMovements refreshTrigger={refresh} canView={canViewMovements} />
      </div>

      {modal === "add" && (
        <ModalAgregarProducto
          onClose={() => setModal(null)}
          onSuccess={triggerRefresh}
        />
      )}
      {modal === "edit" && editItem && (
        <ModalAgregarProducto
          onClose={() => { setModal(null); setEditItem(null); }}
          onSuccess={triggerRefresh}
          item={editItem}
        />
      )}
      {modal === "stock" && (
        <ModalStockEntry
          onClose={() => setModal(null)}
          onSuccess={triggerRefresh}
        />
      )}
      {modal === "usage" && (
        <ModalManualUsage
          onClose={() => setModal(null)}
          onSuccess={triggerRefresh}
        />
      )}
      {modal === "adjust" && (
        <ModalAdjustStock
          onClose={() => setModal(null)}
          onSuccess={triggerRefresh}
        />
      )}
    </div>
  );
};

export default InventoryDashboard;
