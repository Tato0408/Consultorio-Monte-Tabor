import { User, Gift, CreditCard, Phone, Mail, Edit2, Trash2 } from "lucide-react";

const ReceptionistProfileCard = ({ receptionist, onEdit, onDelete, canUpdate = true, canDelete = true }) => {
  if (!receptionist) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400 text-xs font-medium h-[400px] flex items-center justify-center shadow-sm">
        Selecciona un recepcionista de la lista para ver sus detalles.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
      <div className="bg-blue-600 pt-8 pb-6 px-4 flex flex-col items-center justify-center text-white">
        <div className="w-16 h-16 rounded-full border-2 border-white/40 overflow-hidden flex items-center justify-center mb-3 bg-blue-500">
          {receptionist.img_url ? (
            <img
              src={receptionist.img_url}
              alt={`${receptionist.name} ${receptionist.last_name}`}
              className="w-full h-full object-cover"
              onError={(e) => { e.target.style.display = "none"; }}
            />
          ) : (
            <User className="w-8 h-8 text-white/90" strokeWidth={1.5} />
          )}
        </div>

        <h3 className="text-[15px] font-semibold text-center px-2 leading-tight">
          {receptionist.name} {receptionist.last_name}
        </h3>
      </div>

      <div className="p-5 flex flex-col gap-4">
        <h4 className="text-[13px] font-bold text-gray-900 mb-1">Acerca</h4>

        <div className="flex items-center gap-3">
          <Gift className="w-[18px] h-[18px] text-blue-600" strokeWidth={2} />
          <div className="flex flex-col">
            <span className="text-[11px] text-gray-400 font-medium leading-tight">Edad</span>
            <span className="text-[13px] font-medium text-gray-800">
              {receptionist.birth_date
                ? `${new Date().getFullYear() - new Date(receptionist.birth_date).getFullYear()} años`
                : "—"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <CreditCard className="w-[18px] h-[18px] text-blue-600" strokeWidth={2} />
          <div className="flex flex-col">
            <span className="text-[11px] text-gray-400 font-medium leading-tight">DUI</span>
            <span className="text-[13px] font-medium text-gray-800">{receptionist.dui || "—"}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Phone className="w-[18px] h-[18px] text-blue-600" strokeWidth={2} />
          <div className="flex flex-col">
            <span className="text-[11px] text-gray-400 font-medium leading-tight">Teléfono</span>
            <span className="text-[13px] font-medium text-gray-800">{receptionist.phone || "—"}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Mail className="w-[18px] h-[18px] text-blue-600" strokeWidth={2} />
          <div className="flex flex-col overflow-hidden">
            <span className="text-[11px] text-gray-400 font-medium leading-tight">Email</span>
            <span className="text-[13px] font-medium text-gray-800 truncate max-w-[200px]">
              {receptionist.email || "—"}
            </span>
          </div>
        </div>

        <div className="mt-2 border border-blue-100 rounded-[20px] p-3 flex items-center justify-center gap-2">
          <span className={`w-2 h-2 rounded-full ${receptionist.is_active ? "bg-green-500" : "bg-red-500"}`} />
          <span className={`text-xs font-semibold ${receptionist.is_active ? "text-green-700" : "text-red-700"}`}>
            {receptionist.is_active ? "Activo" : "Inactivo"}
          </span>
        </div>
      </div>

      {/* Acciones: reemplazan el menú "..." que antes vivía en la tabla (RecepcionistTable.jsx) —
          misma función (onEdit/onDelete), ahora aplicadas al recepcionista seleccionado. */}
      {(canUpdate || canDelete) && (
        <div className="grid grid-cols-2 gap-2.5 p-5 pt-0">
          {canUpdate && (
            <button
              type="button"
              onClick={() => onEdit?.(receptionist)}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border border-blue-200 text-blue-600 text-xs font-semibold hover:bg-blue-50 transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Editar
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              onClick={() => onDelete?.(receptionist._id)}
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

export default ReceptionistProfileCard;
