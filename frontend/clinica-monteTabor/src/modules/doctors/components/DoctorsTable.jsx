import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const DoctorsTable = ({
  doctors,
  loading,
  error,
  onSelectDoctor,
  onOpenForm,
  onEditDoctor,
  onDeleteDoctor,
}) => {
  if (loading) {
    return <p className="mt-5">Cargando doctores...</p>;
  }

  if (error) {
    return (
      <p className="mt-5 text-red-500">
        Error: {error}
      </p>
    );
  }

  return (
    <>
      <div className="flex justify-end mt-5 mb-4">
        <button
          onClick={onOpenForm}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition"
        >
          + Agregar Doctor
        </button>
      </div>

      <div className="rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Foto</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Apellido</TableHead>
              <TableHead>N° Licencia</TableHead>
              <TableHead>Correo</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {doctors.length > 0 ? (
              doctors.map((doctor) => (
                <TableRow
                  key={doctor._id}
                  className="cursor-pointer hover:bg-slate-50"
                  onClick={() => onSelectDoctor(doctor)}
                >
                  <TableCell>
                    <img
                      src={doctor.img_url}
                      alt={`${doctor.name} ${doctor.last_name}`}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  </TableCell>

                  <TableCell>{doctor.name}</TableCell>

                  <TableCell>{doctor.last_name}</TableCell>

                  <TableCell>
                    {doctor.license_number}
                  </TableCell>

                  <TableCell>{doctor.email}</TableCell>

                  <TableCell>{doctor.phone}</TableCell>

                  <TableCell>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        doctor.is_active
                          ? "bg-green-100 text-green-600"
                          : "bg-red-100 text-red-600"
                      }`}
                    >
                      {doctor.is_active
                        ? "Activo"
                        : "Inactivo"}
                    </span>
                  </TableCell>

                  <TableCell>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditDoctor(doctor);
                        }}
                        className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded-md text-sm"
                      >
                        Editar
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();

                          if (
                            window.confirm(
                              `¿Eliminar al doctor ${doctor.name}?`
                            )
                          ) {
                            onDeleteDoctor(
                              doctor._id
                            );
                          }
                        }}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm"
                      >
                        Eliminar
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center py-4"
                >
                  No hay doctores registrados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
};

export default DoctorsTable;