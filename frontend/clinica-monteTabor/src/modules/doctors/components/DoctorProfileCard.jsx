import React from "react";
import { User } from "lucide-react";

const DoctorProfileCard = ({ doctor }) => {
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
      {/*Encabezado de tarjeta */}
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

      {/*Detalled*/}
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
          {/* Cambia  el color del texto dependiendo de si el doctor esta activo o inactivo */}
          <span
            className={
              doctor.is_active
                ? "text-green-600"
                : "text-red-600"
            }
          >
            {doctor.is_active
              ? "Activo"
              : "Inactivo"}
          </span>
        </div>
      </div>
    </div>
  );
};

export default DoctorProfileCard;