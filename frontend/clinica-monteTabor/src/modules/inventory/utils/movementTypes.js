export const TYPE_LABEL = {
  "Treatment use":        "Uso en tratamiento",
  "Stock entry":          "Entrada de stock",
  "Inventory adjustment": "Ajuste de inventario",
  "Manual use":           "Uso manual",
};

export const TYPE_STYLE = {
  "Treatment use":        "bg-blue-100 text-blue-600",
  "Stock entry":          "bg-green-100 text-green-600",
  "Inventory adjustment": "bg-orange-100 text-orange-500",
  "Manual use":           "bg-purple-100 text-purple-600",
};

export const fmtMovementDate = (d) =>
  new Date(d).toLocaleDateString("es-SV", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
