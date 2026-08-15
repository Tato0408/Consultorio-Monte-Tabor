import { PackageSearch, Calendar, Hash, User, FileText } from "lucide-react";
import { TYPE_LABEL, TYPE_STYLE, fmtMovementDate } from "../utils/movementTypes";

// Panel de detalle del movimiento seleccionado — mismo estilo que las cards de perfil de
// usuario (PatientProfileCard.jsx, DoctorProfileCard.jsx, etc.): header azul + filas
// icono/etiqueta/valor. El detalle completo del movimiento solo vive aquí; la tabla
// (MovementsTable.jsx) ya no muestra la columna "Detalle".
const MovementDetailCard = ({ movement }) => {
  if (!movement) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400 text-xs font-medium h-[300px] flex items-center justify-center shadow-sm">
        Selecciona un movimiento de la lista para ver sus detalles.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
      <div className="bg-blue-600 pt-8 pb-6 px-4 flex flex-col items-center justify-center text-white">
        <div className="w-16 h-16 rounded-full border-2 border-white/40 overflow-hidden flex items-center justify-center mb-3 bg-blue-500">
          <PackageSearch className="w-8 h-8 text-white/90" strokeWidth={1.5} />
        </div>
        <h3 className="text-[15px] font-semibold text-center px-2 leading-tight">
          {movement.itemName}
        </h3>
        <span className={`mt-2 px-2.5 py-1 rounded-full text-xs font-medium ${TYPE_STYLE[movement.type] ?? "bg-white/20 text-white"}`}>
          {TYPE_LABEL[movement.type] ?? movement.type}
        </span>
      </div>

      <div className="p-5 flex flex-col gap-4">
        <h4 className="text-[13px] font-bold text-gray-900 mb-1">Detalle del movimiento</h4>

        <div className="flex items-center gap-3">
          <Calendar className="w-[18px] h-[18px] text-blue-600" strokeWidth={2} />
          <div className="flex flex-col">
            <span className="text-[11px] text-gray-400 font-medium leading-tight">Fecha</span>
            <span className="text-[13px] font-medium text-gray-800">{fmtMovementDate(movement.date)}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Hash className="w-[18px] h-[18px] text-blue-600" strokeWidth={2} />
          <div className="flex flex-col">
            <span className="text-[11px] text-gray-400 font-medium leading-tight">Cantidad</span>
            <span className={`text-[13px] font-semibold ${movement.quantity >= 0 ? "text-green-600" : "text-red-500"}`}>
              {movement.quantity >= 0 ? `+${movement.quantity}` : movement.quantity} uds.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <User className="w-[18px] h-[18px] text-blue-600" strokeWidth={2} />
          <div className="flex flex-col">
            <span className="text-[11px] text-gray-400 font-medium leading-tight">Usuario</span>
            <span className="text-[13px] font-medium text-gray-800">{movement.user || "—"}</span>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <FileText className="w-[18px] h-[18px] text-blue-600 mt-0.5" strokeWidth={2} />
          <div className="flex flex-col">
            <span className="text-[11px] text-gray-400 font-medium leading-tight">Detalle</span>
            <span className="text-[13px] font-medium text-gray-800">{movement.detail || "—"}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MovementDetailCard;
