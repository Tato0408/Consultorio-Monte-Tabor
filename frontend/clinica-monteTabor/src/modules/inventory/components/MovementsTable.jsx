import { useState } from "react";
import GenericTable from "@/components/ui/GenericTable";
import { TYPE_LABEL, TYPE_STYLE, fmtMovementDate } from "../utils/movementTypes";

// Mismas pestañas que antes vivían como <select>, ahora como tabs (mismo
// estilo que TreatmentsPatientsTable.jsx).
const TYPE_FILTERS = [
  { value: "all", label: "Todos los tipos" },
  { value: "Stock entry", label: TYPE_LABEL["Stock entry"] },
  { value: "Treatment use", label: TYPE_LABEL["Treatment use"] },
  { value: "Manual use", label: TYPE_LABEL["Manual use"] },
  { value: "Inventory adjustment", label: TYPE_LABEL["Inventory adjustment"] },
];

const MovementsTable = ({ movements, loading, onSelectMovement, onTableOffsetChange, extraRows = 0, onItemsPerPageChange }) => {
  const [typeFilter, setTypeFilter] = useState("all");

  const filtered = typeFilter === "all"
    ? movements
    : movements.filter((m) => m.type === typeFilter);

  const data = filtered.map((m) => ({
    ...m,
    typeLabel: TYPE_LABEL[m.type] ?? m.type,
  }));

  const columns = [
    {
      header: "Fecha",
      render: (m) => <span className="text-xs text-slate-500 whitespace-nowrap">{fmtMovementDate(m.date)}</span>,
    },
    {
      header: "Tipo",
      render: (m) => (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_STYLE[m.type] ?? "bg-slate-100 text-slate-500"}`}>
          {m.typeLabel}
        </span>
      ),
    },
    {
      header: "Producto",
      render: (m) => <span className="text-sm text-slate-700 font-medium">{m.itemName}</span>,
    },
    {
      header: "Cantidad",
      render: (m) => (
        <span className={`text-sm font-semibold ${m.quantity >= 0 ? "text-green-600" : "text-red-500"}`}>
          {m.quantity >= 0 ? `+${m.quantity}` : m.quantity} uds.
        </span>
      ),
    },
    {
      header: "Usuario",
      render: (m) => <span className="text-sm text-slate-500">{m.user || "—"}</span>,
    },
  ];

  // Pestañas de tipo de movimiento (mismo estilo que TreatmentsPatientsTable.jsx),
  // por encima de la barra de búsqueda de GenericTable.
  const typeTabs = (
    <div className="flex items-center gap-1 mb-4 border-b border-slate-100 overflow-x-auto">
      {TYPE_FILTERS.map((f) => (
        <button
          key={f.value}
          type="button"
          onClick={() => setTypeFilter(f.value)}
          className={`px-3 py-2 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
            typeFilter === f.value
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  );

  return (
    <GenericTable
      title="Movimientos de inventario"
      placeholderSearch="Buscar por producto, detalle o usuario..."
      data={data}
      columns={columns}
      loading={loading}
      searchFields={["itemName", "detail", "user", "typeLabel"]}
      onRowClick={onSelectMovement}
      onTableOffsetChange={onTableOffsetChange}
      extraRows={extraRows}
      onItemsPerPageChange={onItemsPerPageChange}
      tabsRow={typeTabs}
      // La tabla rellena el espacio en blanco que deja debajo (ver
      // extraRows más arriba), así que paginar de 5 en 5 no sirve
      // de nada, ya que siempre quedaría relleno con filas extra.
      pageSizeOptions={[8, 10]}
    />
  );
};

export default MovementsTable;
