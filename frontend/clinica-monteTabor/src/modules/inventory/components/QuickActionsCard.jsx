import { BookOpen, PackagePlus, ClipboardList, ShoppingCart } from "lucide-react";
import CollapsibleCard from "@/components/ui/CollapsibleCard";

// El bloque de acciones rápidas queda solo en el panel lateral, ya
// que las alertas de inventario y los productos próximos a vencer
// se muestran debajo de la tabla (ver InventoryAlertsRow.jsx).
//
// canCreateMovement / canUpdateMovement vienen del permiso
// inventory.movements (crear / editar). Registrar uso manual y
// registrar entrada de stock son POST (crear); ajuste de inventario
// es un POST a /:id/adjust que cuenta como editar. Si el rol no tiene
// ninguna de las dos acciones, la card no se muestra.
const QuickActionsCard = ({
  onManualUsage,
  onStockEntry,
  onAdjust,
  canCreateMovement = true,
  canUpdateMovement = true,
  defaultOpen = true,
}) => {
  const actions = [
    { label: "Registrar uso manual",       icon: BookOpen,      color: "text-blue-600 bg-blue-50",     fn: onManualUsage, show: canCreateMovement },
    { label: "Registrar entrada de stock", icon: PackagePlus,   color: "text-green-600 bg-green-50",    fn: onStockEntry,  show: canCreateMovement },
    { label: "Ajuste de inventario",       icon: ClipboardList, color: "text-orange-500 bg-orange-50",  fn: onAdjust,      show: canUpdateMovement },
    { label: "Generar orden de compra",    icon: ShoppingCart,  color: "text-purple-600 bg-purple-50",  fn: null,          show: canCreateMovement },
  ].filter((a) => a.show);

  if (actions.length === 0) return null;

  return (
    <CollapsibleCard title="Acciones rápidas" defaultOpen={defaultOpen}>
      <div className="flex flex-col gap-1">
        {actions.map(({ label, icon: Icon, color, fn }) => (
          <button
            key={label}
            onClick={fn}
            className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors text-left"
          >
            <div className={`p-2 rounded-lg ${color}`}>
              <Icon className="w-4 h-4" />
            </div>
            <span className="text-sm text-slate-700">{label}</span>
          </button>
        ))}
      </div>
    </CollapsibleCard>
  );
};

export default QuickActionsCard;
