import { Gift, CreditCard, Phone, Mail, UserPlus2, Edit2, Trash2 } from "lucide-react";
import PatientAvatar from "@/components/ui/PatientAvatar";

const PatientProfileCard = ({ patient, onEdit, onDelete, canUpdate = true, canDelete = true }) => {
  if (!patient) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400 text-xs font-medium h-[400px] flex items-center justify-center shadow-sm">
        Selecciona un paciente de la lista para ver sus detalles.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
      <div className="bg-blue-600 pt-8 pb-6 px-4 flex flex-col items-center justify-center text-white">
        <PatientAvatar
          name={patient.name}
          lastName={patient.last_name}
          gender={patient.gender}
          active={patient.is_active}
          size="lg"
          className="border-2 border-white/40 mb-3"
        />
        <h3 className="text-[15px] font-semibold text-center px-2 leading-tight">
          {patient.name} {patient.last_name}
        </h3>
      </div>

      <div className="p-5 flex flex-col gap-4">
        <h4 className="text-[13px] font-bold text-gray-900 mb-1">Acerca</h4>

        <div className="flex items-center gap-3">
          <Gift className="w-[18px] h-[18px] text-blue-600" strokeWidth={2} />
          <div className="flex flex-col">
            <span className="text-[11px] text-gray-400 font-medium leading-tight">Edad</span>
            <span className="text-[13px] font-medium text-gray-800">
              {patient.birth_date
                ? `${new Date().getFullYear() - new Date(patient.birth_date).getFullYear()} años`
                : "—"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <CreditCard className="w-[18px] h-[18px] text-blue-600" strokeWidth={2} />
          <div className="flex flex-col">
            <span className="text-[11px] text-gray-400 font-medium leading-tight">DUI</span>
            <span className="text-[13px] font-medium text-gray-800">{patient.dui || "—"}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Phone className="w-[18px] h-[18px] text-blue-600" strokeWidth={2} />
          <div className="flex flex-col">
            <span className="text-[11px] text-gray-400 font-medium leading-tight">Teléfono</span>
            <span className="text-[13px] font-medium text-gray-800">{patient.phone || "—"}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Mail className="w-[18px] h-[18px] text-blue-600" strokeWidth={2} />
          <div className="flex flex-col overflow-hidden">
            <span className="text-[11px] text-gray-400 font-medium leading-tight">Email</span>
            <span className="text-[13px] font-medium text-gray-800 truncate max-w-[200px]">
              {patient.email || "—"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <UserPlus2 className="w-[18px] h-[18px] text-blue-600" strokeWidth={2} />
          <div className="flex flex-col">
            <span className="text-[11px] text-gray-400 font-medium leading-tight">Referido por</span>
            <span className="text-[13px] font-medium text-gray-800">{patient.referred_by || "—"}</span>
          </div>
        </div>

        <div className="mt-2 border border-blue-100 rounded-[20px] p-3 flex items-center justify-center gap-2">
          <span className={`w-2 h-2 rounded-full ${patient.is_active ? "bg-green-500" : "bg-red-500"}`} />
          <span className={`text-xs font-semibold ${patient.is_active ? "text-green-700" : "text-red-700"}`}>
            {patient.is_active ? "Activo" : "Inactivo"}
          </span>
        </div>
      </div>

      {/* Botones para editar o eliminar el paciente seleccionado en la tarjeta. */}
      {(canUpdate || canDelete) && (
        <div className="grid grid-cols-2 gap-2.5 p-5 pt-0">
          {canUpdate && (
            <button
              type="button"
              onClick={() => onEdit?.(patient)}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border border-blue-200 text-blue-600 text-xs font-semibold hover:bg-blue-50 transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Editar
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              onClick={() => onDelete?.(patient)}
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

export default PatientProfileCard;
