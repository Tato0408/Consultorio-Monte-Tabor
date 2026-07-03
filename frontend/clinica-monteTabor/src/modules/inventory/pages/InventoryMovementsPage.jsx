import { useState, useEffect, useCallback } from "react";
import { Download } from "lucide-react";
import useInsumos from "../hooks/useInsumos";

import MovementsStats from "../components/MovementsStats";
import MovementsTable from "../components/MovementsTable";
import InventoryAlerts   from "../components/InventoryAlerts";
import ModalStockEntry  from "../components/ModalStockEntry";
import ModalManualUsage from "../components/ModalManualUsage";
import ModalAdjustStock from "../components/ModalAdjustStock";

const InventoryMovementsPage = () => {
  const { getMovements, getStats } = useInsumos();
  const [movements, setMovements] = useState([]);
  const [stats, setStats]         = useState(null);
  const [loading, setLoading]     = useState(false);
  const [refresh, setRefresh]     = useState(0);
  const [modal, setModal]         = useState(null); // "stock" | "usage" | "adjust"

  const loadMovements = useCallback(() => {
    setLoading(true);
    getMovements(500)
      .then(setMovements)
      .catch(() => setMovements([]))
      .finally(() => setLoading(false));
  }, [refresh]);

  const loadStats = useCallback(() => {
    getStats().then(setStats).catch(() => {});
  }, [refresh]);

  useEffect(() => { loadMovements(); loadStats(); }, [loadMovements, loadStats]);

  const triggerRefresh = () => setRefresh((r) => r + 1);

  return (
    <div className="p-4 sm:p-8 bg-white min-h-screen w-full font-sans text-slate-700">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Movimientos de inventario</h1>
          <p className="text-sm text-slate-400 mt-1">Historial de entradas, salidas y ajustes de stock</p>
        </div>
        <div className="flex items-center gap-3 sm:flex-shrink-0">
          <button className="flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 font-medium">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Exportar reporte</span>
            <span className="sm:hidden">Exportar</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <MovementsStats movements={movements} loading={loading} />

      {/* Tabla + alertas / acciones rápidas (mismo layout y componente que el dashboard de inventario) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
        <div className="lg:col-span-8">
          <MovementsTable movements={movements} loading={loading} />
        </div>
        <div className="lg:col-span-4">
          <InventoryAlerts
            stats={stats}
            onStockEntry={() => setModal("stock")}
            onManualUsage={() => setModal("usage")}
            onAdjust={() => setModal("adjust")}
          />
        </div>
      </div>

      {/* Modals */}
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

export default InventoryMovementsPage;
