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
  // Puede ser stock, usage o adjust.
  const [modal, setModal]         = useState(null);
  const [selectedMovement, setSelectedMovement] = useState(null);
  // Distancia entre el inicio de MovementsTable y el inicio real de
  // su tabla interna (después de su propia barra de filtro y la de
  // búsqueda de GenericTable), reportada en vivo. Sirve para bajar
  // el panel de detalle la misma distancia, de modo que quede
  // alineado con la tabla.
  const [tableOffset, setTableOffset] = useState(0);
  // Filas extra para que la tabla rellene el espacio en blanco que
  // deja debajo cuando el panel derecho (detalle y acciones
  // rápidas) queda más alto que ella, por ejemplo al desplegar el
  // bloque de acciones rápidas. Al cerrarse esa card el panel
  // vuelve a bajar y esto recalcula el valor a 0, devolviendo la
  // tabla a lo que la paginación normal muestra.
  const [extraRows, setExtraRows] = useState(0);
  // Antes de la primera carga real, la columna izquierda muestra
  // fugazmente la tabla vacía, justo antes de que loadMovements
  // active el estado de carga. Si esa altura fantasma se llegaba a
  // usar como referencia, quedaba grabada sin forma de corregirla
  // después (ver el motivo por el que ya no se depende de una
  // referencia fija más abajo). Este flag evita que el efecto de
  // abajo mida algo hasta que existan datos reales o un resultado
  // vacío real.
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const leftColRef  = useRef(null);
  const rightColRef = useRef(null);
  // Alto aproximado de una fila de MovementsTable, sumando el
  // padding de cada celda y su contenido. Solo se usa para estimar
  // cuántas filas hacen falta para cubrir la diferencia, no
  // necesita ser exacto, ya que la siguiente medición ajusta el
  // valor si sobra o falta un poco.
  const ROW_HEIGHT_ESTIMATE = 57;
  // Siempre apunta al recalc más reciente (ver el useLayoutEffect de abajo), para poder
  // dispararlo manualmente desde handleItemsPerPageChange sin duplicar la lógica.
  const recalcRef = useRef(() => {});

  useLayoutEffect(() => {
    if (!hasLoadedOnce) return;
    const left = leftColRef.current;
    const right = rightColRef.current;
    if (!left || !right) return;

    // Solo se observa el elemento right, nunca left. Si también se
    // observara left, agregar filas cambiaría su tamaño, lo que
    // dispararía otra medición que podría volver a cambiar
    // extraRows y así sucesivamente, generando un parpadeo en la
    // tabla.
    //
    // En este punto, left ya incluye las filas extra que el render
    // actual está mostrando, así que se resta esa altura estimada
    // para obtener su borde inferior natural, es decir, el que
    // tendría con cero filas extra. Restar la altura de las filas
    // extra en cada medición hace que el cálculo se autocorrija
    // solo cada vez que se dispara, sin importar si una medición
    // anterior fue imprecisa.
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

  // Si el usuario cambia cuántas filas por página se muestran, la
  // relación entre left y extraRows cambia de base. El recálculo
  // ocurre una vez que la tabla termina de renderizar con el
  // tamaño nuevo, por eso se usa requestAnimationFrame. La función
  // recalc se autocorrige sola, como se explica en el comentario
  // anterior.
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

  // Selecciona automáticamente el primer movimiento al cargar, con
  // el mismo patrón que las páginas de pacientes, doctores,
  // enfermeras y recepcionistas. Sin esto, el panel de detalle
  // empezaría siempre vacío.
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

      {/* Tabla, alertas y acciones rápidas (mismo layout y
          componente que el dashboard de inventario) */}
      {/* La clase items-start evita que la cuadrícula estire ambas
          columnas a la altura de la más alta. Sin ella no se podía
          medir la altura real de cada una (ver extraRows arriba), y
          quedaba un hueco en blanco debajo de la tabla en vez de
          rellenarlo con más filas. */}
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
        {/* Panel de detalle del movimiento seleccionado primero,
            bajado la misma distancia que tableOffset para quedar
            alineado con el inicio real de la tabla y no con su
            barra de filtro y búsqueda, y debajo el bloque de
            acciones rápidas. */}
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

      {/* A todo el ancho de la pantalla, no solo el ancho de la
          tabla. Cada una toma su propia altura para poder
          colapsarse de forma independiente. */}
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
