import React from "react";
import { User, Edit2, Trash2 } from "lucide-react";

const DoctorProfileCard = ({ doctor, onEdit, onDelete, canUpdate = true, canDelete = true }) => {
  //Evalua si no hay ningun doctor seleccionado y muestra un mensaje de aviso
  if (!doctor) {
    return (
      <div className="border rounded-xl p-6 shadow-sm bg-white">
        <p className="text-center text-slate-500">
          Seleccione un doctor para ver sus detalles
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-xl overflow-hidden shadow-sm bg-white">
      {/* Encabezado de tarjeta */}
      <div className="bg-blue-600 text-white p-6 flex flex-col items-center">
        <div className="w-24 h-24 rounded-full bg-white overflow-hidden flex items-center justify-center flex-shrink-0">
          {doctor.img_url ? (
            <img
              src={doctor.img_url}
              alt={`${doctor.name} ${doctor.last_name}`}
              className="w-full h-full object-cover"
              onError={(e) => { e.target.style.display = "none"; }}
            />
          ) : (
            <User className="w-10 h-10 text-blue-600" strokeWidth={1.5} />
          )}
        </div>

        <h3 className="font-semibold mt-3 text-center">
          {doctor.name} {doctor.last_name}
        </h3>
      </div>

      {/* Detalle */}
      <div className="p-5 space-y-4 text-sm">
        <div>
          <span className="font-semibold">
            Género:
          </span>{" "}
          {doctor.gender}
        </div>

        <div>
          <span className="font-semibold">
            Fecha de nacimiento:
          </span>{" "}
          {/* Convierte la fecha del string de la api y le da formato local */}
          {new Date(
            doctor.birth_date
          ).toLocaleDateString("es-SV")}
        </div>

        <div>
          <span className="font-semibold">
            DUI:
          </span>{" "}
          {doctor.dui}
        </div>

        <div>
          <span className="font-semibold">
            Teléfono:
          </span>{" "}
          {doctor.phone}
        </div>

        <div>
          <span className="font-semibold">
            Email:
          </span>{" "}
          {doctor.email}
        </div>

        <div>
          <span className="font-semibold">
            Licencia:
          </span>{" "}
          {doctor.license_number}
        </div>

        <div>
          <span className="font-semibold">
            Estado:
          </span>{" "}
          {/* Cambia el color del texto segun si el doctor esta activo o inactivo */}
          <span
            className={
              doctor.is_active !== false
                ? "text-green-600"
                : "text-red-600"
            }
          >
            {doctor.is_active !== false
              ? "Activo"
              : "Inactivo"}
          </span>
        </div>
      </div>

      {/* Botones para editar o eliminar el doctor seleccionado en la tarjeta. */}
      {(canUpdate || canDelete) && (
        <div className="grid grid-cols-2 gap-2.5 p-5 pt-0">
          {canUpdate && (
            <button
              type="button"
              onClick={() => onEdit?.(doctor)}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border border-blue-200 text-blue-600 text-xs font-semibold hover:bg-blue-50 transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Editar
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              onClick={() => onDelete?.(doctor._id)}
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

export default DoctorProfileCard;