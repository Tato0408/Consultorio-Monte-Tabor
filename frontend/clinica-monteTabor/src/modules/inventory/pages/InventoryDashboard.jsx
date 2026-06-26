import { useState, useEffect, useCallback } from "react";
import { Download, Plus } from "lucide-react";
import { getStats } from "../../../services/insumosService";

import InventoryStats    from "../components/InventoryStats";
import InventoryTable    from "../components/InventoryTable";
import InventoryAlerts   from "../components/InventoryAlerts";
import TreatmentUsage    from "../components/TreatmentUsage";
import InventoryCharts   from "../components/InventoryCharts";
import RecentMovements   from "../components/RecentMovements";
import ModalAgregarProducto from "../components/ProductAddMode";
import ModalStockEntry   from "../components/ModalStockEntry";
import ModalManualUsage  from "../components/ModalManualUsage";
import ModalAdjustStock  from "../components/ModalAdjustStock";

const InventoryDashboard = () => {
  const [stats, setStats]           = useState(null);
  const [refresh, setRefresh]       = useState(0);
  const [modal, setModal]           = useState(null); // "add" | "edit" | "stock" | "usage" | "adjust"
  const [editItem, setEditItem]     = useState(null);

  const loadStats = useCallback(() => {
    getStats().then(setStats).catch(() => {});
  }, [refresh]);

  useEffect(() => { loadStats(); }, [loadStats]);

  const triggerRefresh = () => setRefresh((r) => r + 1);

  return (
    <div className="p-8 bg-white min-h-screen w-full font-sans text-slate-700">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Inventario</h1>
          <p className="text-sm text-slate-400 mt-1">Gestiona los insumos médicos y el stock de tu clínica</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 font-medium">
            <Download className="w-4 h-4" />
            Exportar reporte
          </button>
          <button
            onClick={() => setModal("add")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Agregar producto
          </button>
        </div>
      </div>

      {/* Stats */}
      <InventoryStats stats={stats} />

      {/* Table + Sidebar */}
      <div className="grid grid-cols-12 gap-6 mt-6">
        <div className="col-span-8">
          <h2 className="text-base font-semibold text-slate-800 mb-3">Productos / Insumos</h2>
          <InventoryTable
            onEdit={(item) => { setEditItem(item); setModal("edit"); }}
            onRefresh={triggerRefresh}
            refreshTrigger={refresh}
          />
        </div>
        <div className="col-span-4">
          <InventoryAlerts
            stats={stats}
            onStockEntry={() => setModal("stock")}
            onManualUsage={() => setModal("usage")}
            onAdjust={() => setModal("adjust")}
          />
        </div>
      </div>

      {/* Treatment usage */}
      <div className="mt-6">
        <TreatmentUsage />
      </div>

      {/* Charts */}
      <div className="mt-6">
        <InventoryCharts refreshTrigger={refresh} />
      </div>

      {/* Recent movements */}
      <div className="mt-6">
        <RecentMovements refreshTrigger={refresh} />
      </div>

      {/* Modals */}
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
