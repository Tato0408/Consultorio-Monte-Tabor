import { useState } from "react";
import GenericTable from "@/components/ui/GenericTable";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { TYPE_LABEL, TYPE_STYLE, fmtMovementDate } from "../utils/movementTypes";

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

  // Va en la misma fila que el buscador de GenericTable (prop headerLeft) — antes vivía en su
  // propia fila arriba del buscador, dejando espacio en blanco a la derecha de ambos.
  const typeFilterControl = (
    <div className="flex items-center gap-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-xl px-3 h-[42px] w-fit flex-shrink-0">
      <span className="text-xs text-slate-400 font-normal whitespace-nowrap">Filtrar por tipo</span>
      <Select value={typeFilter} onValueChange={setTypeFilter}>
        <SelectTrigger className="h-7 border-none bg-transparent p-0 shadow-none focus:ring-0 gap-1 text-slate-800 font-semibold text-xs min-w-[150px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent sideOffset={6}>
          {TYPE_FILTERS.map((f) => (
            <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
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
      headerLeft={typeFilterControl}
      // La tabla rellena el espacio en blanco que deja debajo (ver extraRows más arriba), así
      // que paginar de 5 en 5 no sirve de nada — siempre quedaría relleno con filas extra.
      pageSizeOptions={[8, 10]}
    />
  );
};

export default MovementsTable;
