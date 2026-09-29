// Estado de stock de un insumo, comparado contra su stock mínimo. Compartido
// entre InventoryTable.jsx (columna Estado) y ProductDetailCard.jsx (panel de
// detalle), para no calcularlo dos veces con lógica que podría desincronizarse.
export const getStockStatus = (item) => {
  if (item.stock <= 0) return "Crítico";
  if (item.stock <= item.min_stock) return "Bajo";
  return "Disponible";
};

export const STOCK_STATUS_STYLE = {
  Disponible: "bg-green-50 text-green-700",
  Bajo: "bg-orange-50 text-orange-600",
  Crítico: "bg-red-50 text-red-700",
};

export const STOCK_STATUS_DOT = {
  Disponible: "bg-green-500",
  Bajo: "bg-orange-500",
  Crítico: "bg-red-500",
};
