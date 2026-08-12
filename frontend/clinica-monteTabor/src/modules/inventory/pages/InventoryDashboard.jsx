import { useState, useEffect, useCallback } from "react";
import { Download, Plus } from "lucide-react";
import useInsumos from "../hooks/useInsumos";

import InventoryStats    from "../components/InventoryStats";
import InventoryTable    from "../components/InventoryTable";
import InventoryAlertsRow from "../components/InventoryAlertsRow";
import QuickActionsCard  from "../components/QuickActionsCard";
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

  const { getStats } = useInsumos();
  const [stats, setStats]           = useState(null);
  const [refresh, setRefresh]       = useState(0);
  const [modal, setModal]           = useState(null); // "add" | "edit" | "stock" | "usage" | "adjust"
  const [editItem, setEditItem]     = useState(null);
  // Distancia (en px) entre el inicio de InventoryTable y el inicio real de su <table> (después
  // de su fila de título/búsqueda) — reportada en vivo por GenericTable, para bajar "Acciones
  // rápidas" exactamente lo mismo y que quede alineada con la tabla, no con esos controles.
  const [tableOffset, setTableOffset] = useState(0);

  const loadStats = useCallback(() => {
    getStats().then(setStats).catch(() => {});
  }, [refresh]);

  useEffect(() => { loadStats(); }, [loadStats]);

  const triggerRefresh = () => setRefresh((r) => r + 1);

  return (
    <div className="p-4 sm:p-8 bg-white min-h-screen w-full font-sans text-slate-700">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Inventario</h1>
          <p className="text-sm text-slate-400 mt-1">Gestiona los insumos médicos y el stock de tu clínica</p>
        </div>
        {/* sm:mt-8 la baja a la misma altura que el botón "Guardar cambios" de Horarios, para
            que no choque con la campana de notificaciones (fixed, ver MainLayout.jsx). */}
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

      <InventoryStats stats={stats} />

      {/* items-start: cada columna toma su propia altura de contenido en vez de estirarse a la
          de la más alta — necesario para que la medición de arriba sea real. */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6 items-start">
        <div className="lg:col-span-8">
          <InventoryTable
            onEdit={(item) => { setEditItem(item); setModal("edit"); }}
            onRefresh={triggerRefresh}
            refreshTrigger={refresh}
            canUpdate={canUpdate}
            canDelete={canDelete}
            onTableOffsetChange={setTableOffset}
          />
        </div>
        <div className="lg:col-span-4">
          <div style={{ marginTop: tableOffset }}>
            <QuickActionsCard
              onStockEntry={() => setModal("stock")}
              onManualUsage={() => setModal("usage")}
              onAdjust={() => setModal("adjust")}
            />
          </div>
        </div>
      </div>

      {/* A todo el ancho de la pantalla (no solo el ancho de la tabla), y ambas del mismo
          largo (CollapsibleCard ya se estira con h-full para igualar la más alta). */}
      <div className="mt-6">
        <InventoryAlertsRow stats={stats} />
      </div>

      <div className="mt-6">
        <TreatmentUsage />
      </div>

      <div className="mt-6">
        <InventoryCharts refreshTrigger={refresh} />
      </div>

      <div className="mt-6">
        <RecentMovements refreshTrigger={refresh} />
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
