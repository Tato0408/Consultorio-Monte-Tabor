import { useState, useEffect, useCallback, useLayoutEffect, useRef } from "react";
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
  // Antes de la primera carga real, "left" muestra fugazmente la tabla VACÍA (movements=[],
  // loading=false, un instante antes de que loadMovements() ponga loading=true) — si esa altura
  // fantasma se llegaba a usar como referencia, quedaba grabada y ya no había forma de
  // corregirla (ver por qué abajo ya no se necesita una referencia "congelada"). Este flag evita
  // que el efecto de abajo mida nada hasta que ya haya datos reales (o un resultado vacío real).
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const leftColRef  = useRef(null);
  const rightColRef = useRef(null);
  // Alto aproximado de una fila de MovementsTable (py-4 en cada celda + el contenido) — solo
  // se usa para estimar cuántas filas hacen falta para cubrir la diferencia, no necesita ser
  // exacto: si sobra/falta un poco, la siguiente medición lo vuelve a ajustar.
  const ROW_HEIGHT_ESTIMATE = 57;
  // Siempre apunta al recalc más reciente (ver el useLayoutEffect de abajo), para poder
  // dispararlo manualmente desde handleItemsPerPageChange sin duplicar la lógica.
  const recalcRef = useRef(() => {});

  useLayoutEffect(() => {
    if (!hasLoadedOnce) return;
    const left = leftColRef.current;
    const right = rightColRef.current;
    if (!left || !right) return;

    // Importante: solo se observa "right", nunca "left" — si también observáramos "left",
    // agregar filas cambiaría su tamaño, lo que dispararía otra medición que podía volver a
    // cambiar extraRows y así sucesivamente (la tabla "parpadeando").
    //
    // "left" en este momento YA incluye prevExtra filas de más (las que el render actual está
    // mostrando), así que le restamos esa altura estimada para obtener su borde inferior
    // NATURAL (con 0 filas extra). Antes esto se resolvía guardando esa altura natural en un
    // ref y solo "recapturándola" cuando extraRows volvía a valer exactamente 0 — pero si esa
    // captura ocurría en un mal momento (ej. contra la tabla vacía de antes de cargar datos),
    // quedaba grabada mal PARA SIEMPRE, porque nada garantizaba que extraRows fuera a volver a
    // tocar 0 de nuevo. Restar la altura de las filas extra en cada medición, en vez de
    // depender de una referencia congelada, hace que el cálculo se autocorrija solo cada vez
    // que se dispara, sin importar si una medición anterior fue imprecisa.
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
  }, [hasLoadedOnce, movements, selectedMovement]);

  // Si el usuario cambia cuántas filas por página quiere VER (8, 15, 25...), la relación entre
  // "left" y extraRows cambió de base — se recalcula una vez que la tabla termine de
  // re-renderizar con el tamaño nuevo (por eso el requestAnimationFrame). Ya no hace falta
  // forzar extraRows a 0 primero: recalc() se autocorrige solo (ver comentario arriba).
  const handleItemsPerPageChange = useCallback(() => {
    requestAnimationFrame(() => recalcRef.current());
  }, []);

  const loadMovements = useCallback(() => {
    setLoading(true);
    getMovements(500)
      .then(setMovements)
      .catch(() => setMovements([]))
      .finally(() => {
        setLoading(false);
        setHasLoadedOnce(true);
      });
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
            defaultOpen={false}
          />
        </div>
      </div>

      {/* A todo el ancho de la pantalla (no solo el ancho de la tabla); cada una toma su
          propia altura para poder colapsarse de forma independiente. */}
      <div className="mt-6">
        <InventoryAlertsRow stats={stats} defaultOpen={false} />
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
