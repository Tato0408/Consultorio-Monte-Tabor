import React from "react";

const DoctorProfileCard = ({ doctor }) => {
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
      <div className="bg-blue-600 text-white p-6 flex flex-col items-center">
        <img
          src={doctor.img_url}
          alt={`${doctor.name} ${doctor.last_name}`}
          className="w-24 h-24 rounded-full bg-white object-cover"
        />

        <h3 className="font-semibold mt-3 text-center">
          {doctor.name} {doctor.last_name}
        </h3>
      </div>

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