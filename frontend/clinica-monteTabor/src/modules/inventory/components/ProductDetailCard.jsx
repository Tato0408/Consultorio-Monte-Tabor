import { Package, Boxes, Tag, CalendarClock, Truck, FileText, Edit2, Trash2 } from "lucide-react";
import { getExpiryLabel, getExpiryStatus } from "../utils/expiry";
import { getStockStatus, STOCK_STATUS_STYLE, STOCK_STATUS_DOT } from "../utils/stockStatus";

const expiryStyle = {
  Vigente: "bg-green-50 text-green-700",
  "Próximo a vencer": "bg-orange-50 text-orange-600",
  Caduco: "bg-red-50 text-red-700",
};

const fmtDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-SV", { day: "2-digit", month: "short", year: "numeric" });
};

// Panel de detalle del producto seleccionado en InventoryTable.jsx. Mismo
// patrón que MovementDetailCard.jsx (usado en Movimientos): encabezado azul
// con ícono y nombre, luego filas de ícono + etiqueta + valor.
const ProductDetailCard = ({ product, onEdit, onDelete, canUpdate = true, canDelete = true }) => {
  if (!product) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400 text-xs font-medium h-[300px] flex items-center justify-center shadow-sm">
        Selecciona un producto de la lista para ver su información.
      </div>
    );
  }

  const stockStatus = getStockStatus(product);
  const expiryStatus = getExpiryStatus(product.expiration_date);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
      <div className="bg-blue-600 pt-8 pb-6 px-4 flex flex-col items-center justify-center text-white">
        <div className="w-16 h-16 rounded-full border-2 border-white/40 overflow-hidden flex items-center justify-center mb-3 bg-blue-500">
          <Package className="w-8 h-8 text-white/90" strokeWidth={1.5} />
        </div>
        <h3 className="text-[15px] font-semibold text-center px-2 leading-tight">
          {product.name}
        </h3>
        <span className="mt-2 px-2.5 py-1 rounded-full text-xs font-medium bg-white/20 text-white">
          {product.category || "Sin categoría"}
        </span>
      </div>

      <div className="p-5 flex flex-col gap-4">
        <h4 className="text-[13px] font-bold text-gray-900 mb-1">Detalle del producto</h4>

        <div className="flex items-center gap-3">
          <Boxes className="w-[18px] h-[18px] text-blue-600 shrink-0" strokeWidth={2} />
          <div className="flex flex-col min-w-0">
            <span className="text-[11px] text-gray-400 font-medium leading-tight">Stock actual</span>
            <span className="flex items-center gap-2 flex-wrap">
              <span className="text-[13px] font-semibold text-gray-800">
                {product.stock} {product.unit_measure || "uds"}
              </span>
              <span className={`inline-flex items-center gap-1.5 font-medium px-2 py-0.5 rounded-full text-[11px] ${STOCK_STATUS_STYLE[stockStatus]}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${STOCK_STATUS_DOT[stockStatus]}`} />
                {stockStatus}
              </span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Tag className="w-[18px] h-[18px] text-blue-600 shrink-0" strokeWidth={2} />
          <div className="flex flex-col min-w-0">
            <span className="text-[11px] text-gray-400 font-medium leading-tight">Stock mínimo</span>
            <span className="text-[13px] font-medium text-gray-800">{product.min_stock ?? "—"}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <CalendarClock className="w-[18px] h-[18px] text-blue-600 shrink-0" strokeWidth={2} />
          <div className="flex flex-col min-w-0">
            <span className="text-[11px] text-gray-400 font-medium leading-tight">Caducidad</span>
            {product.expiration_date ? (
              <span className="flex items-center gap-2 flex-wrap">
                <span className="text-[13px] font-medium text-gray-800">{fmtDate(product.expiration_date)}</span>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${expiryStyle[expiryStatus]}`}>
                  {getExpiryLabel(product.expiration_date)}
                </span>
              </span>
            ) : (
              <span className="text-[13px] font-medium text-gray-800">Sin fecha registrada</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Truck className="w-[18px] h-[18px] text-blue-600 shrink-0" strokeWidth={2} />
          <div className="flex flex-col min-w-0">
            <span className="text-[11px] text-gray-400 font-medium leading-tight">Proveedor</span>
            <span className="text-[13px] font-medium text-gray-800">{product.supplier || "—"}</span>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <FileText className="w-[18px] h-[18px] text-blue-600 mt-0.5 shrink-0" strokeWidth={2} />
          <div className="flex flex-col min-w-0">
            <span className="text-[11px] text-gray-400 font-medium leading-tight">Descripción</span>
            <span className="text-[13px] font-medium text-gray-800 break-words">{product.description || "—"}</span>
          </div>
        </div>
      </div>

      {/* Editar/eliminar el producto seleccionado, mismo patrón que la gestión de
          usuarios (DoctorProfileCard.jsx, PatientProfileCard.jsx, etc.) — ya no vive
          en una columna de Acciones dentro de la tabla. */}
      {(canUpdate || canDelete) && (
        <div className="grid grid-cols-2 gap-2.5 p-5 pt-0">
          {canUpdate && (
            <button
              type="button"
              onClick={() => onEdit?.(product)}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border border-blue-200 text-blue-600 text-xs font-semibold hover:bg-blue-50 transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Editar
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              onClick={() => onDelete?.(product)}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Eliminar
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductDetailCard;
