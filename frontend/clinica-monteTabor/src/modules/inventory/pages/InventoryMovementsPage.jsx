import { useState, useEffect, useCallback, useLayoutEffect, useRef } from "react";
import { Download } from "lucide-react";
import useInsumos from "../hooks/useInsumos";

import MovementsStats from "../components/MovementsStats";
import MovementsTable from "../components/MovementsTable";
import MovementDetailCard from "../components/MovementDetailCard";
import InventoryAlertsRow from "../components/InventoryAlertsRow";
import QuickActionsCard  from "../components/QuickActionsCard";
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
  const [selectedMovement, setSelectedMovement] = useState(null);
  // Distancia entre el inicio de MovementsTable y el inicio real de su <table> (después de su
  // propia barra de filtro y la de búsqueda de GenericTable) — reportada en vivo, para bajar
  // el panel de detalle exactamente lo mismo y que quede alineado con la tabla en sí.
  const [tableOffset, setTableOffset] = useState(0);
  // Filas extra para que la tabla rellene el espacio en blanco que deja debajo cuando el panel
  // derecho (detalle + acciones rápidas) queda más alto que ella — ej. al desplegar "Acciones
  // rápidas". Al cerrarse esa card el panel vuelve a bajar y esto recalcula a 0, devolviendo la
  // tabla a lo que la paginación normal muestra.
  const [extraRows, setExtraRows] = useState(0);
  const leftColRef  = useRef(null);
  const rightColRef = useRef(null);
  // Borde inferior (viewport Y) de la tabla SIN filas extra (extraRows=0) — se vuelve a
  // capturar cada vez que extraRows está en 0. Es la referencia contra la que se compara el
  // borde inferior del panel derecho. Usamos "bottom" (no "height") porque el panel derecho
  // arranca más abajo que la tabla (marginTop: tableOffset, para alinearlo con el <table> real
  // y no con la barra de filtros) — comparar solo alturas ignoraba ese desplazamiento y
  // subestimaba el espacio en blanco real que quedaba debajo de la tabla.
  const baseBottomRef = useRef(null);
  // Alto aproximado de una fila de MovementsTable (py-4 en cada celda + el contenido) — solo
  // se usa para estimar cuántas filas hacen falta para cubrir la diferencia, no necesita ser
  // exacto: si sobra/falta un poco, la siguiente medición lo vuelve a ajustar.
  const ROW_HEIGHT_ESTIMATE = 57;
  // Siempre apunta al recalc más reciente (ver el useLayoutEffect de abajo), para poder
  // dispararlo manualmente desde handleItemsPerPageChange sin duplicar la lógica.
  const recalcRef = useRef(() => {});

  useLayoutEffect(() => {
    const left = leftColRef.current;
    const right = rightColRef.current;
    if (!left || !right) return;

    // Importante: solo se observa "right". Si también observáramos "left", agregar filas
    // cambiaría su tamaño, lo que dispararía otra medición que podía volver a cambiar
    // extraRows y así sucesivamente — ese ciclo era la tabla "parpadeando". Al comparar
    // siempre contra la altura BASE (capturada únicamente cuando extraRows es 0, con la
    // forma funcional de setExtraRows) el resultado ya no depende de los cambios que el
    // propio ajuste provoca en la tabla.
    const recalc = () => {
      setExtraRows((prevExtra) => {
        if (prevExtra === 0) {
          baseBottomRef.current = left.getBoundingClientRect().bottom;
        }
        const base = baseBottomRef.current ?? left.getBoundingClientRect().bottom;
        const diff = right.getBoundingClientRect().bottom - base;
        return diff > ROW_HEIGHT_ESTIMATE / 2 ? Math.ceil(diff / ROW_HEIGHT_ESTIMATE) : 0;
      });
    };
    recalcRef.current = recalc;
    recalc();
    const ro = new ResizeObserver(recalc);
    ro.observe(right);
    return () => ro.disconnect();
  }, [movements, selectedMovement]);

  // Si el usuario cambia cuántas filas por página quiere VER (8, 15, 25...) mientras el panel
  // ya tenía filas extra, la altura BASE que teníamos guardada quedó calculada con el tamaño de
  // página ANTERIOR y ya no sirve — se invalida y se vuelve a medir una vez que la tabla
  // termine de re-renderizar con el tamaño nuevo (por eso el requestAnimationFrame).
  const handleItemsPerPageChange = useCallback(() => {
    baseBottomRef.current = null;
    setExtraRows(0);
    requestAnimationFrame(() => recalcRef.current());
  }, []);

  const loadMovements = useCallback(() => {
    setLoading(true);
    getMovements(500)
      .then(setMovements)
      .catch(() => setMovements([]))
      .finally(() => setLoading(false));
  }, [refresh]);

  // Selección automática del primer movimiento al cargar (mismo patrón que Pacientes/Doctores/
  // Enfermeras/Recepcionistas) — sin esto, el panel de detalle empezaría siempre vacío.
  useEffect(() => {
    if (movements.length > 0) {
      const exists = movements.find((m) => m._id === selectedMovement?._id);
      if (!exists) setSelectedMovement(movements[0]);
    } else {
      setSelectedMovement(null);
    }
  }, [movements, selectedMovement]);

  const loadStats = useCallback(() => {
    getStats().then(setStats).catch(() => {});
  }, [refresh]);

  useEffect(() => { loadMovements(); loadStats(); }, [loadMovements, loadStats]);

  const triggerRefresh = () => setRefresh((r) => r + 1);

  return (
    <div className="p-4 sm:p-8 bg-white min-h-screen w-full font-sans text-slate-700">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Movimientos de inventario</h1>
          <p className="text-sm text-slate-400 mt-1">Historial de entradas, salidas y ajustes de stock</p>
        </div>
        {/* sm:mt-8 la baja a la misma altura que el botón "Guardar cambios" de Horarios, para
            que no choque con la campana de notificaciones (fixed, ver MainLayout.jsx). */}
        <div className="flex items-center gap-3 sm:flex-shrink-0 sm:mt-8">
          <button className="flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 font-medium">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Exportar reporte</span>
            <span className="sm:hidden">Exportar</span>
          </button>
        </div>
      </div>

      <MovementsStats movements={movements} loading={loading} />

      {/* Tabla + alertas / acciones rápidas (mismo layout y componente que el dashboard de inventario) */}
      {/* items-start: sin esto, grid estira ambas columnas a la altura de la más alta por
          defecto — lo que impedía medir la altura REAL de cada una (ver extraRows arriba) y
          dejaba un hueco en blanco debajo de la tabla en vez de rellenarlo con más filas. */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6 items-start">
        <div className="lg:col-span-8" ref={leftColRef}>
          <MovementsTable
            movements={movements}
            loading={loading}
            onSelectMovement={setSelectedMovement}
            onTableOffsetChange={setTableOffset}
            extraRows={extraRows}
            onItemsPerPageChange={handleItemsPerPageChange}
          />
        </div>
        {/* Panel de detalle del movimiento seleccionado primero, bajado exactamente lo mismo
            que tableOffset para que quede alineado con el inicio real de la tabla (no con el
            de su barra de filtro/búsqueda), y debajo "Acciones rápidas". */}
        <div className="lg:col-span-4 flex flex-col gap-5" style={{ marginTop: tableOffset }} ref={rightColRef}>
          <MovementDetailCard movement={selectedMovement} />
          <QuickActionsCard
            onStockEntry={() => setModal("stock")}
            onManualUsage={() => setModal("usage")}
            onAdjust={() => setModal("adjust")}
          />
        </div>
      </div>

      {/* A todo el ancho de la pantalla (no solo el ancho de la tabla); cada una toma su
          propia altura para poder colapsarse de forma independiente. */}
      <div className="mt-6">
        <InventoryAlertsRow stats={stats} />
      </div>

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
